/**
 * Adviser List — shared contract for the admin adviser list page.
 *
 * Backend devs: implement data fetching in `getAdviserListData()` inside
 * `lib/admin/adviser-list-actions.ts`. The UI reads `AdviserListPageData` only.
 * Replace `filterAdviserListRows()` / `paginateAdviserListRows()` with SQL when ready.
 */

import { completionPct } from "@/lib/admin/student-progress"

export interface AdviserListRow {
  /** `app_user.app_user_id` */
  adviserUserId: string
  fullName: string
  email: string
  /** Derived from `fullName` for avatar display. */
  initials: string
  /** `section.section_id` values for sections this adviser facilitates. */
  sectionIds: string[]
  /** `section.name` values for sections this adviser facilitates. */
  sectionNames: string[]
  /** Active enrollments across all facilitated sections. */
  studentCount: number
  /** Mean completion % across active students (0–100). */
  avgCompletionPct: number
  /** Open + under-review appeals assigned to this adviser. */
  pendingRequestCount: number
  isActive: boolean
}

export interface AdviserListSectionOption {
  /** `section.section_id` */
  sectionId: string
  name: string
}

export const ADVISER_LIST_ALL_SECTIONS = "all"

/** Cards per page — 4 columns × 2 rows. */
export const ADVISER_LIST_PAGE_SIZE = 8

export interface AdviserListQuery {
  /** `section.section_id`, or ADVISER_LIST_ALL_SECTIONS for all. */
  sectionId: string
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
  is_active,
  section:section_adviser_user_id_fkey(
    section_id,
    name,
    required_hour_total,
    enrollment(
      enrollment_id,
      enrollment_status_id,
      attendance_session(duration_minute)
    )
  )
` as const

/** Raw row shape returned by `ADVISER_LIST_SELECT`. */
export interface AdviserListDbRow {
  app_user_id: string
  full_name: string
  email: string
  is_active: boolean
  section:
    | Array<{
        section_id: string
        name: string
        required_hour_total: number | null
        enrollment: Array<{
          enrollment_id: string
          enrollment_status_id: string
          attendance_session: Array<{ duration_minute: number | null }> | null
        }> | null
      }>
    | null
}

/** Raw row for pending-appeal aggregation. */
export interface AdviserPendingAppealDbRow {
  appeal_id: string
  assigned_adviser_user_id: string | null
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
  const sortedSections = [...sections].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const sectionIds = sortedSections.map((s) => s.section_id)
  const sectionNames = sortedSections.map((s) => s.name)

  let studentCount = 0
  let completionSum = 0

  for (const section of sections) {
    const hoursRequired = section.required_hour_total ?? 60
    const enrollments =
      section.enrollment?.filter((e) => e.enrollment_status_id === activeStatusId) ?? []

    for (const enrollment of enrollments) {
      studentCount += 1
      const minutes =
        enrollment.attendance_session?.reduce(
          (sum, session) => sum + (session.duration_minute ?? 0),
          0
        ) ?? 0
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
    sectionIds,
    sectionNames,
    studentCount,
    avgCompletionPct,
    pendingRequestCount: pendingCount,
    isActive: row.is_active,
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
    const adviserId =
      row.assigned_adviser_user_id ??
      row.enrollment?.section?.adviser_user_id ??
      null
    if (!adviserId) continue
    counts.set(adviserId, (counts.get(adviserId) ?? 0) + 1)
  }

  return counts
}

export function parseAdviserListQuery(params: {
  sectionId?: string
  q?: string
  page?: string
}): AdviserListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  return {
    sectionId: params.sectionId ?? ADVISER_LIST_ALL_SECTIONS,
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
  if (!q) return rows

  return rows.filter(
    (adviser) =>
      adviser.fullName.toLowerCase().includes(q) ||
      adviser.email.toLowerCase().includes(q) ||
      adviser.sectionNames.some((s) => s.toLowerCase().includes(q))
  )
}

/** Filter advisers by section name (client-side helper when sectionId is known). */
export function filterAdviserListRowsBySection(
  rows: AdviserListRow[],
  query: AdviserListQuery,
  sections: AdviserListSectionOption[]
): AdviserListRow[] {
  const searchFiltered = filterAdviserListRows(rows, query)

  if (query.sectionId === ADVISER_LIST_ALL_SECTIONS) return searchFiltered

  const sectionName = sections.find((s) => s.sectionId === query.sectionId)?.name
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
