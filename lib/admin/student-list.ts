/**
 * Student List — shared contract for the admin student list page.
 *
 * Backend devs: implement data fetching in `getStudentListData()` inside
 * `lib/admin/student-list-actions.ts`. The UI reads `StudentListPageData` only.
 * Replace `filterStudentListRows()` with SQL filters when ready.
 */

import {
  completionPct,
  progressStatusFromPct,
  type StudentProgressStatus,
} from "@/lib/admin/student-progress"
import { formatClassLabel } from "@/lib/shared/class-label"

export interface StudentListRow {
  /** `enrollment.enrollment_id` */
  enrollmentId: string
  /** `enrollment.student_user_id` → `app_user.app_user_id` */
  studentUserId: string
  /** `enrollment.section_id` → `section.section_id` */
  sectionId: string
  /** `section.adviser_user_id` */
  adviserUserId: string | null
  fullName: string
  email: string
  studentNumber: string | null
  /** `app_user.sais_id` */
  saisId: string | null
  /** `enrollment.program_id` */
  programId: string | null
  /** `enrollment.student_classification_id` */
  studentClassificationId: string | null
  /** `enrollment.enlistment_status_id` */
  enlistmentStatusId: string | null
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  classLabel: string
  adviserName: string
  hoursCompleted: number
  hoursRequired: number
  completionPct: number
  progressStatus: StudentProgressStatus
  avatarUrl: string | null
}

export interface StudentListSectionOption {
  /** `section.section_id` */
  sectionId: string
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  label: string
}

/** One row of a lookup table (`program` / `student_classification` / `enlistment_status`), shaped for a <select>. */
export interface StudentLookupOption {
  /** The lookup table's PK UUID — submitted as the FK value. */
  id: string
  label: string
}

/** Dropdown options for the optional enrollment metadata fields on Add/Edit Student. */
export interface StudentEnrollmentLookups {
  programs: StudentLookupOption[]
  classifications: StudentLookupOption[]
  enlistmentStatuses: StudentLookupOption[]
}

export type StudentListSortKey = "name" | "section" | "adviser"

export type StudentListStatusFilter = StudentProgressStatus | "all"

/** Two-step lifecycle view: Active roster, or Dropped students (disable step). */
export type StudentListView = "active" | "dropped"

/** Sentinel for "all sections" in filters / query strings. */
export const STUDENT_LIST_ALL_SECTIONS = "all"

/** Rows per page on the student list table. */
export const STUDENT_LIST_PAGE_SIZE = 10

export interface StudentListQuery {
  /** `section.section_id`, or STUDENT_LIST_ALL_SECTIONS for all. */
  sectionId: string
  progressStatus: StudentListStatusFilter
  search: string
  sort: StudentListSortKey
  dir: "asc" | "desc"
  /** 1-based page index. */
  page: number
  view: StudentListView
}

export interface StudentListMeta {
  academicYear: string
  semester: string
}

