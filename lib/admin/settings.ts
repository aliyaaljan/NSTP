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
 * Holidays → suggested new table `holiday`:
 *   holiday_id           → HolidayRow.holidayId
 *   term_id              → HolidayRow.termId (FK to active term)
 *   name                 → HolidayRow.name
 *   holiday_date         → HolidayRow.date  (ISO date YYYY-MM-DD)
 *   description          → HolidayRow.description
 *
 * GPS sites are managed on the Site List page — see `lib/admin/site-list.ts`.
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

export interface SettingsPageData {
  academic: AcademicConfig
  schoolYearOptions: SchoolYearOption[]
  semesterOptions: SemesterOption[]
  holidays: HolidayRow[]
  meta: SettingsMeta
  currentUser: AdminCurrentUser
}

/** Active-enrollment close-out counts for the term(s) being switched away from. */
export interface TermCloseoutSummary {
  total: number
  meetHours: number
  belowHours: number
}

/** Rows per page for holidays list. */
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
