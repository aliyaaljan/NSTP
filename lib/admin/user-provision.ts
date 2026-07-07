/**
 * Shared user provisioning for admin flows (access control, student/facilitator
 * CRUD, CSV/XLSX imports). Server-only utility — NOT a "use server" file, so
 * none of these are callable from the client without an action's auth guard.
 */
import "server-only"
import type { AppRoleCode } from "@/lib/admin/access-control"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

export type ServiceClient = ReturnType<typeof createSupabaseServiceClient>

/** ~100 years. Banning blocks login + token refresh (invariant: ban ⇔ !is_active). */
const BAN_DURATION = "876000h"

/**
 * Resolve the canonical `role.role_id` from a role code. Server actions receive
 * arbitrary input, so never trust a client-supplied `roleId` — look it up here.
 */
export async function resolveRoleIdByCode(
  service: ServiceClient,
  roleCode: AppRoleCode
): Promise<string | null> {
  const { data } = await service
    .from("role")
    .select("role_id")
    .eq("code", roleCode)
    .maybeSingle()
  return data?.role_id ?? null
}

/** Count active administrators — used to block removing the last one. */
export async function countActiveAdmins(service: ServiceClient): Promise<number> {
  const adminRoleId = await resolveRoleIdByCode(service, "admin")
  if (!adminRoleId) return 0

  const { count } = await service
    .from("app_user")
    .select("app_user_id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("role_id", adminRoleId)

  return count ?? 0
}

/**
 * Keep the Supabase Auth ban state in lockstep with `app_user.is_active`.
 * A banned user cannot log in or refresh their token; an already-issued access
 * token still lives until it expires (≤1h). Idempotent.
 */
export async function syncAuthBan(
  service: ServiceClient,
  userId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : BAN_DURATION,
  })
  if (error) {
    console.error("[syncAuthBan] updateUserById failed", error)
    return { ok: false, error: "Failed to update the account's sign-in status." }
  }
  return { ok: true }
}

/**
 * Keep auth.users email in lockstep with app_user.email so OAuth linking
 * (by email) stays valid for users who have not logged in yet.
 */
export async function syncUserEmail(
  service: ServiceClient,
  userId: string,
  newEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await service.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true,
  })
  if (error) {
    console.error("[syncUserEmail] auth email sync failed", error)
    return { ok: false, error: "That email is already in use or invalid." }
  }
  return { ok: true }
}

export interface ProvisionUserInput {
  email: string
  fullName: string
  roleCode: AppRoleCode
  studentNumber?: string | null
  saisId?: string | null
  isActive?: boolean
}

/**
 * Create a brand-new account: pre-creates the `auth.users` row (so
 * `app_user_id == auth.users.id` and Google OAuth links by email on first
 * login) plus the matching `app_user` row. Fails when the email already
 * exists — callers decide how to handle existing users.
 */
export async function provisionUser(
  service: ServiceClient,
  input: ProvisionUserInput
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const roleId = await resolveRoleIdByCode(service, input.roleCode)
  if (!roleId) {
    return { ok: false, error: "Invalid role selected." }
  }

  const email = input.email.trim().toLowerCase()
  const isActive = input.isActive ?? true

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim() },
  })

  if (createError || !created?.user) {
    console.error("[provisionUser] auth createUser failed", createError)
    if (
      createError?.status === 422 ||
      createError?.message?.toLowerCase().includes("already")
    ) {
      return { ok: false, error: "A user with this email already exists." }
    }
    return { ok: false, error: "Failed to create the user account." }
  }

  const userId = created.user.id

  const { error: insertError } = await service.from("app_user").insert({
    app_user_id: userId,
    role_id: roleId,
    email,
    full_name: input.fullName.trim(),
    student_number: input.studentNumber?.trim() || null,
    sais_id: input.saisId?.trim() || null,
    is_active: isActive,
  })

  if (insertError) {
    console.error("[provisionUser] app_user insert failed", insertError)
    // Avoid an orphaned auth user with no app_user row.
    await service.auth.admin.deleteUser(userId)
    if ((insertError as { code?: string }).code === "23505") {
      return { ok: false, error: "A user with this email or ID already exists." }
    }
    return { ok: false, error: "Failed to create the user." }
  }

  // Provisioned as inactive ⇒ ban immediately so they cannot log in yet.
  if (!isActive) {
    const banResult = await syncAuthBan(service, userId, false)
    if (!banResult.ok) return banResult
  }

  return { ok: true, userId }
}

/**
 * Soft-delete: `is_active = false` + auth ban + revoke login sessions.
 * Never hard-deletes — enrollment and audit history depend on the row.
 * Refuses to deactivate the last active administrator.
 */
export async function deactivateUser(
  service: ServiceClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: target, error: targetError } = await service
    .from("app_user")
    .select("is_active, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (targetError || !target) {
    console.error("[deactivateUser] target lookup failed", targetError)
    return { ok: false, error: "User not found." }
  }

  if (!target.is_active) {
    return { ok: true }
  }

  const targetRoleCode = (target.role as { code?: string } | null)?.code ?? null
  if (targetRoleCode === "admin") {
    const activeAdmins = await countActiveAdmins(service)
    if (activeAdmins <= 1) {
      return { ok: false, error: "Cannot deactivate the last active administrator." }
    }
  }

  const { error: updateError } = await service
    .from("app_user")
    .update({ is_active: false })
    .eq("app_user_id", userId)

  if (updateError) {
    console.error("[deactivateUser] update failed", updateError)
    return { ok: false, error: "Failed to deactivate the user." }
  }

  const banResult = await syncAuthBan(service, userId, false)
  if (!banResult.ok) return banResult

  // Reflect the logout in the Active Sessions view (best-effort).
  const { error: sessionError } = await service
    .from("login_session")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("app_user_id", userId)
    .eq("is_active", true)

  if (sessionError) {
    console.error("[deactivateUser] login_session revoke failed", sessionError)
  }

  return { ok: true }
}

/** Look up an app_user (with role) by email. Returns null when absent. */
export async function findAppUserByEmail(
  service: ServiceClient,
  email: string
): Promise<{
  appUserId: string
  roleId: string
  roleCode: string | null
  fullName: string
  studentNumber: string | null
  saisId: string | null
} | null> {
  const { data } = await service
    .from("app_user")
    .select("app_user_id, role_id, full_name, student_number, sais_id, role:role_id(code)")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()

  if (!data) return null
  return {
    appUserId: data.app_user_id,
    roleId: data.role_id,
    roleCode: (data.role as { code?: string } | null)?.code ?? null,
    fullName: data.full_name,
    studentNumber: data.student_number,
    saisId: data.sais_id,
  }
}
