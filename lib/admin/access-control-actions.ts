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

  const [usersRes, rolesRes, { data: authData }] = await Promise.all([
    supabase
      .from("app_user")
      .select(ACCESS_CONTROL_USER_SELECT)
      .order("full_name", { ascending: true }),
    supabase.from("role").select("role_id, code, name").order("name"),
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

  const dbUsers =
    (usersRes.data as AccessControlDbRow[] | null)
      ?.map(mapAccessControlDbRow)
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
    .select("full_name, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: isAdmin ? "Admin Test Account" : appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
  }
}

/**
 * Update a user's role from the edit user modal.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Read current `app_user.role_id` for the target user.
 * 3. Prevent demoting the last active admin account.
 * 4. Update `app_user` SET role_id = :roleId WHERE app_user_id = :appUserId.
 * 5. Insert into `role_change` (target_user_id, changed_by_user_id, old_role_id, new_role_id).
 * 6. User must re-login (or refresh JWT) for `user_role` claim to update — auth hook handles this on next token refresh.
 */
export async function updateUserRole(
  payload: UpdateUserRolePayload
): Promise<UpdateUserRoleResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateUpdateUserRolePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  // TODO(backend): implement role update + role_change audit row.
  console.info("[updateUserRole] pending implementation", {
    appUserId: payload.appUserId,
    roleId: payload.roleId,
    roleCode: payload.roleCode,
  })

  return {
    ok: false,
    error:
      "Role update is not available yet. Backend handler still needs to be implemented.",
  }
}

/**
 * Update a user's profile fields from the edit modal.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Update `app_user` SET full_name, email, student_number, sais_id, is_active
 *    WHERE app_user_id = :appUserId.
 * 3. If email changes, sync `auth.users` email via Supabase Admin API if needed.
 * 4. Return `{ ok: true }` on success.
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

  // TODO(backend): implement app_user profile update.
  console.info("[updateAccessUser] pending implementation", {
    appUserId: payload.appUserId,
    email: payload.email,
    isActive: payload.isActive,
  })

  return {
    ok: false,
    error:
      "Edit is not available yet. Backend handler still needs to be implemented.",
  }
}

/**
 * Create a new user account from the add user modal.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Create `auth.users` row via Supabase Admin API (or invite flow).
 * 3. Insert into `app_user` with full_name, email, student_number, sais_id, role_id, is_active.
 * 4. Return `{ ok: true }` on success.
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

  // TODO(backend): implement user creation.
  console.info("[createAccessUser] pending implementation", {
    email: payload.email,
    roleCode: payload.roleCode,
  })

  return {
    ok: false,
    error:
      "Add is not available yet. Backend handler still needs to be implemented.",
  }
}

/**
 * Deactivate a user account (soft delete).
 *
 * Backend checklist:
 * 1. Set `app_user.is_active` = false for the target user.
 * 2. Prevent deactivating the last active admin.
 * 3. Optionally revoke Supabase auth sessions via Admin API.
 * 4. Do not hard-delete — enrollment and audit history depend on the row.
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

  // TODO(backend): implement soft deactivation.
  console.info("[deactivateAccessUser] pending implementation", { appUserId })

  return {
    ok: false,
    error:
      "Deactivate is not available yet. Backend handler still needs to be implemented.",
  }
}
