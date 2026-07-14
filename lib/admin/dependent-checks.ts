/**
 * Safe-deletion impact checks. Pattern from upb-cs-fsr-manager: count every
 * referencing row before a hard delete; blockers must be zero to proceed.
 * Server-only utility — NOT "use server".
 */
import "server-only"
import { lookupId } from "@/lib/lookups"
import type { ServiceClient } from "@/lib/admin/user-provision"

export interface DependentItem {
  key: string
  label: string
  count: number
  /** Extra guidance shown under the row, e.g. "Historical — never deleted." */
  hint?: string
}

export interface DeleteImpact {
  state: "blocked" | "clear"
  /** Set when the two-step gate fails (still active / not dropped / not archived). */
  lifecycleBlocked: string | null
  /** Referencing rows that must be zero. Never destroyed. */
  blockers: DependentItem[]
  /** Rows that WILL be removed together with the delete (shown as warning). */
  cascades: DependentItem[]
  notes: string[]
}

/** True when a Postgres FK violation bubbled up (the TOCTOU safety net). */
export function isForeignKeyViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23503"
}

async function countRows(
  service: ServiceClient,
  table: string,
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await service
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value)
  if (error) {
    console.error(`[dependent-checks] count ${table}.${column} failed`, error)
    // Fail SAFE: a count we couldn't verify blocks the delete.
    return Number.MAX_SAFE_INTEGER
  }
  return count ?? 0
}

function item(key: string, label: string, count: number, hint?: string): DependentItem | null {
  return count > 0 ? { key, label, count, hint } : null
}

function present(items: (DependentItem | null)[]): DependentItem[] {
  return items.filter((i): i is DependentItem => i !== null)
}

const HISTORICAL = "Historical record — never deleted."

/**
 * Every table referencing app_user (all FKs are NO ACTION). login_session is
 * handled separately by callers (operational — deleted with the account, not
 * a blocker), since it has no cascade and must be cleared before account delete.
 */
export async function getUserAccountBlockers(
  service: ServiceClient,
  userId: string
): Promise<DependentItem[]> {
  const [
    sections,
    enrollments,
    recordedEvents,
    appealsRequested,
    appealsResolved,
    appealMessages,
    legacyForms,
    roleChangesTarget,
    roleChangesActor,
    auditLogs,
    formReqs,
    formReqExclusions,
    formSubsReviewed,
  ] = await Promise.all([
    countRows(service, "section", "adviser_user_id", userId),
    countRows(service, "enrollment", "student_user_id", userId),
    countRows(service, "attendance_event", "recorded_by_user_id", userId),
    countRows(service, "appeal", "requester_user_id", userId),
    countRows(service, "appeal", "resolved_by_user_id", userId),
    countRows(service, "appeal_message", "sender_user_id", userId),
    countRows(service, "form", "uploaded_by_user_id", userId),
    countRows(service, "role_change", "target_user_id", userId),
    countRows(service, "role_change", "changed_by_user_id", userId),
    countRows(service, "audit_log", "actor_user_id", userId),
    countRows(service, "form_requirement", "created_by_user_id", userId),
    countRows(service, "form_requirement_exclusion", "created_by_user_id", userId),
    countRows(service, "form_submission", "reviewed_by_user_id", userId),
  ])
  return present([
    item(
      "sections",
      "Classes advised",
      sections,
      "Use Reassign to move each class to another facilitator."
    ),
    item("enrollments", "Class enrollments", enrollments),
    item(
      "attendance_events",
      "Attendance events recorded by this user",
      recordedEvents,
      HISTORICAL
    ),
    item("appeals_requested", "Requests submitted", appealsRequested, HISTORICAL),
    item(
      "appeals_resolved",
      "Requests resolved by this user",
      appealsResolved,
      HISTORICAL
    ),
    item("appeal_messages", "Request messages", appealMessages, HISTORICAL),
    item("legacy_forms", "Uploaded forms (legacy)", legacyForms, HISTORICAL),
    item(
      "role_changes",
      "Role-change audit entries",
      roleChangesTarget + roleChangesActor,
      HISTORICAL
    ),
    item("audit_logs", "Audit trail entries", auditLogs, HISTORICAL),
    item(
      "form_requirements",
      "Form requirements created",
      formReqs,
      HISTORICAL
    ),
    item(
      "form_requirement_exclusions",
      "Form-requirement exclusions created",
      formReqExclusions,
      HISTORICAL
    ),
    item(
      "form_submissions_reviewed",
      "Form submissions reviewed",
      formSubsReviewed,
      HISTORICAL
    ),
  ])
}

