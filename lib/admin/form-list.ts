/**
 * Forms List — shared contract for the admin forms page.
 *
 * Backend devs: implement data fetching in `getFormListData()` inside
 * `lib/admin/form-list-actions.ts`. The UI reads `FormListPageData` only.
 * Replace `filterFormListRows()` with SQL filters when the list grows large.
 *
 * Each row represents a form requirement resolved for one section:
 *   - Global requirements (`form_requirement.section_id` IS NULL) expand to one
 *     row per section, minus `form_requirement_exclusion` rows.
 *   - Section-specific requirements produce one row for that section.
 */

export interface FormListRow {
  /** Stable UI key — `${formRequirementId}:${sectionId}` */
  rowId: string
  /** `form_requirement.form_requirement_id` */
  formRequirementId: string
  /** `form_requirement.section_id` — null when the requirement is global */
  requirementSectionId: string | null
  /** Resolved `section.section_id` for this row */
  sectionId: string
  /** `form_requirement.title` */
  formName: string
  /** `section.name` */
  sectionName: string
  /** `section.adviser_user_id` → `app_user.full_name` */
  adviserName: string
  /** Submissions in this section for this requirement */
  submittedCount: number
  /** Active enrollments in this section */
  totalStudents: number
  /** `form_requirement.due_date` (YYYY-MM-DD) */
  dueDate: string | null
  /** `form_requirement.is_active` */
  isActive: boolean
  /** True when `requirementSectionId` is null */
  isGlobal: boolean
  /** Hardcoded preview row — not persisted in the database */
  isSample?: boolean
}

export interface FormListSectionOption {
  /** `section.section_id` */
  sectionId: string
  name: string
}

export type FormListSortKey = "name" | "section" | "deadline" | "analytics"

export const FORM_LIST_ALL_SECTIONS = "all"

/** Rows per page on the forms list table. */
export const FORM_LIST_PAGE_SIZE = 10

export interface FormListQuery {
  /** `section.section_id`, or FORM_LIST_ALL_SECTIONS for all. */
  sectionId: string
  search: string
  sort: FormListSortKey
  dir: "asc" | "desc"
  /** 1-based page index. */
  page: number
}

export interface FormListMeta {
  academicYear: string
  semester: string
}

export interface FormListSummary {
  total: number
  global: number
  sectionSpecific: number
  /** Mean submission rate across rows with enrolled students (0–100). */
  avgSubmissionPct: number
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Payload returned by `getFormListData()` — the only shape the UI needs. */
export interface FormListPageData {
  forms: FormListRow[]
  sections: FormListSectionOption[]
  summary: FormListSummary
  meta: FormListMeta
  currentUser: AdminCurrentUser
  query: FormListQuery
}

/**
 * Supabase select for form requirements on the admin list.
 * Tables: form_requirement → section → app_user (adviser)
 */
export const FORM_REQUIREMENT_LIST_SELECT = `
  form_requirement_id,
  section_id,
  title,
  description,
  due_date,
  is_active,
  created_by_user_id,
  section:section_id(
    section_id,
    name,
    adviser_user_id,
    app_user:adviser_user_id(full_name)
  )
` as const

/** Raw row shape returned by `FORM_REQUIREMENT_LIST_SELECT`. */
export interface FormRequirementListDbRow {
  form_requirement_id: string
  section_id: string | null
  title: string
  description: string | null
  due_date: string | null
  is_active: boolean
  created_by_user_id: string
  section: {
    section_id: string
    name: string
    adviser_user_id: string
    app_user: { full_name: string } | null
  } | null
}

export interface FormListSectionDbRow {
  section_id: string
  name: string
  adviser_user_id: string
  app_user: { full_name: string } | null
}

export interface FormRequirementExclusionDbRow {
  section_id: string
  form_requirement_id: string
}

export interface FormSubmissionCountDbRow {
  form_requirement_id: string
  enrollment: { section_id: string } | null
}

const VALID_SORT: FormListSortKey[] = ["name", "section", "deadline", "analytics"]

export function parseFormListQuery(params: {
  sectionId?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
}): FormListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const sort = VALID_SORT.includes(params.sort as FormListSortKey)
    ? (params.sort as FormListSortKey)
    : "name"

  return {
    sectionId: params.sectionId ?? FORM_LIST_ALL_SECTIONS,
    search: params.q ?? "",
    sort,
    dir: params.dir === "desc" ? "desc" : "asc",
    page: pageNum,
  }
}

/** Format `form_requirement.due_date` for the deadline column. */
export function formatFormDeadline(dueDate: string | null): {
  date: string
  time: string
} {
  if (!dueDate) {
    return { date: "—", time: "" }
  }

  const parsed = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return { date: dueDate, time: "" }
  }

  return {
    date: parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: "11:59 PM",
  }
}

/**
 * Expand requirements into per-section rows and attach analytics.
 * Backend can move this expansion into a SQL view when ready.
 */
