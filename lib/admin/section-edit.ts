/**
 * Section create/edit contract for the admin section list page.
 *
 * Backend devs: implement `createSection()`, `updateSection()`, and
 * `deleteSection()` in `lib/admin/section-list-actions.ts`.
 * The UI submits these payloads only.
 *
 * Database mapping:
 *   sectionId           → `section.section_id` (edit only)
 *   name                → `section.name`
 *   courseCode          → `section.course_code`
 *   adviserUserId       → `section.adviser_user_id`
 *   statusCode          → `section_status.code` → `section.section_status_id`
 *   requiredHourTotal   → `section.required_hour_total`
 *   dailyCutoffTime     → `section.daily_cutoff_time` (HH:MM)
 *   termId              → `section.term_id` (create only — active term)
 */

import type { SectionListRow, SectionStatusCode } from "@/lib/admin/section-list"

/** Allowed NSTP course options for section create/edit. */
export const SECTION_COURSE_OPTIONS = [
  "NSTP 2 CWTS",
  "NSTP 2 LTS",
  "NSTP 2 ROTC",
] as const

export type SectionCourseCode = (typeof SECTION_COURSE_OPTIONS)[number]

export interface SectionCreatePayload {
  /** `section.name` — e.g. "A", "B" */
  name: string
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
    name: "",
    courseCode: "",
    adviserUserId: "",
    statusCode: "active",
    requiredHourTotal: 60,
    dailyCutoffTime: "23:59",
  }
}

export function sectionRowToEditPayload(row: SectionListRow): SectionEditPayload {
  return {
    sectionId: row.sectionId,
    name: row.name,
    courseCode: row.courseCode,
    adviserUserId: row.adviserUserId,
    statusCode: row.statusCode,
    requiredHourTotal: row.requiredHourTotal,
    dailyCutoffTime: row.dailyCutoffTime,
  }
}

export function validateSectionCreatePayload(payload: SectionCreatePayload): string | null {
  if (!payload.name.trim()) {
    return "Section name is required."
  }
  if (!payload.courseCode.trim()) {
    return "Course is required."
  }
  if (!SECTION_COURSE_OPTIONS.includes(payload.courseCode as SectionCourseCode)) {
    return "Please select a valid course."
  }
  if (!payload.adviserUserId.trim()) {
    return "An adviser must be assigned."
  }
  if (payload.requiredHourTotal < 1 || payload.requiredHourTotal > 999) {
    return "Required hours must be between 1 and 999."
  }
  if (!/^\d{2}:\d{2}$/.test(payload.dailyCutoffTime)) {
    return "Daily cutoff time must use HH:MM format."
  }
  return null
}

export function validateSectionEditPayload(payload: SectionEditPayload): string | null {
  if (!payload.sectionId.trim()) {
    return "Section ID is required."
  }
  return validateSectionCreatePayload(payload)
}