/**
 * History hanging off enrollments. qr_current_token CASCADEs (transient) so
 * it is surfaced as a cascade item by callers, not a blocker here.
 * form_submission CASCADEs at the DB level but is historical student work,
 * so it IS a blocker — historical data is never destroyed even when the FK
 * would technically allow the delete to proceed.
 */
export async function getEnrollmentHistoryBlockers(
  service: ServiceClient,
  enrollmentIds: string[]
): Promise<DependentItem[]> {
  if (enrollmentIds.length === 0) return []
  const countIn = async (table: string) => {
    const { count, error } = await service
      .from(table)
      .select("*", { count: "exact", head: true })
      .in("enrollment_id", enrollmentIds)
    if (error) {
      console.error(`[dependent-checks] count ${table} failed`, error)
      return Number.MAX_SAFE_INTEGER
    }
    return count ?? 0
  }
  const [sessions, events, appeals, submissions] = await Promise.all([
    countIn("attendance_session"),
    countIn("attendance_event"),
    countIn("appeal"),
    countIn("form_submission"),
  ])
  return present([
    item("attendance_sessions", "Attendance sessions", sessions, HISTORICAL),
    item("attendance_events", "Attendance events", events, HISTORICAL),
    item("appeals", "Requests / appeals", appeals, HISTORICAL),
    item("form_submissions", "Form submissions", submissions, HISTORICAL),
  ])
}

function toImpact(
  lifecycleBlocked: string | null,
  blockers: DependentItem[],
  cascades: DependentItem[] = [],
  notes: string[] = []
): DeleteImpact {
  return {
    state: lifecycleBlocked || blockers.length > 0 ? "blocked" : "clear",
    lifecycleBlocked,
    blockers,
    cascades,
    notes,
  }
}

export async function getStudentDeleteImpact(
  service: ServiceClient,
  enrollmentId: string
): Promise<{ impact: DeleteImpact; willDeleteAccount: boolean; studentUserId: string | null }> {
  const { data: enrollment } = await service
    .from("enrollment")
    .select("enrollment_id, student_user_id, status:enrollment_status_id(code)")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle()
  if (!enrollment) {
    return {
      impact: toImpact("Enrollment not found.", []),
      willDeleteAccount: false,
      studentUserId: null,
    }
  }
  const statusCode = (enrollment.status as { code?: string } | null)?.code
  const lifecycle =
    statusCode === "dropped"
      ? null
      : "Remove (drop) the student from the class first, then delete."
  const blockers = await getEnrollmentHistoryBlockers(service, [enrollmentId])

  const userId = enrollment.student_user_id as string
  let willDeleteAccount = false
  const notes: string[] = []
  if (!lifecycle && blockers.length === 0) {
    const [otherRes, accountBlockers, userRes] = await Promise.all([
      service
        .from("enrollment")
        .select("enrollment_id", { count: "exact", head: true })
        .eq("student_user_id", userId)
        .neq("enrollment_id", enrollmentId),
      getUserAccountBlockers(service, userId),
      service
        .from("app_user")
        .select("role:role_id(code)")
        .eq("app_user_id", userId)
        .maybeSingle(),
    ])
    const roleCode = (userRes.data?.role as { code?: string } | null)?.code
    willDeleteAccount =
      (otherRes.count ?? 0) === 0 && accountBlockers.length === 0 && roleCode === "student"
    notes.push(
      willDeleteAccount
        ? "The student's account and sign-in will also be permanently deleted."
        : "The account will be kept — other records still reference it."
    )
  }
  const cascades = [{ key: "qr_token", label: "Current QR token", count: 1 }]
  return {
    impact: toImpact(lifecycle, blockers, cascades, notes),
    willDeleteAccount,
    studentUserId: userId,
  }
}

