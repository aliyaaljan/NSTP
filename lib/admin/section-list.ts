/**
 * Section List — shared contract for the admin section list page.
 *
 * Backend devs: implement data fetching in `getSectionListData()` inside
 * `lib/admin/section-list-actions.ts`. The UI reads `SectionListPageData` only.
 * Replace `filterSectionListRows()` with SQL filters when the list grows large.
 */

import { formatClassLabel } from "@/lib/shared/class-label"

export type SectionStatusCode = "active" | "completed" | "archived"

export interface SectionListRow {
  /** `section.section_id` */
  sectionId: string
  /** `section.term_id` */
  termId: string
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  name: string
  /** `section.course_code` */
  courseCode: string
  /** `section.adviser_user_id` */
  adviserUserId: string
  /** `app_user.full_name` via adviser join */
  adviserName: string
  /** `section.section_status_id` */
  sectionStatusId: string
  /** `section_status.code` */
  statusCode: SectionStatusCode
  /** `section_status.name` */
  statusLabel: string
  /** `section.required_hour_total` */
  requiredHourTotal: number
  /** `section.daily_cutoff_time` — HH:MM (24h) */
  dailyCutoffTime: string
  /** Active enrollments in this section */
  studentCount: number
  /** `section.created_at` */
  createdAt: string
}

export interface SectionListAdviserOption {
  /** `app_user.app_user_id` */
  adviserUserId: string
  fullName: string
  /** `app_user.is_active` — inactive advisers cannot be assigned to a class. */
  isActive: boolean
}

export interface SectionListStatusOption {
  /** `section_status.section_status_id` */
  sectionStatusId: string
  code: SectionStatusCode
  name: string
}

export type SectionListSortKey =
  | "name"
  | "course"
  | "adviser"
  | "students"
  | "status"

export type SectionListStatusFilter = SectionStatusCode | "all"

/** Sentinel for "all statuses" in filters / query strings. */
export const SECTION_LIST_ALL_STATUSES = "all"

/** Sentinel for "all advisers" in filters / query strings. */
export const SECTION_LIST_ALL_ADVISERS = "all"

/** Rows per page on the section list table. */
export const SECTION_LIST_PAGE_SIZE = 10

export interface SectionListQuery {
  status: SectionListStatusFilter
  /** `section.adviser_user_id`, or SECTION_LIST_ALL_ADVISERS for all. */
  adviserId: string
  search: string
  sort: SectionListSortKey
  dir: "asc" | "desc"
  /** 1-based page index. */
  page: number
}

export interface SectionListMeta {
  academicYear: string
  semester: string
  /** Active `term.term_id` — used when creating sections */
  activeTermId: string
}

export interface SectionListSummary {
  total: number
  active: number
  completed: number
  archived: number
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Payload returned by `getSectionListData()` — the only shape the UI needs. */
export interface SectionListPageData {
  sections: SectionListRow[]
  advisers: SectionListAdviserOption[]
  statuses: SectionListStatusOption[]
  summary: SectionListSummary
  meta: SectionListMeta
  currentUser: AdminCurrentUser
  query: SectionListQuery
}

/**
 * Supabase select for the admin section list.
 * Tables: section → app_user (adviser), section_status
 */
export const SECTION_LIST_SELECT = `
  section_id,
  term_id,
  course_code,
  required_hour_total,
  daily_cutoff_time,
  created_at,
  updated_at,
  adviser_user_id,
  section_status_id,
  adviser:adviser_user_id(app_user_id, full_name),
  section_status:section_status_id(section_status_id, code, name),
  term:term_id(school_year)
` as const

/** Raw row shape returned by `SECTION_LIST_SELECT`. */
export interface SectionListDbRow {
  section_id: string
  term_id: string
  course_code: string
  required_hour_total: number | null
  daily_cutoff_time: string | null
  created_at: string
  updated_at: string
  adviser_user_id: string
  section_status_id: string
  adviser: { app_user_id: string; full_name: string } | null
  section_status: {
    section_status_id: string
    code: string
    name: string
  } | null
  term: { school_year: string } | null
}

export const SECTION_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: SectionListStatusFilter
  label: string
}> = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

export const SECTION_STATUS_LABELS: Record<SectionStatusCode, string> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
}

export const SECTION_STATUS_BADGE: Record<
  SectionStatusCode,
  { bg: string; color: string }
