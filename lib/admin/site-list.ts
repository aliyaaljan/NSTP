/**
 * Site List — shared contract for the admin GPS site list page.
 *
 * Backend devs: implement data fetching in `getSiteListData()` inside
 * `lib/admin/site-list-actions.ts`. The UI reads `SiteListPageData` only.
 * Replace `filterSiteListRows()` with SQL filters when the list grows large.
 *
 * Database mapping:
 *
 * GPS sites → `section_geofence` joined with `section` → `app_user` (adviser)
 *   section_geofence_id  → SiteListRow.geofenceId
 *   label                → SiteListRow.siteName
 *   radius_meter         → SiteListRow.radiusMeters
 *   center_latitude      → SiteListRow.centerLatitude
 *   center_longitude     → SiteListRow.centerLongitude
 *   section_id           → SiteListRow.sectionId
 *   section.course_code + adviser.full_name → SiteListRow.sectionName (derived; sections have no name)
 *   adviser.full_name    → SiteListRow.supervisorName
 *   is_active            → SiteListRow.isActive
 */

import { formatClassLabel } from "@/lib/shared/class-label"

export interface SiteListRow {
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
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  sectionName: string
  /** `section.course_code` */
  courseCode: string
  /** `term.school_year` via section.term_id */
  schoolYear: string | null
  /** `section.adviser_user_id` */
  adviserUserId: string
  /** `app_user.full_name` via section.adviser_user_id */
  supervisorName: string
  /** `section_geofence.is_active` */
  isActive: boolean
}

export interface SiteListSectionOption {
  /** `section.section_id` */
  sectionId: string
  /** Display label e.g. "CWTS — CWTS-2526A" */
  label: string
  /** `section.course_code` */
  courseCode: string
  /** `term.school_year` via section.term_id */
  schoolYear: string | null
  /** `section.adviser_user_id` */
  adviserUserId: string
  /** `app_user.full_name` via `section.adviser_user_id` */
  supervisorName: string
}

export interface SiteListAdviserOption {
  /** `app_user.app_user_id` */
  adviserUserId: string
  fullName: string
}

export type SiteListStatusFilter = "all" | "active" | "inactive"

export type SiteListSortKey = "name" | "section" | "adviser" | "radius" | "status"

/** Sentinel for "all sections" in filters / query strings. */
export const SITE_LIST_ALL_SECTIONS = "all"

/** Sentinel for "all advisers" in filters / query strings. */
export const SITE_LIST_ALL_ADVISERS = "all"

/** Sentinel for "all statuses" in filters / query strings. */
export const SITE_LIST_ALL_STATUSES = "all"

/** Rows per page on the site list table. */
export const SITE_LIST_PAGE_SIZE = 10

export interface SiteListQuery {
  status: SiteListStatusFilter
  /** `section.section_id`, or SITE_LIST_ALL_SECTIONS for all. */
  sectionId: string
  /** `section.adviser_user_id`, or SITE_LIST_ALL_ADVISERS for all. */
  adviserId: string
  search: string
  sort: SiteListSortKey
  dir: "asc" | "desc"
  /** 1-based page index. */
  page: number
}

export interface SiteListMeta {
  academicYear: string
  semester: string
}

export interface SiteListSummary {
  total: number
  active: number
  inactive: number
  /** Average geofence radius in meters (rounded). */
  avgRadiusMeters: number
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Payload returned by `getSiteListData()` — the only shape the UI needs. */
export interface SiteListPageData {
  sites: SiteListRow[]
  sections: SiteListSectionOption[]
  advisers: SiteListAdviserOption[]
  summary: SiteListSummary
  meta: SiteListMeta
  currentUser: AdminCurrentUser
  query: SiteListQuery
}

/** Supabase select for geofence list with section + adviser. */
export const SITE_LIST_SELECT = `
  section_geofence_id,
  label,
  center_latitude,
  center_longitude,
  radius_meter,
  is_active,
  section:section_id(
    section_id,
    course_code,
    adviser_user_id,
    term:term_id(school_year),
    adviser:adviser_user_id(full_name)
  )
` as const

export interface SiteListDbRow {
  section_geofence_id: string
  label: string | null
  center_latitude: number
  center_longitude: number
  radius_meter: number
  is_active: boolean
  section: {
    section_id: string
    course_code: string
    adviser_user_id: string | null
    term: { school_year: string } | null
    adviser: { full_name: string } | null
  } | null
}

export const SITE_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: SiteListStatusFilter
  label: string
}> = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

