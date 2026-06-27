"use server"

import {
  AUDIT_LOG_SELECT,
  auditLogRangeStart,
  buildSampleAuditLogRows,
  mapAuditLogDbRow,
  type AdminCurrentUser,
  type AuditLogDbRow,
  type AuditLogMeta,
  type AuditLogPageData,
  type AuditLogQuery,
} from "@/lib/admin/audit-log"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"

/**
 * Fetches everything the admin audit log page needs.
 *
 * Backend checklist:
 * 1. Keep returning `AuditLogPageData` — no UI changes required.
 * 2. Query `audit_log_readable` (not raw `audit_log`) for summaries.
 * 3. Move `filterAuditLogRows()` logic into SQL when the list grows large.
 * 4. Add server-side search (`ilike` on summary, actor_name) when needed.
 * 5. Replace hardcoded `meta` with a `term` table lookup.
 * 6. Remove `buildSampleAuditLogRows()` merge once production data exists.
 */
export async function getAuditLogData(
  query: AuditLogQuery
): Promise<AuditLogPageData> {
  const supabase = await createSupabaseServerClient()
  const rangeStart = auditLogRangeStart(query.dateRange)

  let auditQuery = supabase
    .from("audit_log_readable")
    .select(AUDIT_LOG_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    // TODO(backend): replace with `.range()` server-side pagination when the list grows large
    .limit(500)

  if (rangeStart) {
    auditQuery = auditQuery.gte("created_at", rangeStart)
  }

  if (query.action !== "all") {
    auditQuery = auditQuery.eq("action", query.action)
  }

  const [{ data, count, error }, { data: authData }] = await Promise.all([
    auditQuery,
    supabase.auth.getUser(),
  ])

  if (error) {
    console.error("[getAuditLogData] audit_log_readable query failed", error)
  }

  const dbEntries =
    (data as AuditLogDbRow[] | null)
      ?.map(mapAuditLogDbRow)
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const entries =
    dbEntries.length > 0
      ? dbEntries
      : buildSampleAuditLogRows()

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: AuditLogMeta = {
    // TODO(backend): read from `term` where is_active = true
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }

  return {
    entries,
    totalCount: count ?? entries.length,
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
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: isAdmin ? "Admin Test Account" : appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
  }
}
