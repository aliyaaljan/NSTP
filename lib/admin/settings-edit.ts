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

export type HolidayFieldKey = "name" | "date"

export type HolidayFieldErrors = Partial<Record<HolidayFieldKey, string>>

export function collectHolidayFieldErrors(
  payload: HolidayCreatePayload
): HolidayFieldErrors {
  const errors: HolidayFieldErrors = {}
  if (!payload.name.trim()) {
    errors.name = "Holiday name is required."
  }
  if (!payload.date.trim()) {
    errors.date = "Holiday date is required."
  } else if (!isValidIsoDate(payload.date)) {
    errors.date = "Holiday date must be YYYY-MM-DD."
  }
  return errors
}

export function validateHolidayCreatePayload(
  payload: HolidayCreatePayload
): string | null {
  if (!payload.termId.trim()) return "Term ID is required."
  const errors = collectHolidayFieldErrors(payload)
  return errors.name ?? errors.date ?? null
}

export function validateHolidayDelete(holiday: HolidayRow): string | null {
  if (holiday.isSample) {
    return "Sample holidays cannot be deleted until the holiday table is connected."
  }
  return null
}

export type AcademicYearCreatePayload = {
  schoolYear: string
  semester: string
  startDate: string
  endDate: string
}

export function emptyAcademicYearCreatePayload(): AcademicYearCreatePayload {
  return {
    schoolYear: "",
    semester: "first",
    startDate: "",
    endDate: "",
  }
}

export type AcademicYearFieldKey = "schoolYear" | "semester" | "startDate" | "endDate"

export type AcademicYearFieldErrors = Partial<Record<AcademicYearFieldKey, string>>

export function collectAcademicYearFieldErrors(
  form: AcademicYearCreatePayload
): AcademicYearFieldErrors {
  const errors: AcademicYearFieldErrors = {}
  if (!form.schoolYear.trim()) {
    errors.schoolYear = "School year is required."
  }
  if (!form.semester.trim()) {
    errors.semester = "Semester is required."
  }
  if (!form.startDate) {
    errors.startDate = "Start date is required."
  }
  if (!form.endDate) {
    errors.endDate = "End date is required."
  } else if (form.startDate && form.endDate < form.startDate) {
    errors.endDate = "End date must be after start date."
  }
  return errors
}

export function validateAcademicYearCreatePayload(
  form: AcademicYearCreatePayload
): string | null {
  const errors = collectAcademicYearFieldErrors(form)
  return (
    errors.schoolYear ??
    errors.semester ??
    errors.startDate ??
    errors.endDate ??
    null
  )
}