/**
 * Settings — shared contract for the admin settings page.
 *
 * Backend devs: implement data fetching in `getSettingsData()` and mutations in
 * `lib/admin/settings-actions.ts`. The UI reads `SettingsPageData` only.
 *
 * Database mapping:
 *
 * Academic configuration → `term` (active row where is_active = true)
 *   term_id              → AcademicConfig.termId
 *   school_year          → AcademicConfig.schoolYear
 *   semester             → AcademicConfig.semester  ('first' | 'second' | 'midyear')
 *   start_date           → AcademicConfig.schoolYearStartDate  (ISO date YYYY-MM-DD)
 *   end_date             → AcademicConfig.schoolYearEndDate
 *   required_hour_total  → AcademicConfig.requiredNstpHours (suggested: `system_settings` or section default)
 *
 * GPS sites → `section_geofence` joined with `section` → `app_user` (adviser)
 *   section_geofence_id  → GpsSite.geofenceId
 *   label                → GpsSite.siteName
 *   radius_meter         → GpsSite.radiusMeters
 *   center_latitude      → GpsSite.centerLatitude
 *   center_longitude     → GpsSite.centerLongitude
 *   section_id           → GpsSite.sectionId
 *   section.name         → GpsSite.sectionName
 *   adviser.full_name    → GpsSite.supervisorName
 *
 * Holidays → suggested new table `holiday`:
 *   holiday_id           → HolidayRow.holidayId
 *   term_id              → HolidayRow.termId (FK to active term)
 *   name                 → HolidayRow.name
 *   holiday_date         → HolidayRow.date  (ISO date YYYY-MM-DD)
 *   description          → HolidayRow.description
 */

export type TermSemesterCode = "first" | "second" | "midyear"

export interface AcademicConfig {
  /** `term.term_id` for the active academic period */
  termId: string
  /** `term.school_year` e.g. "2025-2026" */
  schoolYear: string
  /** `term.semester` */
  semester: TermSemesterCode
  /** `term.start_date` — ISO date (YYYY-MM-DD) */
  schoolYearStartDate: string
  /** `term.end_date` — ISO date (YYYY-MM-DD) */
  schoolYearEndDate: string
  /**
   * Default NSTP render hours for new sections.
   * TODO(backend): persist in `system_settings` or update section defaults.
   */
  requiredNstpHours: number
}

export interface SchoolYearOption {
  /** `term.term_id` */
  termId: string
  /** Display label e.g. "2025-2026 — 1st Semester" */
  label: string
  schoolYear: string
  semester: TermSemesterCode
  isActive: boolean
}

export interface SemesterOption {
  value: TermSemesterCode
  label: string
}

export interface GpsSite {
  /** `section_geofence.section_geofence_id` */
  geofenceId: string
  /** `section_geofence.label` */
  siteName: string
  /** `section_geofence.radius_meter` */
  radiusMeters: number
  /** `section_geofence.center_latitude` */
  centerLatitude: number
  /** `section_geofence.center_longitude` */
  centerLongitude: number
  /** `section.section_id` */
  sectionId: string
  /** `section.name` */
  sectionName: string
  /** `app_user.full_name` via section.adviser_user_id */
  supervisorName: string
  /** `section_geofence.is_active` */
  isActive: boolean
  /** Preview row — not persisted */
  isSample?: boolean
}

export interface HolidayRow {
  /** `holiday.holiday_id` */
  holidayId: string
  /** `holiday.term_id` */
  termId: string
  /** `holiday.name` */
  name: string
  /** `holiday.holiday_date` — ISO date (YYYY-MM-DD) */
  date: string
  /** `holiday.description` */
  description: string | null
  /** Preview row — not persisted */
  isSample?: boolean
}