const VALID_SORT: SiteListSortKey[] = ["name", "section", "adviser", "radius", "status"]

export function parseSiteListQuery(params: {
  status?: string
  sectionId?: string
  adviserId?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
}): SiteListQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const sort = VALID_SORT.includes(params.sort as SiteListSortKey)
    ? (params.sort as SiteListSortKey)
    : "name"
  const status: SiteListStatusFilter =
    params.status === "active" || params.status === "inactive" ? params.status : "all"
  const sectionId = params.sectionId?.trim() || SITE_LIST_ALL_SECTIONS
  const adviserId = params.adviserId?.trim() || SITE_LIST_ALL_ADVISERS

  return {
    status,
    sectionId,
    adviserId,
    search: params.q ?? "",
    sort,
    dir: params.dir === "desc" ? "desc" : "asc",
    page: pageNum,
  }
}

export function mapSiteListDbRow(row: SiteListDbRow): SiteListRow | null {
  const section = row.section
  if (!section) return null

  const classLabel = formatClassLabel({
    courseCode: section.course_code,
    facilitatorName: section.adviser?.full_name,
    schoolYear: section.term?.school_year,
  })

  return {
    geofenceId: row.section_geofence_id,
    siteName: row.label?.trim() || classLabel,
    radiusMeters: row.radius_meter,
    centerLatitude: Number(row.center_latitude),
    centerLongitude: Number(row.center_longitude),
    sectionId: section.section_id,
    sectionName: classLabel,
    courseCode: section.course_code,
    schoolYear: section.term?.school_year ?? null,
    adviserUserId: section.adviser_user_id ?? "",
    supervisorName: section.adviser?.full_name ?? "Unassigned",
    isActive: row.is_active,
  }
}

export function buildSiteListSummary(rows: SiteListRow[]): SiteListSummary {
  let active = 0
  let inactive = 0
  let radiusSum = 0

  for (const row of rows) {
    if (row.isActive) active += 1
    else inactive += 1
    radiusSum += row.radiusMeters
  }

  return {
    total: rows.length,
    active,
    inactive,
    avgRadiusMeters:
      rows.length > 0 ? Math.round(radiusSum / rows.length) : 0,
  }
}

export function formatSiteCoordinates(site: SiteListRow): string {
  return `${site.centerLatitude.toFixed(6)}, ${site.centerLongitude.toFixed(6)}`
}

/**
 * Client/server-safe row filtering & sorting.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterSiteListRows(
  rows: SiteListRow[],
  query: SiteListQuery
): SiteListRow[] {
  const q = query.search.trim().toLowerCase()

  let filtered = rows.filter((site) => {
    if (query.status === "active" && !site.isActive) return false
    if (query.status === "inactive" && site.isActive) return false
    if (
      query.sectionId !== SITE_LIST_ALL_SECTIONS &&
      site.sectionId !== query.sectionId
    ) {
      return false
    }
    if (
      query.adviserId !== SITE_LIST_ALL_ADVISERS &&
      site.adviserUserId !== query.adviserId
    ) {
      return false
    }
    if (!q) return true
    return (
      site.siteName.toLowerCase().includes(q) ||
      site.sectionName.toLowerCase().includes(q) ||
      site.supervisorName.toLowerCase().includes(q)
    )
  })

  const factor = query.dir === "asc" ? 1 : -1
  filtered = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "section":
        return a.sectionName.localeCompare(b.sectionName) * factor
      case "adviser":
        return a.supervisorName.localeCompare(b.supervisorName) * factor
      case "radius":
        return (a.radiusMeters - b.radiusMeters) * factor
      case "status":
        return (Number(a.isActive) - Number(b.isActive)) * factor
      case "name":
      default:
        return a.siteName.localeCompare(b.siteName) * factor
    }
  })

  return filtered
}

export function paginateSiteListRows<T>(
  rows: T[],
  page: number,
  pageSize: number = SITE_LIST_PAGE_SIZE
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
