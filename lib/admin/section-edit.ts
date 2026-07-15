/**
 * Class create/edit contract for the admin classes page.
 *
 * One class per facilitator per NSTP type per term. A class is identified by
 * its facilitator and course type (CWTS / LTS / ROTC), not a name. Creating
 * one just picks a facilitator who must not already have that type this term;
 * the DB enforces it via `uq_section_adviser_term_nstp_type`.
 *
 * Database mapping:
 * sectionId           → `section.section_id` (edit only)
 * courseCode          → `section.course_code`
 * adviserUserId       → `section.adviser_user_id`
 * statusCode          → `section_status.code` → `section.section_status_id`
 * requiredHourTotal   → `section.required_hour_total`
 * daily_cutoff_time   → `section.daily_cutoff_time` (HH:MM)
 * termId              → `section.term_id` (create only — active term)
 */

import type {
  SectionListRow,
  SectionStatusCode,
} from "@/lib/admin/section-list"

/**
 * Allowed NSTP course options for section create/edit. `ensureFacilitatorClass`
 * (lib/admin/class-provision.ts) derives "NSTP 1 …" for first-semester terms
 * and "NSTP 2 …" for second-semester terms from the facilitator's component —
 * both levels must be selectable here or the edit form blanks the course.
 */
export const SECTION_COURSE_OPTIONS = [
  "NSTP 1 CWTS",
  "NSTP 1 LTS",
  "NSTP 1 ROTC",
  "NSTP 2 CWTS",
  "NSTP 2 LTS",
  "NSTP 2 ROTC",
] as const

export type SectionCourseCode = (typeof SECTION_COURSE_OPTIONS)[number]

export interface SectionCreatePayload {
  /** `section.course_code` — one of {@link SECTION_COURSE_OPTIONS} */
  courseCode: string
  /** `section.adviser_user_id` */
  adviserUserId: string
  /** `section_status.code` */
  statusCode: SectionStatusCode
  /** `section.required_hour_total` */
  requiredHourTotal: number
  /** `section.daily_cutoff_time` — HH:MM (24h) */
  dailyCutoffTime: string
}

export interface SectionEditPayload extends SectionCreatePayload {
  /** `section.section_id` */
  sectionId: string
}

export type SectionMutationResult = { ok: true } | { ok: false; error: string }

export function emptySectionCreatePayload(): SectionCreatePayload {
  return {
    courseCode: "",
    adviserUserId: "",
    statusCode: "active",
    requiredHourTotal: 60,
    dailyCutoffTime: "23:59",
  }
}

export function sectionRowToEditPayload(
  row: SectionListRow
): SectionEditPayload {
  return {
    sectionId: row.sectionId,
    courseCode: row.courseCode,
    adviserUserId: row.adviserUserId,
    statusCode: row.statusCode,
    requiredHourTotal: row.requiredHourTotal,
    dailyCutoffTime: row.dailyCutoffTime,
  }
}

export type SectionFieldKey =
  | "courseCode"
  | "adviserUserId"
  | "requiredHourTotal"
  | "dailyCutoffTime"

export type SectionFieldErrors = Partial<Record<SectionFieldKey, string>>

export function collectSectionFieldErrors(
  payload: SectionCreatePayload
): SectionFieldErrors {
  const errors: SectionFieldErrors = {}
  if (!payload.courseCode.trim()) {
    errors.courseCode = "Please select a course."
  } else if (
    !SECTION_COURSE_OPTIONS.includes(payload.courseCode as SectionCourseCode)
  ) {
    errors.courseCode = "Please select a valid course."
  }
  if (!payload.adviserUserId.trim()) {
    errors.adviserUserId = "Please select a facilitator."
  }
  if (payload.requiredHourTotal < 1 || payload.requiredHourTotal > 999) {
    errors.requiredHourTotal = "Required hours must be between 1 and 999."
  }
  if (!/^\d{2}:\d{2}$/.test(payload.dailyCutoffTime)) {
    errors.dailyCutoffTime = "Please enter a valid daily cutoff time."
  }
  return errors
}

export function validateSectionCreatePayload(
  payload: SectionCreatePayload
): string | null {
  const errors = collectSectionFieldErrors(payload)
  return (
    errors.courseCode ??
    errors.adviserUserId ??
    errors.requiredHourTotal ??
    errors.dailyCutoffTime ??
    null
  )
}

export function validateSectionEditPayload(
  payload: SectionEditPayload
): string | null {
  if (!payload.sectionId.trim()) {
    return "Section ID is required."
  }
  return validateSectionCreatePayload(payload)
}
