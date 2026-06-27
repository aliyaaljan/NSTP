/**
 * Adviser edit contract for the admin adviser list page.
 *
 * Backend devs: implement `updateAdviser()` in `lib/admin/adviser-list-actions.ts`.
 * The UI submits `AdviserEditPayload` only — no other shape is required.
 *
 * Database mapping:
 *   adviserUserId → `app_user.app_user_id` (lookup key)
 *   fullName      → `app_user.full_name`
 *   email         → `app_user.email` (must satisfy @up.edu.ph check constraint)
 *   isActive      → `app_user.is_active`
 *
 * Section assignment is managed on the Section List page (`section.adviser_user_id`).
 */

import type { AdviserListRow } from "@/lib/admin/adviser-list"

export interface AdviserEditPayload {
  /** `app_user.app_user_id` */
  adviserUserId: string
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.is_active` */
  isActive: boolean
}

export type UpdateAdviserResult =
  | { ok: true }
  | { ok: false; error: string }

export interface AdviserCreatePayload {
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.is_active` */
  isActive: boolean
}

export type CreateAdviserResult = UpdateAdviserResult

export function emptyAdviserCreatePayload(): AdviserCreatePayload {
  return {
    fullName: "",
    email: "",
    isActive: true,
  }
}

/** Build the edit form payload from a list row. */
export function adviserRowToEditPayload(row: AdviserListRow): AdviserEditPayload {
  return {
    adviserUserId: row.adviserUserId,
    fullName: row.fullName,
    email: row.email,
    isActive: row.isActive,
  }
}

/** Shared client/server validation before calling `updateAdviser()`. */
export function validateAdviserEditPayload(
  payload: AdviserEditPayload
): string | null {
  if (!payload.adviserUserId.trim()) {
    return "Adviser user ID is required."
  }
  if (!payload.fullName.trim()) {
    return "Full name is required."
  }
  if (!payload.email.trim()) {
    return "Email is required."
  }
  if (!payload.email.trim().toLowerCase().endsWith("@up.edu.ph")) {
    return "Email must be a UP email (@up.edu.ph)."
  }
  return null
}

/** Shared client/server validation before calling `createAdviser()`. */
export function validateAdviserCreatePayload(
  payload: AdviserCreatePayload
): string | null {
  if (!payload.fullName.trim()) {
    return "Full name is required."
  }
  if (!payload.email.trim()) {
    return "Email is required."
  }
  if (!payload.email.trim().toLowerCase().endsWith("@up.edu.ph")) {
    return "Email must be a UP email (@up.edu.ph)."
  }
  return null
}
