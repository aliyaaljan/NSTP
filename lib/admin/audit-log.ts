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
  auditLogId: string
  createdAt: string
  actorUserId: string | null
  actorName: string
  tableName: string
  tableLabel: string
  recordId: string
  action: AuditLogAction
  summary: string
  title: string
  subtitle: string
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  changedFields: string[] | null
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
  action: AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS
  dateRange: AuditLogDateRange
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

export function mapAuditLogDbRow(
  row: AuditLogDbRow,
  uuidDictionary: Record<string, string>
): AuditLogRow | null {
  const action = row.action as AuditLogAction
  if (!["INSERT", "UPDATE", "DELETE"].includes(action)) return null

  const cleanSummary = sanitizeLogSummary({
    summary: row.summary,
    changed_fields: row.changed_fields,
    old_data: row.old_data,
    new_data: row.new_data,
    tableLabel: row.table_label,
    uuidMap: uuidDictionary,
  })

  return {
    auditLogId: row.audit_log_id,
    createdAt: row.created_at,
    actorUserId: row.app_user_id,
    actorName: row.actor_name || "System",
    tableName: row.table_name,
    tableLabel: row.table_label,
    recordId: row.record_id,
    action,
    summary: cleanSummary,
    title: cleanSummary,
    subtitle: buildAuditLogSubtitle(
      row.actor_name || "System",
      row.table_label,
      action
    ),
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
    if (query.action !== AUDIT_LOG_ALL_ACTIONS && entry.action !== query.action)
      return false
    if (rangeStart && new Date(entry.createdAt) < new Date(rangeStart))
      return false
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

/**
 * Hardcoded static lookup mapping for critical status UUIDs to enforce instant performance.
 * NOTE: Replace these string keys with the exact UUIDs generated by your `dev_seed.sql`
 * or lookup tables for enrollment_status, appeal_status, and roles.
 */

const SYSTEM_UUID_LABEL_MAP: Record<string, string> = {
  // appeal statuses
  "269e7fb6-39b9-48e4-b8d3-5d9995600c43": "pending",
  "9248c827-870b-4532-ab51-0129bc4361a0": "under_review",
  "a31f8cb1-8219-4cb5-bb12-9901ad9c1240": "approved",
  "d123e4f5-6789-abcd-ef01-23456789abcd": "rejected",
  // example roles
  "85f7a7e6-e34d-4b94-83a7-1dd433ad715b": "Adviser",
  "c8f96f6b-27ac-4dc0-a912-c79c0491f7a6": "Student",
  "9555937b-646a-46ba-ad33-3d759487fd81": "Admin",
}

interface SanitizePayload {
  summary: string | null
  changedFields?: string[] | null
  changed_fields?: string[] | null
  oldData?: Record<string, unknown> | null
  old_data?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  tableLabel: string
  uuidMap: Record<string, string>
}
/**
 * strips formatting, converts snake_case fields, and replaces
 * structural database IDs with human-readable text
 */
export function sanitizeLogSummary(payload: SanitizePayload): string {
  const { uuidMap } = payload
  const fields = payload.changedFields ?? payload.changed_fields ?? null
  const oldRaw = payload.oldData ?? payload.old_data ?? null
  const newRaw = payload.newData ?? payload.new_data ?? null

  if (fields && oldRaw && newRaw) {
    const changes = fields
      .map((field) => {
        // ignore list, for better readability
        const ignoredFields = [
          "updated_at",
          "created_at",
          "resolution_time",
          "resolved_at",
        ]
        if (ignoredFields.some((ignored) => field.includes(ignored)))
          return null

        const rawOld = String(oldRaw[field] ?? "").trim()
        const rawNew = String(newRaw[field] ?? "").trim()

        if (rawOld === rawNew || (!rawOld && !rawNew)) return null

        let oldVal =
          uuidMap[rawOld] || uuidMap[rawOld.toLowerCase()] || rawOld || "none"
        let newVal =
          uuidMap[rawNew] || uuidMap[rawNew.toLowerCase()] || rawNew || "none"

        // format timestamps
        if (
          field.endsWith("_at") ||
          field.includes("time") ||
          field.includes("date")
        ) {
          const formatTimeStr = (iso: string) => {
            try {
              const dateObj = new Date(iso)
              if (isNaN(dateObj.getTime())) return iso
              return dateObj.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            } catch {
              return iso
            }
          }
          if (rawOld) oldVal = formatTimeStr(rawOld)
          if (rawNew) newVal = formatTimeStr(rawNew)
        }

        // format minutes
        if (field === "duration_minute") {
          const formatMinutes = (minutesStr: string) => {
            const minutes = parseInt(minutesStr, 10)
            if (isNaN(minutes)) return minutesStr
            const hours = Math.floor(minutes / 60)
            const remainingMins = minutes % 60
            return hours > 0
              ? `${hours}h ${remainingMins}m`
              : `${remainingMins}m`
          }
          if (rawOld) oldVal = formatMinutes(rawOld)
          if (rawNew) newVal = formatMinutes(rawNew)
        }

        // hide identically formatted strings
        if (oldVal === newVal) return null

        const fieldLabel = field
          .replace(/_id$/, "")
          .replace(/_/g, " ")
          .replace("attendance ", "")
          .replace("session ", "")
          .replace("appeal ", "")

        return `${fieldLabel}: '${oldVal}' → '${newVal}'`
      })
      .filter((c): c is string => c !== null)

    if (changes.length > 0) {
      return `${payload.tableLabel} updated (${changes.join(", ")})`
    } else {
      return `Background parameters synced for ${payload.tableLabel.toLowerCase()}`
    }
  }

  let summaryText = payload.summary || ""
  Object.entries(uuidMap).forEach(([uuid, label]) => {
    const regex = new RegExp(uuid, "gi")
    summaryText = summaryText.replace(regex, `'${label}'`)
  })

  summaryText = summaryText
    .replace(/Changed resolution time from "[^"]+" to "[^"]+",?\s*/gi, "")
    .replace(/Changed resolved at from "[^"]+" to "[^"]+",?\s*/gi, "")
    .replace(/^,\s*|,\s*$/, "")
    .trim()

  if (!summaryText || summaryText.toLowerCase() === "for appeal") {
    return `Modified parameters for ${payload.tableLabel.toLowerCase()}`
  }

  return summaryText
}
