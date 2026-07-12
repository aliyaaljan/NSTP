"use server"

import {
  AUDIT_LOG_SELECT,
  auditLogRangeStart,
  mapAuditLogDbRow,
  filterAuditLogRows,
  paginateAuditLogRows,
  type AdminCurrentUser,
  type AuditLogDbRow,
  type AuditLogMeta,
  type AuditLogPageData,
  type AuditLogQuery,
} from "@/lib/admin/audit-log"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib//lookups"

/**
 * Fetches everything the admin audit log page needs.
 *
 * Backend checklist:
 * 1. Keep returning `AuditLogPageData` — no UI changes required.
 * 2. Query `audit_log_readable` (not raw `audit_log`) for summaries.
 * 3. Move `filterAuditLogRows()` logic into SQL when the list grows large.
 * 4. Add server-side search (`ilike` on summary, actor_name) when needed.
 * 5. Replace hardcoded `meta` with a `term` table lookup.
 */

interface CountParams {
  action: string
  dateRange: string
  search: string
}

export async function getExportEventCount(
  params: CountParams
): Promise<number> {
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from("audit_log_readable")
    .select("audit_log_id", { count: "exact", head: true })

  if (params.action && params.action !== "all") {
    query = query.eq("action", params.action)
  }

  if (params.dateRange && params.dateRange !== "all") {
    const days = parseInt(params.dateRange.replace("d", ""), 10)
    if (!isNaN(days)) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("created_at", startDate.toISOString())
    }
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    query = query.or(
      `actor_name.ilike.%${q}%,summary.ilike.%${q}%,table_label.ilike.%${q}%`
    )
  }

  const { count, error } = await query
  if (error) {
    console.error("Error fetching export count:", error)
    return 0
  }

  return count || 0
}
export async function getAuditLogData(
  query: AuditLogQuery
): Promise<AuditLogPageData> {
  const supabase = await createSupabaseServerClient()
  const rangeStart = auditLogRangeStart(query.dateRange)

  const [
    { data: appealStatus },
    { data: enrollmentStatus },
    { data: roles },
    { data: activeTerm },
    { data: attendanceStatus },
  ] = await Promise.all([
    supabase.from("appeal_status").select("appeal_status_id, name"),
    supabase.from("enrollment_status").select("enrollment_status_id, name"),
    supabase.from("role").select("role_id, code"),
    supabase
      .from("term")
      .select("academic_year, semester")
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("attendance_session_status")
      .select("attendance_session_status_id, name"),
  ])

  // build dynamic dictionary server-side
  const dynamicUuidMap: Record<string, string> = {}
  appealStatus?.forEach(
    (s) => (dynamicUuidMap[s.appeal_status_id] = s.name.replace(/_/g, " "))
  )
  enrollmentStatus?.forEach(
    (s) => (dynamicUuidMap[s.enrollment_status_id] = s.name)
  )
  roles?.forEach((r) => (dynamicUuidMap[r.role_id] = r.code))
  attendanceStatus?.forEach(
    (s) =>
      (dynamicUuidMap[s.attendance_session_status_id] = s.name.replace(
        /_/g,
        " "
      ))
  )

  // query raw audit logs
  let auditQuery = supabase
    .from("audit_log_readable")
    .select(AUDIT_LOG_SELECT)
    .order("created_at", { ascending: false })
    .limit(800)

  if (rangeStart) {
    auditQuery = auditQuery.gte("created_at", rangeStart)
  }

  const [{ data, error }, { data: authData }] = await Promise.all([
    auditQuery,
    supabase.auth.getUser(),
  ])

  if (error) {
    console.error("[getAuditLogData] audit_log_readable query failed", error)
  }

  // translate rows to human-readable text
  const dbEntries =
    (data as AuditLogDbRow[] | null)
      ?.map((row) => mapAuditLogDbRow(row, dynamicUuidMap))
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  // memory filtering and pagination
  const filteredEntries = filterAuditLogRows(dbEntries, query)
  const paginatedResult = paginateAuditLogRows(filteredEntries, query.page)

  const entries = paginatedResult.rows

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: AuditLogMeta = {
    academicYear: activeTerm?.academic_year || "2025-2026",
    semester: activeTerm?.semester || "2nd Semester",
  }

  return {
    entries,
    totalCount: paginatedResult.totalCount,
    meta,
    currentUser,
    query,
  }
}

async function resolveCurrentUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId?: string
): Promise<AdminCurrentUser> {
  if (!userId) {
    return { name: "System Automated", role: "NSTP Admin" }
  }
  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, avatar_url, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "System Admin", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "User",
    avatarUrl: (appUser as any).avatar_url ?? undefined,
  }
}
