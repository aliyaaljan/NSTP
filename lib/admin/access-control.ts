/**
 * Access Control — shared contract for the admin access control page.
 *
 * Backend devs: implement data fetching in `getAccessControlData()` inside
 * `lib/admin/access-control-actions.ts`. The UI reads `AccessControlPageData` only.
 * Replace `filterAccessControlRows()` with SQL filters when the list grows large.
 *
 * Database mapping:
 *   app_user.app_user_id  → AccessControlRow.appUserId
 *   app_user.full_name    → AccessControlRow.fullName
 *   app_user.email        → AccessControlRow.email
 *   app_user.student_number / sais_id → AccessControlRow.displayId
 *   app_user.role_id      → AccessControlRow.roleId
 *   role.code / role.name → AccessControlRow.roleCode / roleName
 *   app_user.is_active    → AccessControlRow.isActive
 *
 * Role changes should also insert into `role_change` (target_user_id, changed_by_user_id,
 * old_role_id, new_role_id, reason) — see `updateUserRole()` in access-control-actions.ts.
 */

export type AppRoleCode = "admin" | "adviser" | "student"

export const ACCESS_CONTROL_ALL_ROLES = "all"

export type AccessControlStatusFilter = "all" | "active" | "inactive"

export type AccessControlSortKey = "name" | "id" | "role"

export interface AccessControlRow {
  /** `app_user.app_user_id` — same as `auth.users.id` */
  appUserId: string
  fullName: string
  email: string
  /** Preferred ID shown in the table: student_number, then sais_id, then truncated UUID. */
  displayId: string
  studentNumber: string | null
  saisId: string | null
  /** `role.role_id` */
  roleId: string
  /** `role.code` — 'admin' | 'adviser' | 'student' */
  roleCode: AppRoleCode
  /** `role.name` — human-readable label from lookup table */
  roleName: string
  isActive: boolean
  /** ISO timestamp from `app_user.updated_at` */
  updatedAt: string | null
  /** ISO timestamp from `app_user.created_at` */
  createdAt: string | null
  /** True when this user owns a `section` in the active term — role changes/deactivation may strand it. */
  facilitatesActiveTermClass: boolean
  /** Preview row — not persisted in the database */
  isSample?: boolean
}

export interface AccessControlRoleOption {
  /** `role.role_id` */
  roleId: string
  code: AppRoleCode
  name: string
}

export interface AccessControlSummary {
  totalUsers: number
  adminCount: number
  adviserCount: number
  studentCount: number
  activeCount: number
  inactiveCount: number
}

export interface AccessControlQuery {
  /** `role.code`, or ACCESS_CONTROL_ALL_ROLES for all. */
  role: AppRoleCode | typeof ACCESS_CONTROL_ALL_ROLES
  status: AccessControlStatusFilter
  search: string
  sort: AccessControlSortKey
  dir: "asc" | "desc"
  /** 1-based page index. */
  page: number
}

export interface AccessControlMeta {
  academicYear: string
  semester: string
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

/** Rows per page on the access control table. */
export const ACCESS_CONTROL_PAGE_SIZE = 10

/** Payload returned by `getAccessControlData()` — the only shape the UI needs. */
export interface AccessControlPageData {
  users: AccessControlRow[]
  roles: AccessControlRoleOption[]
  summary: AccessControlSummary
  meta: AccessControlMeta
  currentUser: AdminCurrentUser
  query: AccessControlQuery
}

/**
 * Supabase select used for the access control user list.
 * Tables: app_user → role
 */
export const ACCESS_CONTROL_USER_SELECT = `
  app_user_id,
  full_name,
  email,
  student_number,
  sais_id,
  is_active,
  created_at,
  updated_at,
  role:role_id(role_id, code, name)
` as const

/** Raw row shape returned by `ACCESS_CONTROL_USER_SELECT`. */
export interface AccessControlDbRow {
  app_user_id: string
  full_name: string
  email: string
  student_number: string | null
  sais_id: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  role: {
    role_id: string
    code: string
    name: string
  } | null
}

export const ROLE_CODE_LABELS: Record<AppRoleCode, string> = {
  admin: "Administrator",
  adviser: "Adviser",
  student: "Student",
}

export interface RoleColorStyle {
  color: string
  bg: string
}

/** Shared role colors for access control badges and summary cards. */
export const ROLE_COLOR_STYLES: Record<AppRoleCode, RoleColorStyle> = {
  admin: { color: "#CA8A04", bg: "rgba(234, 179, 8, 0.15)" },
  adviser: { color: "#1B4332", bg: "#F0FDF4" },
  student: { color: "#B91C1C", bg: "rgba(185, 28, 28, 0.1)" },
}

export const ACCESS_CONTROL_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: AccessControlStatusFilter
  label: string
}> = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