export interface StudentListSummary {
  total: number
  onTrack: number
  inProgress: number
  atRisk: number
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Payload returned by `getStudentListData()` — the only shape the UI needs. */
export interface StudentListPageData {
  students: StudentListRow[]
  sections: StudentListSectionOption[]
  lookups: StudentEnrollmentLookups
  summary: StudentListSummary
  meta: StudentListMeta
  currentUser: AdminCurrentUser
  query: StudentListQuery
}

/**
 * Supabase select used for the student list.
 * Tables: enrollment → app_user (student), section, app_user (adviser), attendance_session
 */
export const ENROLLMENT_LIST_SELECT = `
  enrollment_id,
  student_user_id,
  section_id,
  program_id,
  student_classification_id,
  enlistment_status_id,
  app_user(full_name, email, student_number, sais_id, avatar_url),
  section:section_id(
    section_id,
    course_code,
    required_hour_total,
    adviser_user_id,
    term:term_id(school_year),
    app_user:adviser_user_id(full_name)
  ),
  attendance_session(duration_minute, attendance_session_status(code))
` as const

/** Raw row shape returned by `ENROLLMENT_LIST_SELECT`. */
export interface EnrollmentListDbRow {
  enrollment_id: string
  student_user_id: string
  section_id: string
  program_id: string | null
  student_classification_id: string | null
  enlistment_status_id: string | null
  app_user: {
    full_name: string
    email: string
    student_number: string | null
    sais_id: string | null
    avatar_url: string | null
  } | null
  section: {
    section_id: string
    course_code: string
    required_hour_total: number | null
    adviser_user_id: string
    term: { school_year: string } | null
    app_user: { full_name: string } | null
  } | null
  attendance_session: Array<{
    duration_minute: number | null
    attendance_session_status: { code: string } | { code: string }[] | null
  }> | null
}

export function mapEnrollmentToStudentListRow(
  row: EnrollmentListDbRow
): StudentListRow | null {
  const student = row.app_user
  const section = row.section
  if (!student || !section) return null

  const hoursRequired = section.required_hour_total ?? 60
  // Count completed sessions only: 'closed' (normal/manual) + 'corrected' (edited).
  const studentMinutes =
    row.attendance_session?.reduce((sum, session) => {
      const st = Array.isArray(session.attendance_session_status)
        ? session.attendance_session_status[0]
        : session.attendance_session_status
      return st?.code === "closed" || st?.code === "corrected"
        ? sum + (session.duration_minute ?? 0)
        : sum
    }, 0) ?? 0
  const hoursCompleted = Math.round(studentMinutes / 60)
  const pct = completionPct(hoursCompleted, hoursRequired)
  const adviserName = section.app_user?.full_name ?? "Unassigned"

  return {
    enrollmentId: row.enrollment_id,
    studentUserId: row.student_user_id,
    sectionId: section.section_id,
    adviserUserId: section.adviser_user_id ?? null,
    fullName: student.full_name ?? "Unknown",
    email: student.email ?? "",
    studentNumber: student.student_number ?? null,
    saisId: student.sais_id ?? null,
    programId: row.program_id ?? null,
    studentClassificationId: row.student_classification_id ?? null,
    enlistmentStatusId: row.enlistment_status_id ?? null,
    classLabel: formatClassLabel({
      courseCode: section.course_code,
      facilitatorName: section.app_user?.full_name,
      schoolYear: section.term?.school_year,
    }),
    adviserName,
    hoursCompleted,
    hoursRequired,
    completionPct: pct,
    progressStatus: progressStatusFromPct(pct),
    avatarUrl: student.avatar_url ?? null,
  }
}

export function buildStudentListSummary(rows: StudentListRow[]): StudentListSummary {
  const summary: StudentListSummary = {
    total: rows.length,
    onTrack: 0,
    inProgress: 0,
    atRisk: 0,
  }

  for (const row of rows) {
    if (row.progressStatus === "on_track") summary.onTrack += 1
    else if (row.progressStatus === "in_progress") summary.inProgress += 1
    else summary.atRisk += 1
  }

  return summary
}

const VALID_STATUS: StudentListStatusFilter[] = [
  "all",
  "on_track",
  "in_progress",
  "at_risk",
]

export function parseStudentListQuery(params: {
  sectionId?: string
  status?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
  view?: string
}): StudentListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  return {
    sectionId: params.sectionId ?? STUDENT_LIST_ALL_SECTIONS,
    progressStatus: VALID_STATUS.includes(
      params.status as StudentListStatusFilter
    )
      ? (params.status as StudentListStatusFilter)
      : "all",
    search: params.q ?? "",
    sort:
      params.sort === "section"
        ? "section"
        : params.sort === "adviser"
          ? "adviser"
          : "name",
    dir: params.dir === "desc" ? "desc" : "asc",
    page: pageNum,
    view: params.view === "dropped" ? "dropped" : "active",
  }
}

/**
 * Client/server-safe row filtering & sorting.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterStudentListRows(
  rows: StudentListRow[],
  query: StudentListQuery
): StudentListRow[] {
  const q = query.search.trim().toLowerCase()

  let filtered = rows.filter((student) => {
    if (
      query.sectionId !== STUDENT_LIST_ALL_SECTIONS &&
      student.sectionId !== query.sectionId
    ) {
      return false
    }
    if (
      query.progressStatus !== "all" &&
      student.progressStatus !== query.progressStatus
    ) {
      return false
    }
    if (!q) return true
    return (
      student.fullName.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      (student.studentNumber ?? "").toLowerCase().includes(q) ||
      student.classLabel.toLowerCase().includes(q) ||
      student.adviserName.toLowerCase().includes(q)
    )
  })

  const factor = query.dir === "asc" ? 1 : -1
  filtered = [...filtered].sort((a, b) => {
    if (query.sort === "name") {
      return a.fullName.localeCompare(b.fullName) * factor
    }
    if (query.sort === "section") {
      return a.classLabel.localeCompare(b.classLabel) * factor
    }
    return a.adviserName.localeCompare(b.adviserName) * factor
  })

  return filtered
}

export function paginateStudentListRows<T>(
  rows: T[],
  page: number,
  pageSize: number = STUDENT_LIST_PAGE_SIZE
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
