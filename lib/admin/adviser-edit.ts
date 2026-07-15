/**
 * Adviser edit contract for the admin adviser list page.
 *
 * Backend devs: implement `updateAdviser()` in `lib/admin/adviser-list-actions.ts`.
 * The UI submits `AdviserEditPayload` only — no other shape is required.
 *
 * Database mapping:
 *   adviserUserId    → `app_user.app_user_id` (lookup key)
 *   fullName         → `app_user.full_name`
 *   email            → `app_user.email` (must satisfy @up.edu.ph check constraint)
 *   isActive         → `app_user.is_active`
 *   collegeId        → `app_user.college_id`
 *   nstpComponentId  → `app_user.nstp_component_id` — drives the facilitator's
 *                       auto-provisioned class course_code (CWTS/LTS/ROTC)
 *   partnershipType  → `app_user.partnership_type`
 *
 * Section assignment is managed on the Section List page (`section.adviser_user_id`).
 */

import type { AdviserListRow } from "@/lib/admin/adviser-list"
import {
  validateFullName,
  validateUpEmail,
} from "@/lib/admin/user-field-validation"

export interface AdviserEditPayload {
  /** `app_user.app_user_id` */
  adviserUserId: string
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.is_active` */
  isActive: boolean
  /** `app_user.college_id` */
  collegeId: string | null
  /** `app_user.nstp_component_id` */
  nstpComponentId: string | null
  /** `app_user.partnership_type` */
  partnershipType: string | null
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
  /** `app_user.college_id` */
  collegeId: string | null
  /** `app_user.nstp_component_id` */
  nstpComponentId: string | null
  /** `app_user.partnership_type` */
  partnershipType: string | null
}

export type CreateAdviserResult = UpdateAdviserResult

export function emptyAdviserCreatePayload(): AdviserCreatePayload {
  return {
    fullName: "",
    email: "",
    isActive: true,
    collegeId: null,
    nstpComponentId: null,
    partnershipType: null,
  }
}

/** Build the edit form payload from a list row. */
export function adviserRowToEditPayload(row: AdviserListRow): AdviserEditPayload {
  return {
    adviserUserId: row.adviserUserId,
    fullName: row.fullName,
    email: row.email,
    isActive: row.isActive,
    collegeId: row.collegeId,
    nstpComponentId: row.nstpComponentId,
    partnershipType: row.partnershipType,
  }
}

/** Shared client/server validation before calling `updateAdviser()`. */
export function validateAdviserEditPayload(
  payload: AdviserEditPayload
): string | null {
  if (!payload.adviserUserId.trim()) {
    return "Adviser user ID is required."
  }
  return validateFullName(payload.fullName) ?? validateUpEmail(payload.email)
}

/** Shared client/server validation before calling `createAdviser()`. */
export function validateAdviserCreatePayload(
  payload: AdviserCreatePayload
): string | null {
  return validateFullName(payload.fullName) ?? validateUpEmail(payload.email)
}
