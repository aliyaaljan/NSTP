"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import {
  ACCESS_CONTROL_USER_SELECT,
  buildAccessControlSummary,
  buildSampleAccessControlRows,
  mapAccessControlDbRow,
  type AccessControlDbRow,
  type AccessControlMeta,
  type AccessControlPageData,
  type AccessControlQuery,
  type AccessControlRoleOption,
  type AdminCurrentUser,
  type AppRoleCode,
} from "@/lib/admin/access-control"
import {
  validateAccessUserCreatePayload,
  validateAccessUserEditPayload,
  validateUpdateUserRolePayload,
  type AccessUserCreatePayload,
  type AccessUserEditPayload,
  type CreateAccessUserResult,
  type DeactivateAccessUserResult,
  type UpdateAccessUserResult,
  type UpdateUserRolePayload,
  type UpdateUserRoleResult,
} from "@/lib/admin/access-control-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { userOwnsActiveTermSection } from "@/lib/admin/facilitator-pool"
import {
  countActiveAdmins,
  deactivateUser,
  provisionUser,
  resolveRoleIdByCode,
  syncAuthBan,
  syncUserEmail,
} from "@/lib/admin/user-provision"

/**
 * Fetches everything the admin access control page needs.
 *
 * Backend checklist:
 * 1. Keep returning `AccessControlPageData` — no UI changes required.
 * 2. Move `filterAccessControlRows()` logic into SQL when the list grows large.
 * 3. Add server-side search (`ilike` on full_name, email, student_number) when needed.
 * 4. Replace hardcoded `meta` with a `term` table lookup.
 * 5. Remove `buildSampleAccessControlRows()` merge once production data exists.
 */
export async function getAccessControlData(
  query: AccessControlQuery
): Promise<AccessControlPageData> {
  const supabase = await createSupabaseServerClient()

  const [usersRes, rolesRes, activeTermRes, { data: authData }] = await Promise.all([
    supabase
      .from("app_user")
      .select(ACCESS_CONTROL_USER_SELECT)
      .order("full_name", { ascending: true }),
    supabase.from("role").select("role_id, code, name").order("name"),
    supabase.from("term").select("term_id").eq("is_active", true).maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (usersRes.error) {
    console.error("[getAccessControlData] app_user query failed", usersRes.error)
  }
  if (rolesRes.error) {
    console.error("[getAccessControlData] role query failed", rolesRes.error)
  }

  const roles: AccessControlRoleOption[] =
    rolesRes.data
      ?.filter((role): role is { role_id: string; code: AppRoleCode; name: string } =>
        ["admin", "adviser", "student"].includes(role.code)
      )
      .map((role) => ({
        roleId: role.role_id,
        code: role.code as AppRoleCode,
        name: role.name,
      })) ?? []

  let facilitatorOwnerIds = new Set<string>()
  if (activeTermRes.data?.term_id) {
    const { data: ownerRows } = await supabase
      .from("section")
      .select("adviser_user_id")
      .eq("term_id", activeTermRes.data.term_id)
    facilitatorOwnerIds = new Set((ownerRows ?? []).map((r) => r.adviser_user_id as string))
  }

  const dbUsers =
    (usersRes.data as AccessControlDbRow[] | null)
      ?.map((row) => mapAccessControlDbRow(row, facilitatorOwnerIds.has(row.app_user_id)))
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const users =
    dbUsers.length > 0 ? dbUsers : buildSampleAccessControlRows(roles)

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: AccessControlMeta = {
    // TODO(backend): read from `term` where is_active = true
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }

  return {
    users,
    roles,
    summary: buildAccessControlSummary(users),
    meta,
    currentUser,
    query,
  }
}

async function resolveCurrentUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId?: string
): Promise<AdminCurrentUser> {
  if (!userId) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, avatar_url, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: isAdmin ? "Admin Test Account" : appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
    avatarUrl: (appUser as any).avatar_url ?? undefined,
  }
}

/**
 * Update a user's role from the edit user modal.
 *
 * Updates `app_user.role_id` and writes a `role_change` audit row. The new role
 * takes effect on the user's next JWT refresh (≤1h) via custom_access_token_hook,
 * or immediately on their next login — there is no way to force it sooner while
 * their current token lives. Refuses to demote the last active administrator.
 */
