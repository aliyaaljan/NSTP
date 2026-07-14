/**
 * Adviser List — shared contract for the admin adviser list page.
 *
 * Backend devs: implement data fetching in `getAdviserListData()` inside
 * `lib/admin/adviser-list-actions.ts`. The UI reads `AdviserListPageData` only.
 * Replace `filterAdviserListRows()` / `paginateAdviserListRows()` with SQL when ready.
 */

import { completionPct } from "@/lib/admin/student-progress"
import { formatClassLabel } from "@/lib/shared/class-label"

export interface AdviserListRow {
  /** `app_user.app_user_id` */
  adviserUserId: string
  fullName: string
  email: string
  /** Derived from `fullName` for avatar display. */
  initials: string
  /** Public URL for adviser photo when backend storage is wired. */
  photoUrl: string | null
  /** `section.section_id` — at most one per (adviser, term). */
  sectionIds: string[]
  /** Derived class label(s) — at most one per (adviser, term); sections have no name. */
  sectionNames: string[]
  /** Active enrollments across all facilitated sections. */
  studentCount: number
  /** Mean completion % across active students (0–100). */
  avgCompletionPct: number
  /** Open + under-review appeals assigned to this adviser. */
  pendingRequestCount: number
  isActive: boolean
  /** `app_user.college_id` */
  collegeId: string | null
  /** `college.name` via `college_id` */
  collegeName: string | null
  /** `app_user.nstp_component_id` — drives the facilitator's class course_code. */
  nstpComponentId: string | null
  /** `nstp_component.name` via `nstp_component_id` */
  nstpComponentName: string | null
  /** `app_user.partnership_type` */
  partnershipType: string | null
}

/** One row of a lookup table (`college` / `nstp_component`), shaped for a <select>. */
export interface AdviserLookupOption {
  /** The lookup table's PK UUID — submitted as the FK value. */
  id: string
  label: string
}

/** Dropdown options for the facilitator profile fields on Add/Edit Facilitator. */
export interface AdviserProfileLookups {
  colleges: AdviserLookupOption[]
  components: AdviserLookupOption[]
}

export interface AdviserListSectionOption {
  /** `section.section_id` */
  sectionId: string
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  label: string
  /** `section.course_code` */
  courseCode: string
  /** `section.adviser_user_id` */
  adviserUserId: string
  /** `app_user.full_name` via section.adviser_user_id */
  adviserName: string
  /** `term.school_year` via section.term_id */
  schoolYear: string | null
}

export const ADVISER_LIST_ALL_SECTIONS = "all"

/** Cards per page — 4 columns × 2 rows. */
export const ADVISER_LIST_PAGE_SIZE = 8

export type AdviserListStatusFilter = "all" | "active" | "inactive" | "pending"

export interface AdviserListQuery {
  /** `section.section_id`, or ADVISER_LIST_ALL_SECTIONS for all. */
  sectionId: string
  status: AdviserListStatusFilter
  search: string
  /** 1-based page index. */
  page: number
}

export interface AdviserListMeta {
  academicYear: string
  semester: string
}

export interface AdviserListSummary {
  total: number
  active: number
  inactive: number
  studentsSupervised: number
  pendingRequests: number
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Payload returned by `getAdviserListData()` — the only shape the UI needs. */
export interface AdviserListPageData {
  advisers: AdviserListRow[]
  sections: AdviserListSectionOption[]
  lookups: AdviserProfileLookups
  summary: AdviserListSummary
  meta: AdviserListMeta
  currentUser: AdminCurrentUser
  query: AdviserListQuery
}

/**
 * Supabase select used for the adviser list.
 * Tables: app_user → section → enrollment → attendance_session
 */
export const ADVISER_LIST_SELECT = `
  app_user_id,
  full_name,
  email,
  avatar_url,
  is_active,
  college_id,
  college:college_id(name),
  nstp_component_id,
  nstp_component:nstp_component_id(name),
  partnership_type,
  section:section_adviser_user_id_fkey(
    section_id,
    course_code,
    required_hour_total,
    term:term_id(school_year),
    enrollment(
      enrollment_id,
      enrollment_status_id,
      attendance_session(duration_minute, attendance_session_status(code))
    )
  )
` as const

/** Raw row shape returned by `ADVISER_LIST_SELECT`. */
export interface AdviserListDbRow {
  app_user_id: string
  full_name: string
  email: string
  avatar_url: string | null
  is_active: boolean
  college_id: string | null
  college: { name: string } | null
  nstp_component_id: string | null
  nstp_component: { name: string } | null
  partnership_type: string | null
  section:
    | Array<{
        section_id: string
        course_code: string
        required_hour_total: number | null
        term: { school_year: string } | null
        enrollment: Array<{
          enrollment_id: string
          enrollment_status_id: string
          attendance_session: Array<{
            duration_minute: number | null
            attendance_session_status: { code: string } | { code: string }[] | null
          }> | null
        }> | null
      }>
    | null
}

/** Raw row for pending-appeal aggregation. */
export interface AdviserPendingAppealDbRow {
  appeal_id: string
  enrollment: {
    section: { adviser_user_id: string } | null
  } | null
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? "?").toUpperCase()
}

