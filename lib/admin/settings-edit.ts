/**
 * Settings edit contract for the admin settings page.
 *
 * Backend devs: implement mutations in `lib/admin/settings-actions.ts`.
 * The UI submits these payload shapes only.
 *
 * GPS site payloads live in `lib/admin/site-edit.ts` (Site List page).
 */

import type { AcademicConfig, HolidayRow, TermSemesterCode } from "@/lib/admin/settings"

/** Payload for saving academic configuration. Maps to `term` + optional `system_settings`. */
export interface AcademicConfigPayload {
  /** `term.term_id` */
  termId: string
  /** `term.school_year` */
  schoolYear: string
  /** `term.semester` */
  semester: TermSemesterCode
  /** `term.start_date` — ISO date YYYY-MM-DD */
  schoolYearStartDate: string
  /** `term.end_date` — ISO date YYYY-MM-DD */
  schoolYearEndDate: string
  /** Default NSTP hours — suggest `system_settings.key = 'default_nstp_hours'` */
  requiredNstpHours: number
}

/** Payload for creating a holiday. Maps to suggested `holiday` table. */
export interface HolidayCreatePayload {
  /** `holiday.term_id` — active term */
  termId: string
  /** `holiday.name` */
  name: string
  /** `holiday.holiday_date` — ISO date YYYY-MM-DD */
  date: string
  /** `holiday.description` */
  description: string | null
}

export type SettingsMutationResult =
  | { ok: true }
  | { ok: false; error: string }

export function academicConfigToPayload(config: AcademicConfig): AcademicConfigPayload {
  return {
    termId: config.termId,
    schoolYear: config.schoolYear,
    semester: config.semester,
    schoolYearStartDate: config.schoolYearStartDate,
    schoolYearEndDate: config.schoolYearEndDate,
    requiredNstpHours: config.requiredNstpHours,
  }
}

export function emptyHolidayCreatePayload(termId: string): HolidayCreatePayload {
  return {
    termId,
    name: "",
    date: "",
    description: null,
  }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return !Number.isNaN(parsed.getTime())
}

export function validateAcademicConfigPayload(
  payload: AcademicConfigPayload
): string | null {
  if (!payload.termId.trim()) return "Term ID is required."
  if (!payload.schoolYear.trim()) return "School year is required."
  if (!payload.semester) return "Semester is required."
  if (!payload.schoolYearStartDate.trim()) return "School year start date is required."
  if (!isValidIsoDate(payload.schoolYearStartDate)) {
    return "School year start date must be YYYY-MM-DD."
  }
  if (!payload.schoolYearEndDate.trim()) return "School year end date is required."
  if (!isValidIsoDate(payload.schoolYearEndDate)) {
    return "School year end date must be YYYY-MM-DD."
  }
  if (payload.schoolYearEndDate < payload.schoolYearStartDate) {
    return "End date must be on or after the start date."
  }
  if (!Number.isFinite(payload.requiredNstpHours) || payload.requiredNstpHours < 1) {
    return "Required NSTP hours must be at least 1."
  }
  return null
}

export function validateHolidayCreatePayload(
  payload: HolidayCreatePayload
): string | null {
  if (!payload.termId.trim()) return "Term ID is required."
  if (!payload.name.trim()) return "Holiday name is required."
  if (!payload.date.trim()) return "Holiday date is required."
  if (!isValidIsoDate(payload.date)) return "Holiday date must be YYYY-MM-DD."
  return null
}

export function validateHolidayDelete(holiday: HolidayRow): string | null {
  if (holiday.isSample) {
    return "Sample holidays cannot be deleted until the holiday table is connected."
  }
  return null
}