> = {
  active: { bg: "#F0FDF4", color: "#1B4332" },
  completed: { bg: "rgba(123, 29, 29, 0.1)", color: "#7B1D1D" },
  archived: { bg: "#F3F4F6", color: "#9CA3AF" },
}

const VALID_SORT: SectionListSortKey[] = [
  "name",
  "course",
  "adviser",
  "students",
  "status",
]

const VALID_STATUS: SectionStatusCode[] = ["active", "completed", "archived"]

export function parseSectionListQuery(params: {
  status?: string
  adviserId?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
}): SectionListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const sort = VALID_SORT.includes(params.sort as SectionListSortKey)
    ? (params.sort as SectionListSortKey)
    : "name"
  const status =
    params.status && VALID_STATUS.includes(params.status as SectionStatusCode)
      ? (params.status as SectionStatusCode)
      : SECTION_LIST_ALL_STATUSES
  const adviserId = params.adviserId?.trim() || SECTION_LIST_ALL_ADVISERS

  return {
    status,
    adviserId,
    search: params.q ?? "",
    sort,
    dir: params.dir === "desc" ? "desc" : "asc",
    page: pageNum,
  }
}

/** Normalize Postgres `time` to HH:MM for form inputs. */
export function formatSectionCutoffTime(raw: string | null): string {
  if (!raw) return "23:59"
  const match = raw.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return raw
  return `${match[1].padStart(2, "0")}:${match[2]}`
}

/** Display cutoff time for the table (12-hour format). */
export function formatSectionCutoffDisplay(time24: string): string {
  const match = time24.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return time24
  const hours = parseInt(match[1], 10)
  const minutes = match[2]
  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes} ${period}`
}

export function mapSectionDbRowToListRow(
  row: SectionListDbRow,
  studentCount: number
): SectionListRow | null {
  const status = row.section_status
  if (!status) return null

  const statusCode = status.code as SectionStatusCode
  if (!VALID_STATUS.includes(statusCode)) return null

  return {
    sectionId: row.section_id,
    termId: row.term_id,
    name: formatClassLabel({
      courseCode: row.course_code,
      facilitatorName: row.adviser?.full_name,
      schoolYear: row.term?.school_year,
    }),
    courseCode: row.course_code,
    adviserUserId: row.adviser_user_id,
    adviserName: row.adviser?.full_name ?? "Unassigned",
    sectionStatusId: row.section_status_id,
    statusCode,
    statusLabel: status.name,
    requiredHourTotal: row.required_hour_total ?? 60,
    dailyCutoffTime: formatSectionCutoffTime(row.daily_cutoff_time),
    studentCount,
    createdAt: row.created_at,
  }
}

export function buildSectionListSummary(
  rows: SectionListRow[]
): SectionListSummary {
  const summary: SectionListSummary = {
    total: rows.length,
    active: 0,
    completed: 0,
    archived: 0,
  }

  for (const row of rows) {
    summary[row.statusCode] += 1
  }

  return summary
}

/**
 * Client/server-safe row filtering & sorting.
 * Backend can delete this and push equivalent logic into the SQL query.
 */

// FILTER
export function filterSectionListRows(
  rows: SectionListRow[],
  query: SectionListQuery
): SectionListRow[] {
  const q = query.search.trim().toLowerCase()

  let filtered = rows.filter((section) => {
    if (
      query.status !== SECTION_LIST_ALL_STATUSES &&
      section.statusCode !== query.status
    ) {
      return false
    }
    if (
      query.adviserId !== SECTION_LIST_ALL_ADVISERS &&
      section.adviserUserId !== query.adviserId
    ) {
      return false
    }
    if (!q) return true
    return (
      section.name.toLowerCase().includes(q) ||
      section.courseCode.toLowerCase().includes(q) ||
      section.adviserName.toLowerCase().includes(q)
    )
  })
  //SORT
  const factor = query.dir === "asc" ? 1 : -1
  filtered = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "course":
        return a.courseCode.localeCompare(b.courseCode) * factor
      case "adviser":
        return a.adviserName.localeCompare(b.adviserName) * factor
      case "students":
        return (a.studentCount - b.studentCount) * factor
      case "status":
        return a.statusLabel.localeCompare(b.statusLabel) * factor
      case "name":
      default:
        return a.name.localeCompare(b.name) * factor
    }
  })

  return filtered
}

export function paginateSectionListRows<T>(
  rows: T[],
  page: number,
  pageSize: number = SECTION_LIST_PAGE_SIZE
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