export async function updateUserRole(
  payload: UpdateUserRolePayload
): Promise<UpdateUserRoleResult> {
  const supabase = await createSupabaseServerClient()
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateUpdateUserRolePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser()
  if (!actingUser) {
    return { ok: false, error: "Unauthorized" }
  }

  const service = createSupabaseServiceClient()

  // Current role of the target user → old_role_id for the audit row.
  const { data: target, error: targetError } = await service
    .from("app_user")
    .select("role_id, role:role_id(code)")
    .eq("app_user_id", payload.appUserId)
    .maybeSingle()

  if (targetError || !target) {
    console.error("[updateUserRole] target lookup failed", targetError)
    return { ok: false, error: "User not found." }
  }

  const oldRoleId = target.role_id
  const oldRoleCode = (target.role as { code?: string } | null)?.code ?? null

  const newRoleId = await resolveRoleIdByCode(service, payload.roleCode as AppRoleCode)
  if (!newRoleId) {
    return { ok: false, error: "Invalid role selected." }
  }

  // No-op — nothing to change or audit.
  if (newRoleId === oldRoleId) {
    return { ok: true }
  }

  // Never leave the system without an administrator.
  if (oldRoleCode === "admin" && payload.roleCode !== "admin") {
    const activeAdmins = await countActiveAdmins(service)
    if (activeAdmins <= 1) {
      return { ok: false, error: "Cannot demote the last active administrator." }
    }
  }

  // A class must not be stranded under a student account.
  if (payload.roleCode === "student") {
    const ownsClass = await userOwnsActiveTermSection(service, payload.appUserId)
    if (ownsClass) {
      return {
        ok: false,
        error:
          "This user still facilitates a class this term. Reassign their class on the Classes page first.",
      }
    }
  }

  const { error: updateError } = await service
    .from("app_user")
    .update({ role_id: newRoleId })
    .eq("app_user_id", payload.appUserId)

  if (updateError) {
    console.error("[updateUserRole] role update failed", updateError)
    return { ok: false, error: "Failed to update the user's role." }
  }

  // Audit the change. Best-effort: the role update above is the user-visible
  // action and already succeeded, so a failed insert must not roll it back.
  const { error: auditError } = await service.from("role_change").insert({
    target_user_id: payload.appUserId,
    changed_by_user_id: actingUser.id,
    old_role_id: oldRoleId,
    new_role_id: newRoleId,
  })

  if (auditError) {
    console.error("[updateUserRole] role_change insert failed", auditError)
  }

  return { ok: true }
}

/**
 * Update a user's profile fields from the edit modal.
 *
 * Updates profile fields and `is_active`. Role is intentionally NOT changed here
 * — role edits go through `updateUserRole()` (the Edit modal calls it separately)
 * so the last-admin guard and `role_change` audit always apply. Also unbans /
 * re-bans the auth user so ban state tracks `is_active`.
 */
export async function updateAccessUser(
  payload: AccessUserEditPayload
): Promise<UpdateAccessUserResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateAccessUserEditPayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()

  // Read current state to detect email changes and enforce the last-admin guard.
  const { data: current, error: currentError } = await service
    .from("app_user")
    .select("email, is_active, role:role_id(code)")
    .eq("app_user_id", payload.appUserId)
    .maybeSingle()

  if (currentError || !current) {
    console.error("[updateAccessUser] target lookup failed", currentError)
    return { ok: false, error: "User not found." }
  }

  const currentRoleCode = (current.role as { code?: string } | null)?.code ?? null
  const nextEmail = payload.email.trim().toLowerCase()
  const emailChanged = nextEmail !== (current.email ?? "").toLowerCase()

  // Deactivating an admin via the edit form must not remove the last one.
  if (currentRoleCode === "admin" && current.is_active && !payload.isActive) {
    const activeAdmins = await countActiveAdmins(service)
    if (activeAdmins <= 1) {
      return { ok: false, error: "Cannot deactivate the last active administrator." }
    }
  }

  // Keep auth.users email in lockstep so OAuth linking (by email) stays valid for
  // users who have not logged in yet. Auth is the stricter gate — do it first.
  if (emailChanged) {
    const emailResult = await syncUserEmail(service, payload.appUserId, nextEmail)
    if (!emailResult.ok) return emailResult
  }

  const { error: updateError } = await service
    .from("app_user")
    .update({
      full_name: payload.fullName.trim(),
      email: nextEmail,
      student_number: payload.studentNumber?.trim() || null,
      sais_id: payload.saisId?.trim() || null,
      is_active: payload.isActive,
    })
    .eq("app_user_id", payload.appUserId)

  if (updateError) {
    console.error("[updateAccessUser] update failed", updateError)
    if ((updateError as { code?: string }).code === "23505") {
      return { ok: false, error: "That email is already in use." }
    }
    return { ok: false, error: "Failed to update the user." }
  }

  // Ban state tracks is_active (deactivate ⇒ ban, reactivate ⇒ unban).
  const banResult = await syncAuthBan(service, payload.appUserId, payload.isActive)
  if (!banResult.ok) {
    return banResult
  }

  return { ok: true }
}

/**
 * Create a new user account from the add user modal.
 *
 * Pre-creates the `auth.users` row (so `app_user_id == auth.users.id`) and the
 * matching `app_user` row. Creating the auth user now means Google OAuth links to
 * it by email on first login and `ensureAppUser()` finds the existing row — rather
 * than minting a new id and colliding with the `app_user` unique-email constraint.
 */
export async function createAccessUser(
  payload: AccessUserCreatePayload
): Promise<CreateAccessUserResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateAccessUserCreatePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()
  const result = await provisionUser(service, {
    email: payload.email,
    fullName: payload.fullName,
    roleCode: payload.roleCode,
    studentNumber: payload.studentNumber,
    saisId: payload.saisId,
    isActive: payload.isActive,
  })
  if (!result.ok) return result
  return { ok: true }
}

/**
 * Deactivate a user account (soft delete).
 *
 * Soft-delete: sets `app_user.is_active = false` and bans the auth user so they
 * cannot log back in (their current token expires within ≤1h). Never hard-deletes
 * — enrollment and audit history depend on the row. Refuses to deactivate the last
 * active administrator. Reactivation is done via the Edit modal (`updateAccessUser`).
 */
export async function deactivateAccessUser(
  appUserId: string
): Promise<DeactivateAccessUserResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  if (!appUserId.trim()) {
    return { ok: false, error: "User ID is required." }
  }

  const service = createSupabaseServiceClient()
  return deactivateUser(service, appUserId)
}