const VALID_ROLE_CODES: AppRoleCode[] = ["admin", "adviser", "student"]

function isAppRoleCode(value: string): value is AppRoleCode {
  return VALID_ROLE_CODES.includes(value as AppRoleCode)
}

function displayIdFromRow(row: {
  app_user_id: string
  student_number: string | null
  sais_id: string | null
}): string {
  if (row.student_number?.trim()) return row.student_number.trim()
  if (row.sais_id?.trim()) return row.sais_id.trim()
  return row.app_user_id.slice(0, 8).toUpperCase()
}

export function mapAccessControlDbRow(
  row: AccessControlDbRow,
  facilitatesActiveTermClass = false
): AccessControlRow | null {
  const role = row.role
  if (!role || !isAppRoleCode(role.code)) return null

  return {
    appUserId: row.app_user_id,
    fullName: row.full_name ?? "Unknown",
    email: row.email ?? "",
    displayId: displayIdFromRow(row),
    studentNumber: row.student_number ?? null,
    saisId: row.sais_id ?? null,
    roleId: role.role_id,
    roleCode: role.code,
    roleName: role.name,
    isActive: row.is_active,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    facilitatesActiveTermClass,
  }
}

export function buildAccessControlSummary(users: AccessControlRow[]): AccessControlSummary {
  let adminCount = 0
  let adviserCount = 0
  let studentCount = 0
  let activeCount = 0
  let inactiveCount = 0

  for (const user of users) {
    if (user.roleCode === "admin") adminCount += 1
    else if (user.roleCode === "adviser") adviserCount += 1
    else studentCount += 1

    if (user.isActive) activeCount += 1
    else inactiveCount += 1
  }

  return {
    totalUsers: users.length,
    adminCount,
    adviserCount,
    studentCount,
    activeCount,
    inactiveCount,
  }
}

export function parseAccessControlQuery(params: {
  role?: string
  status?: string
  q?: string
  sort?: string
  dir?: string
  page?: string
}): AccessControlQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const roleParam = params.role ?? ACCESS_CONTROL_ALL_ROLES

  return {
    role:
      roleParam !== ACCESS_CONTROL_ALL_ROLES && isAppRoleCode(roleParam)
        ? roleParam
        : ACCESS_CONTROL_ALL_ROLES,
    status: ["all", "active", "inactive"].includes(params.status ?? "")
      ? (params.status as AccessControlStatusFilter)
      : "all",
    search: params.q ?? "",
    sort: params.sort === "id" ? "id" : params.sort === "role" ? "role" : "name",
    dir: params.dir === "desc" ? "desc" : "asc",
    page: pageNum,
  }
}

/**
 * Client/server-safe row filtering & sorting.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterAccessControlRows(
  rows: AccessControlRow[],
  query: AccessControlQuery
): AccessControlRow[] {
  const q = query.search.trim().toLowerCase()

  let filtered = rows.filter((user) => {
    if (query.role !== ACCESS_CONTROL_ALL_ROLES && user.roleCode !== query.role) {
      return false
    }
    if (query.status === "active" && !user.isActive) return false
    if (query.status === "inactive" && user.isActive) return false
    if (!q) return true
    return (
      user.fullName.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.displayId.toLowerCase().includes(q) ||
      user.roleName.toLowerCase().includes(q) ||
      user.roleCode.toLowerCase().includes(q)
    )
  })

  const factor = query.dir === "asc" ? 1 : -1
  filtered = [...filtered].sort((a, b) => {
    if (query.sort === "id") {
      return a.displayId.localeCompare(b.displayId) * factor
    }
    if (query.sort === "role") {
      return a.roleName.localeCompare(b.roleName) * factor
    }
    return a.fullName.localeCompare(b.fullName) * factor
  })

  return filtered
}

export function paginateAccessControlRows<T>(
  rows: T[],
  page: number,
  pageSize: number = ACCESS_CONTROL_PAGE_SIZE
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