export interface SettingsMeta {
  academicYear: string
  semester: string
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

export interface GpsSectionOption {
  /** `section.section_id` */
  sectionId: string
  /** Display label e.g. "CWTS — CWTS-2526A" */
  label: string
  /** `app_user.full_name` via `section.adviser_user_id` */
  supervisorName: string
}

export interface SettingsPageData {
  academic: AcademicConfig
  schoolYearOptions: SchoolYearOption[]
  semesterOptions: SemesterOption[]
  gpsSites: GpsSite[]
  gpsSections: GpsSectionOption[]
  holidays: HolidayRow[]
  meta: SettingsMeta
  currentUser: AdminCurrentUser
}

/** Rows per page for GPS sites and holidays lists. */
export const SETTINGS_LIST_PAGE_SIZE = 5

export const SEMESTER_OPTIONS: SemesterOption[] = [
  { value: "first", label: "1st Semester" },
  { value: "second", label: "2nd Semester" },
  { value: "midyear", label: "Midyear" },
]

export const SEMESTER_LABELS: Record<TermSemesterCode, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

/** Supabase select for geofence list with section + adviser. */
export const GPS_SITE_SELECT = `
  section_geofence_id,
  label,
  center_latitude,
  center_longitude,
  radius_meter,
  is_active,
  section:section_id(
    section_id,
    name,
    adviser:adviser_user_id(full_name)
  )
` as const

export interface GpsSiteDbRow {
  section_geofence_id: string
  label: string | null
  center_latitude: number
  center_longitude: number
  radius_meter: number
  is_active: boolean
  section: {
    section_id: string
    name: string
    adviser: { full_name: string } | null
  } | null
}

export interface TermDbRow {
  term_id: string
  name: string
  school_year: string
  semester: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export function formatSchoolYearOption(term: {
  term_id: string
  school_year: string
  semester: string
  is_active: boolean
}): SchoolYearOption {
  const sem = isTermSemesterCode(term.semester) ? term.semester : "first"
  return {
    termId: term.term_id,
    label: `${term.school_year} — ${SEMESTER_LABELS[sem]}`,
    schoolYear: term.school_year,
    semester: sem,
    isActive: term.is_active,
  }
}

function isTermSemesterCode(value: string): value is TermSemesterCode {
  return value === "first" || value === "second" || value === "midyear"
}

export function mapGpsSiteDbRow(row: GpsSiteDbRow): GpsSite | null {
  const section = row.section
  if (!section) return null

  return {
    geofenceId: row.section_geofence_id,
    siteName: row.label?.trim() || section.name,
    radiusMeters: row.radius_meter,
    centerLatitude: Number(row.center_latitude),
    centerLongitude: Number(row.center_longitude),
    sectionId: section.section_id,
    sectionName: section.name,
    supervisorName: section.adviser?.full_name ?? "Unassigned",
    isActive: row.is_active,
  }
}

export function mapTermToAcademicConfig(
  term: TermDbRow,
  requiredNstpHours: number = 60
): AcademicConfig {
  const semester = isTermSemesterCode(term.semester) ? term.semester : "first"
  return {
    termId: term.term_id,
    schoolYear: term.school_year,
    semester,
    schoolYearStartDate: term.start_date ?? "",
    schoolYearEndDate: term.end_date ?? "",
    requiredNstpHours,
  }
}

export function buildSampleGpsSections(): GpsSectionOption[] {
  return [
    {
      sectionId: "sample-section-001",
      label: "CWTS — CWTS-2526A",
      supervisorName: "Ana Reyes",
    },
    {
      sectionId: "sample-section-002",
      label: "CWTS — CWTS-2526B",
      supervisorName: "Ben Santos",
    },
    {
      sectionId: "sample-section-003",
      label: "ROTC — ROTC-2526A",
      supervisorName: "Clara Lim",
    },
  ]
}

export function buildSampleGpsSites(): GpsSite[] {
  return [
    {
      geofenceId: "sample-geofence-001",
      siteName: "Baguio City — Main Campus",
      radiusMeters: 300,
      centerLatitude: 16.4111,
      centerLongitude: 120.5966,
      sectionId: "sample-section-001",
      sectionName: "CWTS-2526A",
      supervisorName: "Ana Reyes",
      isActive: true,
      isSample: true,
    },
    {
      geofenceId: "sample-geofence-002",
      siteName: "Baguio City — Social Hall",
      radiusMeters: 200,
      centerLatitude: 16.4108,
      centerLongitude: 120.5962,
      sectionId: "sample-section-002",
      sectionName: "CWTS-2526B",
      supervisorName: "Ben Santos",
      isActive: true,
      isSample: true,
    },
    {
      geofenceId: "sample-geofence-003",
      siteName: "Baguio City — Gymnasium",
      radiusMeters: 250,
      centerLatitude: 16.412,
      centerLongitude: 120.597,
      sectionId: "sample-section-003",
      sectionName: "ROTC-2526A",
      supervisorName: "Clara Lim",
      isActive: true,
      isSample: true,
    },
  ]
}

export function buildSampleHolidays(termId: string): HolidayRow[] {
  return [
    {
      holidayId: "sample-holiday-001",
      termId,
      name: "National Heroes Day",
      date: "2025-08-25",
      description: "Regular holiday",
      isSample: true,
    },
    {
      holidayId: "sample-holiday-002",
      termId,
      name: "All Saints' Day",
      date: "2025-11-01",
      description: "Regular holiday",
      isSample: true,
    },
    {
      holidayId: "sample-holiday-003",
      termId,
      name: "Christmas Day",
      date: "2025-12-25",
      description: "Regular holiday",
      isSample: true,
    },
    {
      holidayId: "sample-holiday-004",
      termId,
      name: "University Foundation Day",
      date: "2025-10-15",
      description: "UP Baguio institutional holiday",
      isSample: true,
    },
  ]
}

export function paginateSettingsList<T>(
  rows: T[],
  page: number,
  pageSize: number = SETTINGS_LIST_PAGE_SIZE
): { rows: T[]; totalPages: number; totalCount: number } {
  const totalCount = rows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    rows: rows.slice(start, start + pageSize),
    totalPages,
    totalCount,
  }
}
