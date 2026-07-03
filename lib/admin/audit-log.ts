/**
 * Audit Log — shared contract for the admin audit log page.
 *
 * Backend devs: implement data fetching in `getAuditLogData()` inside
 * `lib/admin/audit-log-actions.ts`. The UI reads `AuditLogPageData` only.
 * Query `audit_log_readable` (not raw `audit_log`) for human-readable summaries.
 * Replace `filterAuditLogRows()` with SQL filters when the list grows large.
 */

export type AuditLogAction = "INSERT" | "UPDATE" | "DELETE"

export type AuditLogDateRange = "7d" | "30d" | "90d" | "all"

export const AUDIT_LOG_ALL_ACTIONS = "all"

export interface AuditLogRow {
  /** `audit_log_readable.audit_log_id` */
  auditLogId: string
  /** `audit_log_readable.created_at` */
  createdAt: string
  /** `audit_log_readable.app_user_id` — actor who performed the action */
  actorUserId: string | null
  /** `audit_log_readable.actor_name` */
  actorName: string
  /** `audit_log_readable.table_name` */
  tableName: string
  /** `audit_log_readable.table_label` */
  tableLabel: string
  /** `audit_log_readable.record_id` */
  recordId: string
  /** `audit_log_readable.action` — INSERT | UPDATE | DELETE */
  action: AuditLogAction
  /** `audit_log_readable.summary` — human-readable change description */
  summary: string
  /** Short headline for the list row (derived from action + table + summary). */
  title: string
  /** Secondary line: actor role/context (e.g. "Admin | Section B"). */
  subtitle: string
  /** `audit_log_readable.old_data` */
  oldData: Record<string, unknown> | null
  /** `audit_log_readable.new_data` */
  newData: Record<string, unknown> | null
  /** `audit_log_readable.changed_fields` */
  changedFields: string[] | null
  /** Hardcoded preview row — not persisted in the database */
  isSample?: boolean
}

export interface AuditLogMeta {
  academicYear: string
  semester: string
}

export interface AdminCurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

export interface AuditLogQuery {
  search: string
  /** AuditLogAction or AUDIT_LOG_ALL_ACTIONS */
  action: AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS
  dateRange: AuditLogDateRange
  /** 1-based page — synced to URL `?page=` */
  page: number
}

/** Matches the admin dashboard `SectionProgressPanel` page size. */
export const AUDIT_LOG_PAGE_SIZE = 10

/** Payload returned by `getAuditLogData()` — the only shape the UI needs. */
export interface AuditLogPageData {
  entries: AuditLogRow[]
  totalCount: number
  meta: AuditLogMeta
  currentUser: AdminCurrentUser
  query: AuditLogQuery
}

/**
 * Supabase select for the audit log list.
 * View: audit_log_readable (security_invoker — admin RLS applies)
 */
export const AUDIT_LOG_SELECT = `
  audit_log_id,
  created_at,
  app_user_id,
  actor_name,
  table_name,
  table_label,
  record_id,
  action,
  summary,
  old_data,
  new_data,
  changed_fields
` as const

/** Raw row shape returned by `AUDIT_LOG_SELECT`. */
export interface AuditLogDbRow {
  audit_log_id: string
  created_at: string
  app_user_id: string | null
  actor_name: string
  table_name: string
  table_label: string
  record_id: string
  action: string
  summary: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
}

export const AUDIT_ACTION_FILTER_OPTIONS: ReadonlyArray<{
  value: AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS
  label: string
}> = [
  { value: AUDIT_LOG_ALL_ACTIONS, label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
]

export const AUDIT_DATE_RANGE_OPTIONS: ReadonlyArray<{
  value: AuditLogDateRange
  label: string
}> = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
]

const VALID_ACTIONS: Array<AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS> = [
  AUDIT_LOG_ALL_ACTIONS,
  "INSERT",
  "UPDATE",
  "DELETE",
]

const VALID_DATE_RANGES: AuditLogDateRange[] = ["7d", "30d", "90d", "all"]

export function parseAuditLogQuery(params: {
  q?: string
  action?: string
  range?: string
  page?: string
}): AuditLogQuery {
  const pageNum = Math.max(1, parseInt(params.page ?? "1", 10) || 1)

  return {
    search: params.q ?? "",
    action: VALID_ACTIONS.includes(
      params.action as AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS
    )
      ? (params.action as AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS)
      : AUDIT_LOG_ALL_ACTIONS,
    dateRange: VALID_DATE_RANGES.includes(params.range as AuditLogDateRange)
      ? (params.range as AuditLogDateRange)
      : "7d",
    page: pageNum,
  }
}

