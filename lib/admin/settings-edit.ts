/**
 * Settings edit contract for the admin settings page.
 *
 * Backend devs: implement mutations in `lib/admin/settings-actions.ts`.
 * The UI submits these payload shapes only.
 */

import type {
  AcademicConfig,
  GpsSite,
  HolidayRow,
  TermSemesterCode,
} from "@/lib/admin/settings"

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

/** Payload for creating a GPS geofence site. Maps to `section_geofence`. */
export interface GpsSiteCreatePayload {
  /** `section_geofence.label` */
  siteName: string
  /** `section_geofence.section_id` */
  sectionId: string
  /** `section_geofence.radius_meter` */
  radiusMeters: number
  /** `section_geofence.center_latitude` */
  centerLatitude: number
  /** `section_geofence.center_longitude` */
  centerLongitude: number
}

/** Payload for updating an existing GPS geofence. */
export interface GpsSiteUpdatePayload {
  /** `section_geofence.section_geofence_id` */
  geofenceId: string
  /** `section_geofence.section_id` — supervisor is derived from this section's adviser */
  sectionId: string
  /** `section_geofence.label` */
  siteName: string
  /** `section_geofence.radius_meter` */
  radiusMeters: number
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

export function gpsSiteToUpdatePayload(
  site: GpsSite,
  sectionId?: string
): GpsSiteUpdatePayload {
  return {
    geofenceId: site.geofenceId,
    sectionId: sectionId ?? site.sectionId,
    siteName: site.siteName,
    radiusMeters: site.radiusMeters,
  }
}

export function emptyGpsSiteCreatePayload(): GpsSiteCreatePayload {
  return {
    siteName: "",
    sectionId: "",
    radiusMeters: 200,
    centerLatitude: 16.4111,
    centerLongitude: 120.5966,
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

export function validateGpsSiteCreatePayload(
  payload: GpsSiteCreatePayload
): string | null {
  if (!payload.siteName.trim()) return "Site name is required."
  if (!payload.sectionId.trim()) return "Section is required."
  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 1) {
    return "Radius must be at least 1 meter."
  }
  if (!Number.isFinite(payload.centerLatitude)) return "Latitude is required."
  if (!Number.isFinite(payload.centerLongitude)) return "Longitude is required."
  return null
}

export function validateGpsSiteUpdatePayload(
  payload: GpsSiteUpdatePayload
): string | null {
  if (!payload.geofenceId.trim()) return "Site ID is required."
  if (!payload.sectionId.trim()) return "Section is required."
  if (!payload.siteName.trim()) return "Site name is required."
  if (!Number.isFinite(payload.radiusMeters) || payload.radiusMeters < 1) {
    return "Radius must be at least 1 meter."
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
