/**
 * Access Control edit contract for the admin access control page.
 *
 * Backend devs: implement `updateAccessUser()` in `lib/admin/access-control-actions.ts`.
 * The UI submits `AccessUserEditPayload` only — no other shape is required.
 *
 * Database mapping:
 *   appUserId      → `app_user.app_user_id`
 *   fullName       → `app_user.full_name`
 *   email          → `app_user.email` (must satisfy @up.edu.ph check constraint)
 *   studentNumber  → `app_user.student_number`
 *   saisId         → `app_user.sais_id`
 *   isActive       → `app_user.is_active`
 */

import type { AccessControlRow, AppRoleCode } from "@/lib/admin/access-control"

export interface AccessUserEditPayload {
  /** `app_user.app_user_id` */
  appUserId: string
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.student_number` */
  studentNumber: string | null
  /** `app_user.sais_id` */
  saisId: string | null
  /** `app_user.is_active` */
  isActive: boolean
  /** `role.role_id` */
  roleId: string
  /** `role.code` */
  roleCode: AppRoleCode
}

export type UpdateAccessUserResult =
  | { ok: true }
  | { ok: false; error: string }

export type UpdateUserRoleResult = UpdateAccessUserResult

export type DeactivateAccessUserResult = UpdateAccessUserResult

/** Build the edit form payload from a list row. */
export function accessUserRowToEditPayload(row: AccessControlRow): AccessUserEditPayload {
  return {
    appUserId: row.appUserId,
    fullName: row.fullName,
    email: row.email,
    studentNumber: row.studentNumber,
    saisId: row.saisId,
    isActive: row.isActive,
    roleId: row.roleId,
    roleCode: row.roleCode,
  }
}

/** Shared client/server validation before calling `updateAccessUser()`. */
export function validateAccessUserEditPayload(
  payload: AccessUserEditPayload
): string | null {
  if (!payload.appUserId.trim()) {
    return "User ID is required."
  }
  if (!payload.fullName.trim()) {
    return "Full name is required."
  }
  if (!payload.email.trim()) {
    return "Email is required."
  }
  if (!payload.email.trim().toLowerCase().endsWith("@up.edu.ph")) {
    return "Email must be a valid UP address (@up.edu.ph)."
  }
  if (!payload.roleId.trim()) {
    return "Role is required."
  }
  if (!["admin", "adviser", "student"].includes(payload.roleCode)) {
    return "Invalid role selected."
  }
  return null
}

export interface UpdateUserRolePayload {
  /** `app_user.app_user_id` */
  appUserId: string
  /** `role.role_id` */
  roleId: string
  /** `role.code` — used for client-side validation only */
  roleCode: string
}

export function validateUpdateUserRolePayload(
  payload: UpdateUserRolePayload
): string | null {
  if (!payload.appUserId.trim()) {
    return "User ID is required."
  }
  if (!payload.roleId.trim()) {
    return "Role is required."
  }
  if (!["admin", "adviser", "student"].includes(payload.roleCode)) {
    return "Invalid role selected."
  }
  return null
}