/** Returns ISO timestamp for the start of the date-range window, or null for "all". */
export function auditLogRangeStart(range: AuditLogDateRange): string | null {
  if (range === "all") return null
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

function actionVerb(action: AuditLogAction): string {
  switch (action) {
    case "INSERT":
      return "Created"
    case "UPDATE":
      return "Updated"
    case "DELETE":
      return "Deleted"
    default:
      return "Modified"
  }
}

function inferActorRole(actorName: string): string {
  if (actorName === "System") return "System"
  return "Admin"
}

export function buildAuditLogTitle(
  action: AuditLogAction,
  tableLabel: string,
  summary: string | null
): string {
  if (summary && summary.length > 0) {
    return summary
  }
  return `${actionVerb(action)} ${tableLabel.toLowerCase()} record`
}

export function buildAuditLogSubtitle(
  actorName: string,
  tableLabel: string,
  action: AuditLogAction
): string {
  const role = inferActorRole(actorName)
  if (actorName === "System") {
    return `System | ${tableLabel}`
  }
  return `${
    role === "Admin" ? "Admin" : actorName
  } | ${tableLabel} · ${actionVerb(action)}`
}

export function mapAuditLogDbRow(row: AuditLogDbRow): AuditLogRow | null {
  const action = row.action as AuditLogAction
  if (!["INSERT", "UPDATE", "DELETE"].includes(action)) return null

  const cleanSummary = sanitizeLogSummary({
    summary: row.summary,
    changedFields: row.changed_fields,
    oldData: row.old_data,
    newData: row.new_data,
    tableLabel: row.table_label,
  })

  return {
    auditLogId: row.audit_log_id,
    createdAt: row.created_at,
    actorUserId: row.app_user_id,
    actorName: row.actor_name,
    tableName: row.table_name,
    tableLabel: row.table_label,
    recordId: row.record_id,
    action,
    summary: cleanSummary,
    title: buildAuditLogTitle(action, row.table_label, row.summary),
    subtitle: buildAuditLogSubtitle(row.actor_name, row.table_label, action),
    oldData: row.old_data,
    newData: row.new_data,
    changedFields: row.changed_fields,
  }
}

/**
 * Client/server-safe row filtering.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function filterAuditLogRows(
  rows: AuditLogRow[],
  query: AuditLogQuery
): AuditLogRow[] {
  const q = query.search.trim().toLowerCase()
  const rangeStart = auditLogRangeStart(query.dateRange)

  return rows.filter((entry) => {
    if (
      query.action !== AUDIT_LOG_ALL_ACTIONS &&
      entry.action !== query.action
    ) {
      return false
    }
    if (rangeStart && new Date(entry.createdAt) < new Date(rangeStart)) {
      return false
    }
    if (!q) return true
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.summary.toLowerCase().includes(q) ||
      entry.actorName.toLowerCase().includes(q) ||
      entry.tableLabel.toLowerCase().includes(q) ||
      entry.tableName.toLowerCase().includes(q) ||
      entry.subtitle.toLowerCase().includes(q)
    )
  })
}

/**
 * Client/server-safe pagination.
 * Backend can delete this and push equivalent logic into the SQL query.
 */
export function paginateAuditLogRows(
  rows: AuditLogRow[],
  page: number,
  pageSize: number = AUDIT_LOG_PAGE_SIZE
): { rows: AuditLogRow[]; totalPages: number; totalCount: number } {
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

/** Formats a timestamp for the audit log list (e.g. "Today at 2:34 PM"). */
export function formatAuditLogTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  if (isToday) return `Today at ${time}`
  if (isYesterday) return `Yesterday at ${time}`

  return (
    date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }) + ` · ${time}`
  )
}

export function auditLogActionIcon(action: AuditLogAction): string {
  switch (action) {
    case "INSERT":
      return "ti-plus"
    case "UPDATE":
      return "ti-pencil"
    case "DELETE":
      return "ti-trash"
    default:
      return "ti-file-text"
  }
}

/** Sample rows for layout reference when the database has no audit entries yet. */
const AUDIT_LOG_SAMPLE_DEFINITIONS = [
  {
    title: "Student added: Juan Carlos Fernandez",
    subtitle: "Admin | Section B",
    action: "INSERT" as const,
    tableName: "enrollment",
    tableLabel: "Student Enrollment",
    actorName: "Admin",
    hoursAgo: 2,
  },
  {
    title: "Time Edit Request Approved",
    subtitle: "Adviser Reyes (Section C) | +2 hours adjustment",
    action: "UPDATE" as const,
    tableName: "appeal",
    tableLabel: "Appeal",
    actorName: "Reyes, Maria",
    hoursAgo: 5,
  },
  {
    title: "GPS Radius Updated",
    subtitle: "Adviser Torres (Section D) | Radius: 500m → 600m",
    action: "UPDATE" as const,
    tableName: "section",
    tableLabel: "Section",
    actorName: "Torres, Ana",
    hoursAgo: 8,
  },
  {
    title: "Form Submitted",
    subtitle: "Student M. Lim | Monthly report for July",
    action: "INSERT" as const,
    tableName: "form_submission",
    tableLabel: "Form Submission",
    actorName: "Lim, Miguel",
    hoursAgo: 24,
  },
  {
    title: "Adviser Added",
    subtitle: "Admin | Assigned to Section J",
    action: "INSERT" as const,
    tableName: "app_user",
    tableLabel: "User",
    actorName: "Admin",
    hoursAgo: 48,
  },
  {
    title: "Access Control Rule Updated",
    subtitle: "Admin | Appointed a new Student Leader",
    action: "UPDATE" as const,
    tableName: "app_user",
    tableLabel: "User",
    actorName: "Admin",
    hoursAgo: 72,
  },
] as const