export function buildFormListRows(
  requirements: FormRequirementListDbRow[],
  sections: FormListSectionDbRow[],
  exclusions: FormRequirementExclusionDbRow[],
  enrollmentCounts: Map<string, number>,
  submissionCounts: Map<string, number>
): FormListRow[] {
  const excludedPairs = new Set(
    exclusions.map((row) => `${row.form_requirement_id}:${row.section_id}`)
  )

  const rows: FormListRow[] = []

  for (const requirement of requirements) {
    if (!requirement.is_active) continue

    const targetSections =
      requirement.section_id === null
        ? sections
        : sections.filter((section) => section.section_id === requirement.section_id)

    for (const section of targetSections) {
      const pairKey = `${requirement.form_requirement_id}:${section.section_id}`
      if (requirement.section_id === null && excludedPairs.has(pairKey)) {
        continue
      }

      const countKey = pairKey
      rows.push({
        rowId: pairKey,
        formRequirementId: requirement.form_requirement_id,
        requirementSectionId: requirement.section_id,
        sectionId: section.section_id,
        formName: requirement.title,
        sectionName: section.name,
        adviserName: section.app_user?.full_name ?? "Unassigned",
        submittedCount: submissionCounts.get(countKey) ?? 0,
        totalStudents: enrollmentCounts.get(section.section_id) ?? 0,
        dueDate: requirement.due_date,
        isActive: requirement.is_active,
        isGlobal: requirement.section_id === null,
      })
    }
  }

  return rows
}

export function buildFormListSummary(rows: FormListRow[]): FormListSummary {
  let global = 0
  let sectionSpecific = 0
  let submissionSum = 0
  let submissionCount = 0

  for (const row of rows) {
    if (row.isGlobal) global += 1
    else sectionSpecific += 1

    if (row.totalStudents > 0) {
      submissionSum += (row.submittedCount / row.totalStudents) * 100
      submissionCount += 1
    }
  }

  return {
    total: rows.length,
    global,
    sectionSpecific,
    avgSubmissionPct:
      submissionCount > 0 ? Math.round(submissionSum / submissionCount) : 0,
  }
}

/**
 * Client/server-safe row filtering & sorting.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterFormListRows(
  rows: FormListRow[],
  query: FormListQuery
): FormListRow[] {
  const q = query.search.trim().toLowerCase()

  let filtered = rows.filter((form) => {
    if (query.sectionId !== FORM_LIST_ALL_SECTIONS && form.sectionId !== query.sectionId) {
      return false
    }
    if (!q) return true
    return (
      form.formName.toLowerCase().includes(q) ||
      form.sectionName.toLowerCase().includes(q) ||
      form.adviserName.toLowerCase().includes(q)
    )
  })

  const factor = query.dir === "asc" ? 1 : -1
  filtered = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "section": {
        const aKey = `${a.sectionName}-${a.adviserName}`
        const bKey = `${b.sectionName}-${b.adviserName}`
        return aKey.localeCompare(bKey) * factor
      }
      case "deadline": {
        const aTime = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Infinity
        const bTime = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Infinity
        return (aTime - bTime) * factor
      }
      case "analytics": {
        const aRatio = a.totalStudents > 0 ? a.submittedCount / a.totalStudents : 0
        const bRatio = b.totalStudents > 0 ? b.submittedCount / b.totalStudents : 0
        return (aRatio - bRatio) * factor
      }
      case "name":
      default:
        return a.formName.localeCompare(b.formName) * factor
    }
  })

  return filtered
}

export function paginateFormListRows<T>(
  rows: T[],
  page: number,
  pageSize: number = FORM_LIST_PAGE_SIZE
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

/** Preview rows for UI reference — remove when live data is seeded. */
const FORM_LIST_SAMPLE_DEFINITIONS = [
  {
    formName: "Daily Time Record",
    sectionName: "B",
    adviserName: "Kim, Mingyu",
    submittedCount: 1,
    totalStudents: 56,
    dueDate: "2026-06-19",
    isGlobal: true,
  },
  {
    formName: "Service Rendered Report",
    sectionName: "A",
    adviserName: "Reyes, Ana",
    submittedCount: 12,
    totalStudents: 48,
    dueDate: "2026-07-15",
    isGlobal: false,
  },
  {
    formName: "Final Reflection Paper",
    sectionName: "C",
    adviserName: "Santos, Maria",
    submittedCount: 34,
    totalStudents: 52,
    dueDate: "2026-05-30",
    isGlobal: true,
  },
] as const

/**
 * Builds three hardcoded sample rows for layout reference.
 * Uses real `section.section_id` values when sections are available.
 */
export function buildSampleFormRows(sections: FormListSectionOption[]): FormListRow[] {
  return FORM_LIST_SAMPLE_DEFINITIONS.map((def, index) => {
    const section =
      sections.find((s) => s.name === def.sectionName) ?? sections[index] ?? null

    const sectionId = section?.sectionId ?? `sample-section-${def.sectionName.toLowerCase()}`

    return {
      rowId: `sample:${index}`,
      formRequirementId: `sample-form-${index}`,
      requirementSectionId: def.isGlobal ? null : sectionId,
      sectionId,
      formName: def.formName,
      sectionName: section?.name ?? def.sectionName,
      adviserName: def.adviserName,
      submittedCount: def.submittedCount,
      totalStudents: def.totalStudents,
      dueDate: def.dueDate,
      isActive: true,
      isGlobal: def.isGlobal,
      isSample: true,
    }
  })
}