export function mapAdviserDbRowToListRow(
  row: AdviserListDbRow,
  activeStatusId: string,
  pendingCount: number
): AdviserListRow {
  const sections = row.section ?? []
  const classLabel = formatClassLabel({
    // At most one class per (adviser, term); course_code is uniform across it.
    courseCode: sections[0]?.course_code,
    facilitatorName: row.full_name,
    schoolYear: sections[0]?.term?.school_year,
  })
  const sortedSections = [...sections]
  const sectionIds = sortedSections.map((s) => s.section_id)
  const sectionNames = sortedSections.map(() => classLabel)

  let studentCount = 0
  let completionSum = 0

  for (const section of sections) {
    const hoursRequired = section.required_hour_total ?? 60
    const enrollments =
      section.enrollment?.filter((e) => e.enrollment_status_id === activeStatusId) ?? []

    for (const enrollment of enrollments) {
      studentCount += 1
      // Count completed sessions only: 'closed' (normal/manual) + 'corrected' (edited).
      const minutes =
        enrollment.attendance_session?.reduce((sum, session) => {
          const st = Array.isArray(session.attendance_session_status)
            ? session.attendance_session_status[0]
            : session.attendance_session_status
          return st?.code === "closed" || st?.code === "corrected"
            ? sum + (session.duration_minute ?? 0)
            : sum
        }, 0) ?? 0
      const hoursCompleted = Math.round(minutes / 60)
      completionSum += completionPct(hoursCompleted, hoursRequired)
    }
  }

  const avgCompletionPct =
    studentCount > 0 ? Math.round(completionSum / studentCount) : 0

  return {
    adviserUserId: row.app_user_id,
    fullName: row.full_name ?? "Unknown",
    email: row.email ?? "",
    initials: initialsFromName(row.full_name ?? "?"),
    photoUrl: row.avatar_url ?? null,
    sectionIds,
    sectionNames,
    studentCount,
    avgCompletionPct,
    pendingRequestCount: pendingCount,
    isActive: row.is_active,
    collegeId: row.college_id,
    collegeName: row.college?.name ?? null,
    nstpComponentId: row.nstp_component_id,
    nstpComponentName: row.nstp_component?.name ?? null,
    partnershipType: row.partnership_type,
  }
}

export function buildAdviserListSummary(rows: AdviserListRow[]): AdviserListSummary {
  const summary: AdviserListSummary = {
    total: rows.length,
    active: 0,
    inactive: 0,
    studentsSupervised: 0,
    pendingRequests: 0,
  }

  for (const row of rows) {
    if (row.isActive) summary.active += 1
    else summary.inactive += 1
    summary.studentsSupervised += row.studentCount
    summary.pendingRequests += row.pendingRequestCount
  }

  return summary
}

export function buildPendingAppealCounts(
  rows: AdviserPendingAppealDbRow[]
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const row of rows) {
    // The section adviser is the authoritative owner of a request.
    const adviserId = row.enrollment?.section?.adviser_user_id ?? null
    if (!adviserId) continue
    counts.set(adviserId, (counts.get(adviserId) ?? 0) + 1)
  }

  return counts
}

const VALID_ADVISER_STATUS: AdviserListStatusFilter[] = [
  "all",
  "active",
  "inactive",
  "pending",
]

export function parseAdviserListQuery(params: {
  sectionId?: string
  status?: string
  q?: string
  page?: string
}): AdviserListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  return {
    sectionId: params.sectionId ?? ADVISER_LIST_ALL_SECTIONS,
    status: VALID_ADVISER_STATUS.includes(params.status as AdviserListStatusFilter)
      ? (params.status as AdviserListStatusFilter)
      : "all",
    search: params.q ?? "",
    page: pageNum,
  }
}

/**
 * Client/server-safe row filtering.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterAdviserListRows(
  rows: AdviserListRow[],
  query: AdviserListQuery
): AdviserListRow[] {
  const q = query.search.trim().toLowerCase()

  return rows.filter((adviser) => {
    if (query.status === "active" && !adviser.isActive) return false
    if (query.status === "inactive" && adviser.isActive) return false
    if (query.status === "pending" && adviser.pendingRequestCount === 0) return false
    if (!q) return true
    return (
      adviser.fullName.toLowerCase().includes(q) ||
      adviser.email.toLowerCase().includes(q) ||
      adviser.sectionNames.some((s) => s.toLowerCase().includes(q))
    )
  })
}

/** Filter advisers by section name (client-side helper when sectionId is known). */
export function filterAdviserListRowsBySection(
  rows: AdviserListRow[],
  query: AdviserListQuery,
  sections: AdviserListSectionOption[]
): AdviserListRow[] {
  const searchFiltered = filterAdviserListRows(rows, query)

  if (query.sectionId === ADVISER_LIST_ALL_SECTIONS) return searchFiltered

  const sectionName = sections.find((s) => s.sectionId === query.sectionId)?.label
  if (!sectionName) return searchFiltered

  return searchFiltered.filter((adviser) =>
    adviser.sectionNames.includes(sectionName)
  )
}

export function paginateAdviserListRows<T>(
  rows: T[],
  page: number,
  pageSize: number = ADVISER_LIST_PAGE_SIZE
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