export async function getAdviserDeleteImpact(
  service: ServiceClient,
  adviserUserId: string
): Promise<DeleteImpact> {
  const { data: user } = await service
    .from("app_user")
    .select("is_active, role:role_id(code)")
    .eq("app_user_id", adviserUserId)
    .maybeSingle()
  if (!user) return toImpact("Facilitator not found.", [])
  if ((user.role as { code?: string } | null)?.code === "admin") {
    return toImpact("Administrator accounts cannot be deleted here.", [])
  }
  const lifecycle = user.is_active ? "Deactivate this facilitator first, then delete." : null
  const blockers = await getUserAccountBlockers(service, adviserUserId)
  return toImpact(
    lifecycle,
    blockers,
    [],
    lifecycle ? [] : ["The sign-in account will also be permanently deleted."]
  )
}

export async function getSectionDeleteImpact(
  service: ServiceClient,
  sectionId: string
): Promise<DeleteImpact> {
  const { data: section } = await service
    .from("section")
    .select("section_id, status:section_status_id(code)")
    .eq("section_id", sectionId)
    .maybeSingle()
  if (!section) return toImpact("Class not found.", [])
  const statusCode = (section.status as { code?: string } | null)?.code
  const lifecycle =
    statusCode === "archived" || statusCode === "draft"
      ? null
      : "Archive this class first, then delete."

  const { data: enrollments } = await service
    .from("enrollment")
    .select("enrollment_id")
    .eq("section_id", sectionId)
  const enrollmentIds = (enrollments ?? []).map((e) => e.enrollment_id as string)

  const [historyBlockers, geofences, formReqsRes] = await Promise.all([
    getEnrollmentHistoryBlockers(service, enrollmentIds),
    countRows(service, "section_geofence", "section_id", sectionId),
    service.from("form_requirement").select("form_requirement_id").eq("section_id", sectionId),
  ])

  const reqIds = (formReqsRes.data ?? []).map((r) => r.form_requirement_id as string)
  let reqsWithSubs = 0
  if (reqIds.length > 0) {
    const { count } = await service
      .from("form_submission")
      .select("*", { count: "exact", head: true })
      .in("form_requirement_id", reqIds)
    reqsWithSubs = count ?? 0
  }

  const blockers = present([
    ...historyBlockers,
    item(
      "form_submissions_on_reqs",
      "Form submissions on this class's requirements",
      reqsWithSubs,
      HISTORICAL
    ),
  ])
  const cascades = present([
    item("enrollments", "Student enrollments (no history)", enrollmentIds.length),
    item("geofences", "GPS sites", geofences),
    item("form_requirements", "Class-specific form requirements", reqIds.length),
  ])
  return toImpact(lifecycle, blockers, cascades)
}

export async function getSiteDeleteImpact(
  service: ServiceClient,
  geofenceId: string
): Promise<DeleteImpact> {
  const { data: site } = await service
    .from("section_geofence")
    .select("is_active")
    .eq("section_geofence_id", geofenceId)
    .maybeSingle()
  if (!site) return toImpact("Site not found.", [])
  const lifecycle = site.is_active
    ? "Deactivate this site first (Edit Site → uncheck Active), then delete."
    : null
  // assigned_geofence_id is unwritten by the app today, but the FK + column
  // exist — defend against it anyway.
  const assigned = await countRows(service, "enrollment", "assigned_geofence_id", geofenceId)
  return toImpact(
    lifecycle,
    present([
      item(
        "assigned_students",
        "Students assigned to this site",
        assigned,
        "Clear these students' site assignment first."
      ),
    ])
  )
}