export function buildSampleAuditLogRows(): AuditLogRow[] {
  const now = Date.now()

  return AUDIT_LOG_SAMPLE_DEFINITIONS.map((def, index) => {
    const createdAt = new Date(
      now - def.hoursAgo * 60 * 60 * 1000
    ).toISOString()

    return {
      auditLogId: `sample:${index}`,
      createdAt,
      actorUserId: null,
      actorName: def.actorName,
      tableName: def.tableName,
      tableLabel: def.tableLabel,
      recordId: `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
      action: def.action,
      summary: def.title,
      title: def.title,
      subtitle: def.subtitle,
      oldData: null,
      newData: null,
      changedFields: null,
      isSample: true,
    }
  })
}

/**
 * Hardcoded static lookup mapping for critical status UUIDs to enforce instant performance.
 * NOTE: Replace these string keys with the exact UUIDs generated by your `dev_seed.sql`
 * or lookup tables for enrollment_status, appeal_status, and roles.
 */

const SYSTEM_UUID_LABEL_MAP: Record<string, string> = {
  // appeal statuses
  "269e7fb6-39b9-48e4-b8d3-5d9995600c43": "open",
  "9248c827-870b-4532-ab51-0129bc4361a0": "under_review",
  "a31f8cb1-8219-4cb5-bb12-9901ad9c1240": "approved",
  "d123e4f5-6789-abcd-ef01-23456789abcd": "rejected",
  // example roles
  "85f7a7e6-e34d-4b94-83a7-1dd433ad715b": "Adviser",
  "c8f96f6b-27ac-4dc0-a912-c79c0491f7a6": "Student",
  "9555937b-646a-46ba-ad33-3d759487fd81": "Admin",
}

/**
 * strips formatting, converts snake_case fields, and replaces
 * structural database IDs with human-readable text
 */
export function sanitizeLogSummary(row: {
  summary: string | null
  changedFields: string[] | null
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  tableLabel: string
}): string {
  let summaryText = row.summary || ""

  // method A: is summary contains UUID in map / table above
  Object.entries(SYSTEM_UUID_LABEL_MAP).forEach(([uuid, label]) => {
    if (summaryText.includes(uuid)) {
      summaryText = summaryText.split(uuid).join(`"${label}"`)
    }
  })

  // method B: dynamically compute summary text if unreadable from changed_fields, old_data and new_data
  const { changedFields, oldData, newData } = row

  if (
    (!summaryText || summaryText.match(/[a-f0-9-]{36}/i)) &&
    changedFields &&
    oldData &&
    newData
  ) {
    const changes = changedFields
      .map((field) => {
        // Skip redundant logging of fields that didn't change clean strings or matched identical copies
        if (oldData[field] === newData[field]) return null

        // Format snake_case field names to clean spaces (e.g., appeal_status_id -> appeal status)
        const fieldLabel = field.replace(/_id$/, "").replace(/_/g, " ")

        const rawOld = String(oldData[field] ?? "none")
        const rawNew = String(newData[field] ?? "none")

        // Map raw values to the map
        const oldVal = SYSTEM_UUID_LABEL_MAP[rawOld]
          ? `"${SYSTEM_UUID_LABEL_MAP[rawOld]}"`
          : `"${rawOld}"`
        const newVal = SYSTEM_UUID_LABEL_MAP[rawNew]
          ? `"${SYSTEM_UUID_LABEL_MAP[rawNew]}"`
          : `"${rawNew}"`

        return `${fieldLabel} from ${oldVal} to ${newVal}`
      })
      .filter((c): c is string => c !== null)

    if (changes.length > 0) {
      summaryText = `Changed ${changes.join(", ")}`
    }
  }
  // method C: clean up self-defeating updates like: Changed resolution time from "X" to "X"
  summaryText = summaryText.replace(
    /resolution time from "[^"]+" to "[^"]+"/,
    ""
  )

  // clean trailing commas or connected text after stripping
  summaryText = summaryText
    .replace(/^,\s*|,\s*$/, "")
    .replace(/\s*for appeal\s*$/, "")
    .trim()

  // final fallback if string is mapped to empty
  if (!summaryText || summaryText === "for appeal") {
    summaryText = `Updated parameters for ${row.tableLabel.toLowerCase()} entry`
  } else {
    summaryText = `${summaryText} for ${row.tableLabel.toLowerCase()}`
  }

  return summaryText
}
