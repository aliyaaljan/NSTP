"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  ENROLLMENT_LIST_SELECT,
  buildStudentListSummary,
  mapEnrollmentToStudentListRow,
  STUDENT_LIST_ALL_SECTIONS,
  type AdminCurrentUser,
  type EnrollmentListDbRow,
  type StudentEnrollmentLookups,
  type StudentListMeta,
  type StudentListPageData,
  type StudentListQuery,
  type StudentListSectionOption,
} from "@/lib/admin/student-list"
import {
  normalizeStudentFullName,
  validateStudentEditPayload,
  validateStudentCreatePayload,
  type StudentEditPayload,
  type StudentCreatePayload,
  type UpdateStudentResult,
  type CreateStudentResult,
} from "@/lib/admin/student-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { provisionUser, syncUserEmail, findAppUserByEmail } from "@/lib/admin/user-provision"
import { getFacilitatorPool } from "@/lib/admin/facilitator-pool"
import {
  getStudentDeleteImpact,
  isForeignKeyViolation,
  type DeleteImpact,
} from "@/lib/admin/dependent-checks"
import { mapRows, parseImportFile } from "@/lib/admin/import/parse"
import {
  getStudentImportLookups,
  type StudentImportLookups,
} from "@/lib/admin/import/lookups"
import {
  emptyCommitResult,
  isAcceptedImportFile,
  IMPORT_CHUNK_SIZE,
  type ErrorRow,
  type ImportCommitResult,
  type RowIssue,
} from "@/lib/admin/import/types"
import {
  STUDENT_IMPORT_COLUMNS,
  classifyStudentRow,
  studentRowToValues,
  suggestedPriorDecision,
  validateStudentImportValues,
  type ParseStudentImportResult,
  type PriorDecision,
  type RevalidateStudentRowsResult,
  type StudentCommitRow,
  type StudentImportRow,
  type StudentPreviewRow,
} from "@/lib/admin/student-import"
import {
  matchFacilitator,
  type FacilitatorMatch,
} from "@/lib/admin/import/facilitator-match"
import { normalizeKey } from "@/lib/admin/import/normalize"
import { ensureFacilitatorClass } from "@/lib/admin/class-provision"
import { formatClassLabel } from "@/lib/shared/class-label"

/** Academic year-level order for the Classification dropdown. */
const CLASSIFICATION_CODE_ORDER = ["freshman", "sophomore", "junior", "senior"]

const SEMESTER_LABELS: Record<string, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

function classificationRank(code: string): number {
  const idx = CLASSIFICATION_CODE_ORDER.indexOf(code)
  return idx === -1 ? CLASSIFICATION_CODE_ORDER.length : idx
}

/**
 * Fetches everything the admin student list page needs.
 *
 * Backend checklist:
 * 1. Keep returning `StudentListPageData` — no UI changes required.
 * 2. Add term scoping (`term.is_active`) on `section` / `enrollment` if needed.
 * 3. Move `filterStudentListRows()` logic into SQL when the list grows large.
 * 4. Replace hardcoded `meta` with a `term` table lookup.
 */
export async function getStudentListData(
  query: StudentListQuery
): Promise<StudentListPageData> {
  const role = await getAppUserRole()
  if (role !== "admin") throw new Error("Unauthorized")

  const supabase = await createSupabaseServerClient()
  const statusId = await lookupId(
    "enrollment_status",
    query.view === "dropped" ? "dropped" : "active"
  )

  let enrollmentQuery = supabase
    .from("enrollment")
    .select(ENROLLMENT_LIST_SELECT)
    .eq("enrollment_status_id", statusId)
    .order("joined_at", { ascending: true })

  // Server-side section filter — backend can extend with adviser, term, etc.
  if (query.sectionId !== STUDENT_LIST_ALL_SECTIONS) {
    enrollmentQuery = enrollmentQuery.eq("section_id", query.sectionId)
  }

  const [
    enrollmentsRes,
    sectionsRes,
    programsRes,
    classificationsRes,
    enlistmentRes,
    termsRes,
    { data: authData },
  ] = await Promise.all([
    enrollmentQuery,
    // Add/Edit Student may only enroll into an active-term, non-archived class.
    supabase
      .from("section")
      .select(
        "section_id, course_code, adviser_user_id, term:term_id!inner(school_year, is_active), app_user:adviser_user_id(full_name), status:section_status_id!inner(code)"
      )
      .eq("term.is_active", true)
      .neq("status.code", "archived"),
    supabase.from("program").select("program_id, code, name").order("code"),
    supabase.from("student_classification").select("student_classification_id, code, name"),
    supabase.from("enlistment_status").select("enlistment_status_id, code, name"),
    supabase
      .from("term")
      .select("school_year, semester, is_active")
      .order("school_year", { ascending: false }),
    supabase.auth.getUser(),
  ])
  const activeTerm = (termsRes.data ?? []).find((t) => t.is_active) ?? termsRes.data?.[0]

  if (enrollmentsRes.error) {
    console.error("[getStudentListData] enrollment query failed", enrollmentsRes.error)
  }

  const students =
    (enrollmentsRes.data as EnrollmentListDbRow[] | null)
      ?.map(mapEnrollmentToStudentListRow)
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const sections: StudentListSectionOption[] = ((sectionsRes.data ?? []) as unknown as {
    section_id: string
    course_code: string
    adviser_user_id: string | null
    term: { school_year: string } | null
    app_user: { full_name: string } | null
  }[])
    .map((section) => ({
      sectionId: section.section_id,
      label: formatClassLabel({
        courseCode: section.course_code,
        facilitatorName: section.app_user?.full_name,
        schoolYear: section.term?.school_year,
      }),
      courseCode: section.course_code,
      adviserUserId: section.adviser_user_id,
      adviserName: section.app_user?.full_name ?? "Unassigned",
      schoolYear: section.term?.school_year ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  for (const [label, res] of [
    ["program", programsRes],
    ["student_classification", classificationsRes],
    ["enlistment_status", enlistmentRes],
  ] as const) {
    if (res.error) console.error(`[getStudentListData] ${label} lookup failed`, res.error)
  }

  const lookups: StudentEnrollmentLookups = {
    programs: ((programsRes.data ?? []) as { program_id: string; code: string; name: string }[]).map(
      (p) => ({ id: p.program_id, label: `${p.code} — ${p.name}` })
    ),
    classifications: ((classificationsRes.data ?? []) as {
      student_classification_id: string
      code: string
      name: string
    }[])
      // Academic year-level order — row order in the lookup table is not guaranteed.
      .sort((a, b) => classificationRank(a.code) - classificationRank(b.code))
      .map((c) => ({ id: c.student_classification_id, label: c.name })),
    enlistmentStatuses: ((enlistmentRes.data ?? []) as {
      enlistment_status_id: string
      code: string
      name: string
    }[]).map((e) => ({ id: e.enlistment_status_id, label: e.name })),
  }

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: StudentListMeta = {
    academicYear: activeTerm?.school_year ?? "2025-2026",
    semester: SEMESTER_LABELS[activeTerm?.semester ?? "second"] ?? "2nd Semester",
  }

  return {
    students,
    sections,
    lookups,
    summary: buildStudentListSummary(students),
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
    return { name: "Admin", role: "NSTP Admin" }
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, avatar_url, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Admin", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
    avatarUrl: (appUser as any).avatar_url ?? undefined,
  }
}

/**
 * Create a new student account and enrollment.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Create auth user + `app_user` (role = student) with full_name, email, student_number.
 * 3. Create `enrollment` for the active term with section_id and status = active.
 * 4. Return `{ ok: true }` on success.
 */
export async function createStudent(
  payload: StudentCreatePayload
): Promise<CreateStudentResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateStudentCreatePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()

  const activeStatusId = await lookupId("enrollment_status", "active")

  const provisioned = await provisionUser(service, {
    email: payload.email,
    fullName: normalizeStudentFullName(payload.fullName),
    roleCode: "student",
    studentNumber: payload.studentNumber,
    saisId: payload.saisId,
  })
  if (!provisioned.ok) return provisioned

  const { error: enrollError } = await service.from("enrollment").insert({
    section_id: payload.sectionId,
    student_user_id: provisioned.userId,
    // enrollment_status_id = lifecycle (active); enlistment_status_id = optional import metadata.
    enrollment_status_id: activeStatusId,
    program_id: payload.programId ?? null,
    student_classification_id: payload.studentClassificationId ?? null,
    enlistment_status_id: payload.enlistmentStatusId ?? null,
  })

  if (enrollError) {
    console.error("[createStudent] enrollment insert failed", enrollError)
    // Roll back the freshly created account so a failed add can be retried cleanly.
    await service.from("app_user").delete().eq("app_user_id", provisioned.userId)
    await service.auth.admin.deleteUser(provisioned.userId)
    if (enrollError.message.includes("active enrollment")) {
      return {
        ok: false,
        error: "This student already has an active enrollment in another section.",
      }
    }
    return { ok: false, error: "Failed to enroll the student." }
  }

  return { ok: true }
}

/**
 * Update a student profile and section assignment.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Update `app_user` SET full_name, email, student_number WHERE app_user_id = studentUserId.
 * 3. Update `enrollment` SET section_id WHERE enrollment_id = enrollmentId.
 * 4. If email changes, sync `auth.users` email via Supabase Admin API if needed.
 * 5. Return `{ ok: true }` on success.
 */
export async function updateStudent(
  payload: StudentEditPayload
): Promise<UpdateStudentResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateStudentEditPayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()

  const { data: current, error: currentError } = await service
    .from("app_user")
    .select("email")
    .eq("app_user_id", payload.studentUserId)
    .maybeSingle()

  if (currentError || !current) {
    console.error("[updateStudent] target lookup failed", currentError)
    return { ok: false, error: "Student not found." }
  }

  // The enrollment and student ids are submitted independently — verify they
  // actually belong together before mutating either one.
  const { data: enrollment, error: enrollmentError } = await service
    .from("enrollment")
    .select("student_user_id, section_id, program_id, student_classification_id, enlistment_status_id")
    .eq("enrollment_id", payload.enrollmentId)
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    console.error("[updateStudent] enrollment lookup failed", enrollmentError)
    return { ok: false, error: "Enrollment not found." }
  }
  if (enrollment.student_user_id !== payload.studentUserId) {
    return { ok: false, error: "Enrollment does not match the student." }
  }

  const nextEmail = payload.email.trim().toLowerCase()

  // app_user commits FIRST: a 23505 (duplicate email) fails cleanly here with
  // nothing else touched, instead of leaving auth.users ahead of app_user.
  const { error: userError } = await service
    .from("app_user")
    .update({
      full_name: normalizeStudentFullName(payload.fullName),
      email: nextEmail,
      student_number: payload.studentNumber?.trim() || null,
      sais_id: payload.saisId?.trim() || null,
    })
    .eq("app_user_id", payload.studentUserId)

  if (userError) {
    console.error("[updateStudent] app_user update failed", userError)
    if ((userError as { code?: string }).code === "23505") {
      return { ok: false, error: "That email is already in use." }
    }
    return { ok: false, error: "Failed to update the student." }
  }

  // auth email sync AFTER; revert app_user.email if auth rejects it, so the
  // two never end up out of lockstep.
  if (nextEmail !== (current.email ?? "").toLowerCase()) {
    const emailResult = await syncUserEmail(service, payload.studentUserId, nextEmail)
    if (!emailResult.ok) {
      await service
        .from("app_user")
        .update({ email: current.email })
        .eq("app_user_id", payload.studentUserId)
      return emailResult
    }
  }

  const enrollmentUpdates: Record<string, string | null> = {}
  if (enrollment.section_id !== payload.sectionId) {
    enrollmentUpdates.section_id = payload.sectionId
  }
  if ((enrollment.program_id ?? null) !== payload.programId) {
    enrollmentUpdates.program_id = payload.programId
  }
  if ((enrollment.student_classification_id ?? null) !== payload.studentClassificationId) {
    enrollmentUpdates.student_classification_id = payload.studentClassificationId
  }
  if ((enrollment.enlistment_status_id ?? null) !== payload.enlistmentStatusId) {
    enrollmentUpdates.enlistment_status_id = payload.enlistmentStatusId
  }

  if (Object.keys(enrollmentUpdates).length > 0) {
    const { error: enrollUpdateError } = await service
      .from("enrollment")
      .update(enrollmentUpdates)
      .eq("enrollment_id", payload.enrollmentId)

    if (enrollUpdateError) {
      console.error("[updateStudent] enrollment update failed", enrollUpdateError)
      // A unique violation can only come from a section move, never from the metadata FKs.
      if ((enrollUpdateError as { code?: string }).code === "23505") {
        return { ok: false, error: "This student already has an enrollment in that section." }
      }
      return { ok: false, error: "Failed to update the enrollment." }
    }
  }

  return { ok: true }
}

/**
 * Disable step (two-step lifecycle): sets the enrollment's status to
 * `dropped`. The `app_user` account and all attendance/audit history are
 * kept — nothing is hard-deleted. Hard delete is a separate, later step
 * (`hardDeleteStudent`) available only once the enrollment is dropped and
 * has no history.
 */
export async function deleteStudent(
  enrollmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  if (!enrollmentId) {
    return { ok: false, error: "Enrollment ID is required." }
  }

  const service = createSupabaseServiceClient()
  const droppedStatusId = await lookupId("enrollment_status", "dropped")

  const { error } = await service
    .from("enrollment")
    .update({ enrollment_status_id: droppedStatusId })
    .eq("enrollment_id", enrollmentId)

  if (error) {
    console.error("[deleteStudent] enrollment update failed", error)
    return { ok: false, error: "Failed to remove the student from the section." }
  }

  return { ok: true }
}

export async function getStudentDeleteImpactAction(
  enrollmentId: string
): Promise<
  | { ok: true; impact: DeleteImpact; willDeleteAccount: boolean }
  | { ok: false; error: string }
> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  const service = createSupabaseServiceClient()
  const { impact, willDeleteAccount } = await getStudentDeleteImpact(service, enrollmentId)
  return { ok: true, impact, willDeleteAccount }
}

/**
 * Hard step: only dropped enrollments, and only once no attendance/appeal/
 * form-submission history exists on it. When the account has no other
 * enrollments and no other historical references, the `app_user` and
 * `auth.users` rows are deleted too (a mistaken import, never logged in).
 */
export async function hardDeleteStudent(
  enrollmentId: string
): Promise<{ ok: true; accountDeleted: boolean } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  if (!enrollmentId) return { ok: false, error: "Enrollment ID is required." }

  const service = createSupabaseServiceClient()

  // Re-run the full check server-side — never trust the modal's earlier fetch.
  const { impact, willDeleteAccount, studentUserId } = await getStudentDeleteImpact(
    service,
    enrollmentId
  )
  if (impact.state === "blocked") {
    return {
      ok: false,
      error:
        impact.lifecycleBlocked ??
        "Cannot delete: this student has attendance or request history, which is never deleted.",
    }
  }

  const { error } = await service.from("enrollment").delete().eq("enrollment_id", enrollmentId)
  if (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Cannot delete: other records still reference this enrollment." }
    }
    console.error("[hardDeleteStudent] enrollment delete failed", error)
    return { ok: false, error: "Failed to delete the student." }
  }

  if (willDeleteAccount && studentUserId) {
    // login_session has no cascade — clear it first (operational, not historical).
    await service.from("login_session").delete().eq("app_user_id", studentUserId)
    const { error: userError } = await service
      .from("app_user")
      .delete()
      .eq("app_user_id", studentUserId)
    if (userError) {
      console.error("[hardDeleteStudent] app_user delete failed", userError)
      return { ok: true, accountDeleted: false } // enrollment is gone; report honestly
    }
    const { error: authError } = await service.auth.admin.deleteUser(studentUserId)
    if (authError && authError.status !== 404) {
      console.error("[hardDeleteStudent] auth delete failed", authError)
    }
    return { ok: true, accountDeleted: true }
  }

  return { ok: true, accountDeleted: false }
}

/** Max upload size; also bounded by Next's 1 MB server-action body limit. */
const IMPORT_MAX_FILE_BYTES = 1024 * 1024

function warnUnknownStudentLookups(
  row: StudentImportRow,
  lookups: StudentImportLookups,
  issues: RowIssue[]
) {
  if (row.program && !lookups.program(row.program)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown program "${row.program}" — will be left blank.`,
      severity: "warning",
      code: "unknown_program",
    })
  }
  if (row.classification && !lookups.classification(row.classification)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown classification "${row.classification}" — will be left blank.`,
      severity: "warning",
      code: "unknown_classification",
    })
  }
  if (row.enlistmentStatus && !lookups.enlistment(row.enlistmentStatus)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown enlistment status "${row.enlistmentStatus}" — will be left blank.`,
      severity: "warning",
      code: "unknown_enlistment_status",
    })
  }
}

/**
 * Active-term facilitator targets for the student import: every facilitator
 * account plus (when it already exists) their single class for the term.
 */
interface FacilitatorTarget {
  userId: string
  fullName: string
  sectionId: string | null
  courseCode: string | null
}

async function getFacilitatorTargets(
  service: ReturnType<typeof createSupabaseServiceClient>,
  termId: string
): Promise<FacilitatorTarget[]> {
  const pool = await getFacilitatorPool(service, termId)
  // Active advisers (whether or not they own a class yet) + every class owner
  // this term (covers admins facilitating a class, and inactive advisers who
  // still own a class).
  return pool
    .filter((m) => m.sectionId !== null || (m.roleCode === "adviser" && m.isActive))
    .map((m) => ({
      userId: m.userId,
      fullName: m.fullName,
      sectionId: m.sectionId,
      courseCode: m.courseCode,
    }))
}

function facilitatorMatchIssue(
  facilitator: string,
  match: Extract<FacilitatorMatch, { ok: false }>,
  rowNumber: number
): RowIssue {
  if (match.reason === "not_found") {
    return {
      rowNumber,
      message: `Facilitator "${facilitator}" not found — import the facilitators file first or fix the name.`,
      severity: "error",
      code: "facilitator_not_found",
      field: "facilitator",
    }
  }
  const names = match.matches.map((m) => m.fullName).join(", ")
  return {
    rowNumber,
    message: `Facilitator "${facilitator}" matches several accounts (${names}) — make the name in the file more specific.`,
    severity: "error",
    code: "facilitator_ambiguous",
    field: "facilitator",
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/** Batched app_user lookup by email — one query per 200 emails, not one per row. */
async function fetchStudentAccounts(
  service: ReturnType<typeof createSupabaseServiceClient>,
  emails: string[]
): Promise<Map<string, { appUserId: string; roleCode: string | null }>> {
  const result = new Map<string, { appUserId: string; roleCode: string | null }>()
  for (const emailChunk of chunkArray(emails, 200)) {
    const { data, error } = await service
      .from("app_user")
      .select("app_user_id, email, role:role_id(code)")
      .in("email", emailChunk)
    if (error) {
      console.error("[fetchStudentAccounts] query failed", error)
      continue
    }
    for (const row of data ?? []) {
      const roleCode = (row.role as { code?: string } | null)?.code ?? null
      result.set(row.email, { appUserId: row.app_user_id, roleCode })
    }
  }
  return result
}

interface ActiveEnrollmentInfo {
  enrollmentId: string
  sectionId: string
  termId: string
  classLabel: string
  termName: string
  hoursEarned: number
  hoursRequired: number
  suggested: PriorDecision
  currentFacilitatorName: string
}

interface EnrollmentInfoDbRow {
  enrollment_id: string
  student_user_id: string
  section_id: string
  section: {
    course_code: string
    required_hour_total: number | null
    term_id: string
    term: { name: string; school_year: string } | null
    app_user: { full_name: string } | null
  } | null
  attendance_session: Array<{
    duration_minute: number | null
    attendance_session_status: { code: string } | { code: string }[] | null
  }> | null
}

/** Batched active-enrollment + hours lookup, keyed by student_user_id.
 * Hours math mirrors mapEnrollmentToStudentListRow (lib/admin/student-list.ts). */
async function fetchActiveEnrollments(
  service: ReturnType<typeof createSupabaseServiceClient>,
  userIds: string[]
): Promise<Map<string, ActiveEnrollmentInfo>> {
  const result = new Map<string, ActiveEnrollmentInfo>()
  if (userIds.length === 0) return result
  const activeStatusId = await lookupId("enrollment_status", "active")

  for (const idChunk of chunkArray(userIds, 200)) {
    const { data, error } = await service
      .from("enrollment")
      .select(
        `enrollment_id, student_user_id, section_id,
         section:section_id(course_code, required_hour_total, term_id,
           term:term_id(name, school_year), app_user:adviser_user_id(full_name)),
         attendance_session(duration_minute, attendance_session_status(code))`
      )
      .eq("enrollment_status_id", activeStatusId)
      .in("student_user_id", idChunk)
    if (error) {
      console.error("[fetchActiveEnrollments] query failed", error)
      continue
    }
    for (const row of (data ?? []) as unknown as EnrollmentInfoDbRow[]) {
      const section = row.section
      if (!section) continue
      const hoursRequired = section.required_hour_total ?? 60
      const minutes =
        row.attendance_session?.reduce((sum, s) => {
          const st = Array.isArray(s.attendance_session_status)
            ? s.attendance_session_status[0]
            : s.attendance_session_status
          return st?.code === "closed" || st?.code === "corrected"
            ? sum + (s.duration_minute ?? 0)
            : sum
        }, 0) ?? 0
      const hoursEarned = Math.round(minutes / 60)
      result.set(row.student_user_id, {
        enrollmentId: row.enrollment_id,
        sectionId: row.section_id,
        termId: section.term_id,
        classLabel: formatClassLabel({
          courseCode: section.course_code,
          facilitatorName: section.app_user?.full_name,
          schoolYear: section.term?.school_year,
        }),
        termName: section.term?.name ?? "",
        hoursEarned,
        hoursRequired,
        suggested: suggestedPriorDecision(hoursEarned, hoursRequired),
        currentFacilitatorName: section.app_user?.full_name ?? "Unassigned",
      })
    }
  }
  return result
}

interface StudentRowPipelineResult {
  previewRows: StudentPreviewRow[]
  errorRows: ErrorRow[]
  issues: RowIssue[]
}

/**
 * Shared validate → match → classify pipeline used by both parseStudentImport
 * (phase 1, all rows) and revalidateStudentRows (inline-fix re-check, a
 * handful of rows) — kept as one function so the two paths cannot drift.
 */
async function runStudentRowPipeline(
  service: ReturnType<typeof createSupabaseServiceClient>,
  rows: { rowNumber: number; values: Record<string, string> }[],
  activeTermId: string
): Promise<StudentRowPipelineResult> {
  const [lookups, targets] = await Promise.all([
    getStudentImportLookups(service),
    getFacilitatorTargets(service, activeTermId),
  ])

  const issues: RowIssue[] = []
  const errorRows: ErrorRow[] = []
  const validated: {
    row: StudentImportRow
    targetSectionId: string | null
    targetFacilitatorName: string
    targetCourseCode: string | null
  }[] = []
  const seenEmails = new Map<string, number>()

  for (const { rowNumber, values } of rows) {
    const v = validateStudentImportValues(values, rowNumber)
    if (!v.row) {
      issues.push(...v.issues)
      errorRows.push({ rowNumber, values, issues: v.issues })
      continue
    }
    const match = matchFacilitator(v.row.facilitator, targets)
    if (!match.ok) {
      const issue = facilitatorMatchIssue(v.row.facilitator, match, rowNumber)
      issues.push(issue)
      errorRows.push({ rowNumber, values, issues: [issue] })
      continue
    }
    const target = targets.find((t) => t.userId === match.userId)!
    warnUnknownStudentLookups(v.row, lookups, issues)

    const email = v.row.email
    const firstRow = seenEmails.get(email)
    if (firstRow !== undefined) {
      issues.push({
        rowNumber,
        message: `${email} also appears in row ${firstRow} — the later row wins.`,
        severity: "warning",
        code: "duplicate_email_in_file",
        field: "email",
      })
    } else {
      seenEmails.set(email, rowNumber)
    }

    validated.push({
      row: v.row,
      targetSectionId: target.sectionId,
      targetFacilitatorName: target.fullName,
      targetCourseCode: target.courseCode,
    })
  }

  if (validated.length === 0) {
    return { previewRows: [], errorRows, issues }
  }

  const emails = [...new Set(validated.map((v) => v.row.email))]
  const accounts = await fetchStudentAccounts(service, emails)
  const userIds = [...accounts.values()].map((a) => a.appUserId)
  const enrollments = await fetchActiveEnrollments(service, userIds)

  const previewRows: StudentPreviewRow[] = []
  for (const v of validated) {
    const account = accounts.get(v.row.email)
    if (account?.roleCode && account.roleCode !== "student") {
      const issue: RowIssue = {
        rowNumber: v.row.rowNumber,
        message: `${v.row.email} belongs to a non-student account — skipped.`,
        severity: "error",
        code: "non_student_account",
      }
      issues.push(issue)
      errorRows.push({
        rowNumber: v.row.rowNumber,
        values: studentRowToValues(v.row),
        issues: [issue],
      })
      continue
    }

    const activeEnrollment = account ? (enrollments.get(account.appUserId) ?? null) : null
    const kind = classifyStudentRow({
      accountExists: Boolean(account),
      activeEnrollment: activeEnrollment
        ? { sectionId: activeEnrollment.sectionId, termId: activeEnrollment.termId }
        : null,
      targetSectionId: v.targetSectionId,
      activeTermId,
    })

    const preview: StudentPreviewRow = { row: v.row, kind }
    if (kind === "returning" && activeEnrollment) {
      preview.prior = {
        enrollmentId: activeEnrollment.enrollmentId,
        classLabel: activeEnrollment.classLabel,
        termName: activeEnrollment.termName,
        hoursEarned: activeEnrollment.hoursEarned,
        hoursRequired: activeEnrollment.hoursRequired,
        suggested: activeEnrollment.suggested,
      }
    } else if (kind === "conflict" && activeEnrollment) {
      preview.conflict = {
        enrollmentId: activeEnrollment.enrollmentId,
        currentClassLabel: activeEnrollment.classLabel,
        currentFacilitatorName: activeEnrollment.currentFacilitatorName,
        targetClassLabel: v.targetSectionId
          ? formatClassLabel({
              courseCode: v.targetCourseCode,
              facilitatorName: v.targetFacilitatorName,
            })
          : null,
      }
    }

    if (
      v.row.courseCode &&
      v.targetCourseCode &&
      normalizeKey(v.row.courseCode) !== normalizeKey(v.targetCourseCode)
    ) {
      issues.push({
        rowNumber: v.row.rowNumber,
        message: `Course Code "${v.row.courseCode}" differs from the class's "${v.targetCourseCode}" — enrolled anyway.`,
        severity: "warning",
        code: "course_code_mismatch",
      })
    }

    previewRows.push(preview)
  }

  return { previewRows, errorRows, issues }
}

/**
 * Phase 1 of the student import: parse + validate, no writes.
 * Accepts the NSTP office metadata file (.csv or .xlsx) as-is; each row's
 * Facilitator must uniquely match a facilitator account. Classifies each
 * valid row against the student's current account/enrollment state so the
 * preview UI can show returning-student and same-term-conflict decisions.
 */
export async function parseStudentImport(
  formData: FormData
): Promise<ParseStudentImportResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a .csv or .xlsx file to import." }
  }
  if (!isAcceptedImportFile(file.name)) {
    return { ok: false, error: "Only .csv and .xlsx files are accepted." }
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large (max 1 MB)." }
  }

  let table
  try {
    table = await parseImportFile(file)
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read the file.",
    }
  }

  const { rows, missingHeaders } = mapRows(table, STUDENT_IMPORT_COLUMNS)
  if (missingHeaders.length > 0) {
    return { ok: false, error: `Missing required column(s): ${missingHeaders.join(", ")}.` }
  }
  if (rows.length === 0) {
    return { ok: false, error: "The file has no data rows." }
  }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  const [pipeline, targets] = await Promise.all([
    runStudentRowPipeline(service, rows, termId),
    getFacilitatorTargets(service, termId),
  ])

  const facilitatorOptions = targets
    .map((t) => ({ userId: t.userId, fullName: t.fullName }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  return {
    ok: true,
    totalRows: rows.length,
    previewRows: pipeline.previewRows,
    errorRows: pipeline.errorRows,
    issues: pipeline.issues,
    facilitatorOptions,
  }
}

/**
 * Re-runs the parse pipeline for a handful of rows whose values were edited
 * inline in the preview (e.g. a fixed email or a facilitator picked from the
 * dropdown) — lets the admin fix errors without re-uploading the whole file.
 */
export async function revalidateStudentRows(input: {
  rows: { rowNumber: number; values: Record<string, string> }[]
}): Promise<RevalidateStudentRowsResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { ok: false, error: "No rows to re-check." }
  }
  if (input.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `Send at most ${IMPORT_CHUNK_SIZE} rows per request.` }
  }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  const pipeline = await runStudentRowPipeline(service, input.rows, termId)
  return { ok: true, ...pipeline }
}

async function getActiveTermId(
  service: ReturnType<typeof createSupabaseServiceClient>
): Promise<string | null> {
  const { data } = await service
    .from("term")
    .select("term_id")
    .eq("is_active", true)
    .maybeSingle()
  return data?.term_id ?? null
}

interface ActiveEnrollmentCommitRow {
  enrollment_id: string
  section_id: string
  section: {
    term_id: string
    course_code: string
    app_user: { full_name: string } | null
  } | null
}

/**
 * Phase 2 of the student import: upsert one chunk of rows. Each row's section
 * is resolved from its matched facilitator's single active-term class
 * (get-or-created when the facilitator has none yet). Re-verifies the
 * student's active enrollment AT COMMIT TIME (never trusts the client's
 * parse-phase classification) and applies the row's `priorDecision` /
 * `conflictDecision` if one is needed.
 * Idempotent — re-running the same file updates rather than duplicates.
 * Never changes is_active on existing users.
 */
export async function commitStudentImportChunk(input: {
  rows: StudentCommitRow[]
}): Promise<{ ok: true; result: ImportCommitResult } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!Array.isArray(input.rows)) return { ok: false, error: "Invalid rows payload." }
  if (input.rows.length === 0) return { ok: true, result: emptyCommitResult() }
  if (input.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `Send at most ${IMPORT_CHUNK_SIZE} rows per request.` }
  }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  const [lookups, targets, activeStatusId, completedStatusId, droppedStatusId] =
    await Promise.all([
      getStudentImportLookups(service),
      getFacilitatorTargets(service, termId),
      lookupId("enrollment_status", "active"),
      lookupId("enrollment_status", "completed"),
      lookupId("enrollment_status", "dropped"),
    ])
  // Facilitator userId → their class, filled lazily for classes created mid-chunk.
  const classCache = new Map<string, { sectionId: string; courseCode: string | null }>()
  for (const target of targets) {
    if (target.sectionId) {
      classCache.set(target.userId, {
        sectionId: target.sectionId,
        courseCode: target.courseCode,
      })
    }
  }
  const result = emptyCommitResult()

  for (const raw of input.rows) {
    // Phase-1 output is client-held: re-validate and re-normalize everything.
    const validated = validateStudentImportValues(
      {
        course_code: raw.courseCode ?? "",
        student_number: raw.studentNumber ?? "",
        sais_id: raw.saisId ?? "",
        full_name: raw.fullName ?? "",
        email: raw.email ?? "",
        enlistment_status: raw.enlistmentStatus ?? "",
        program: raw.program ?? "",
        classification: raw.classification ?? "",
        facilitator: raw.facilitator ?? "",
      },
      raw.rowNumber ?? 0
    )
    if (!validated.row) {
      result.skipped += 1
      result.issues.push(...validated.issues)
      continue
    }
    const row = validated.row

    // Resolve the row's section from its facilitator.
    const match = matchFacilitator(row.facilitator, targets)
    if (!match.ok) {
      result.skipped += 1
      result.issues.push(facilitatorMatchIssue(row.facilitator, match, row.rowNumber))
      continue
    }
    let facilitatorClass = classCache.get(match.userId)
    if (!facilitatorClass) {
      const ensured = await ensureFacilitatorClass(service, match.userId)
      if (!ensured.ok) {
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Could not resolve the facilitator's class: ${ensured.error}`,
          severity: "error",
          code: "class_provision_failed",
        })
        continue
      }
      facilitatorClass = { sectionId: ensured.sectionId, courseCode: null }
      classCache.set(match.userId, facilitatorClass)
    }
    const sectionId = facilitatorClass.sectionId
    if (
      row.courseCode &&
      facilitatorClass.courseCode &&
      normalizeKey(row.courseCode) !== normalizeKey(facilitatorClass.courseCode)
    ) {
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `Course Code "${row.courseCode}" differs from the class's "${facilitatorClass.courseCode}" — enrolled anyway.`,
        severity: "warning",
        code: "course_code_mismatch",
      })
    }

    const existing = await findAppUserByEmail(service, row.email)
    let studentUserId: string

    if (!existing) {
      const provisioned = await provisionUser(service, {
        email: row.email,
        fullName: row.fullName,
        roleCode: "student",
        studentNumber: row.studentNumber,
        saisId: row.saisId || null,
      })
      if (!provisioned.ok) {
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: provisioned.error,
          severity: "error",
          code: "account_create_failed",
        })
        continue
      }
      studentUserId = provisioned.userId
    } else if (existing.roleCode !== "student") {
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `${row.email} belongs to a non-student account — skipped.`,
        severity: "error",
        code: "non_student_account",
      })
      continue
    } else {
      studentUserId = existing.appUserId
      const updates: Record<string, string> = {}
      if (existing.fullName !== row.fullName) updates.full_name = row.fullName
      if ((existing.studentNumber ?? "") !== row.studentNumber) {
        updates.student_number = row.studentNumber
      }
      if (row.saisId && (existing.saisId ?? "") !== row.saisId) updates.sais_id = row.saisId
      if (Object.keys(updates).length > 0) {
        const { error } = await service
          .from("app_user")
          .update(updates)
          .eq("app_user_id", studentUserId)
        if (error) {
          console.error("[commitStudentImportChunk] app_user update failed", error)
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Failed to update ${row.email}'s profile info.`,
            severity: "warning",
            code: "profile_update_failed",
          })
        }
      }
    }

    const metadata = {
      program_id: row.program ? lookups.program(row.program) : null,
      student_classification_id: row.classification
        ? lookups.classification(row.classification)
        : null,
      enlistment_status_id: row.enlistmentStatus
        ? lookups.enlistment(row.enlistmentStatus)
        : null,
    }

    // Re-query the student's active enrollment AT COMMIT TIME — never trust
    // the client's parse-phase `kind` classification, which may be stale.
    const { data: activeEnrollmentRow } = await service
      .from("enrollment")
      .select(
        "enrollment_id, section_id, section:section_id(term_id, course_code, app_user:adviser_user_id(full_name))"
      )
      .eq("student_user_id", studentUserId)
      .eq("enrollment_status_id", activeStatusId)
      .maybeSingle()
    const activeEnrollment = activeEnrollmentRow as unknown as ActiveEnrollmentCommitRow | null

    if (!activeEnrollment) {
      // No active enrollment anywhere — insert, or reactivate an archived one.
      const { data: existingEnrollment } = await service
        .from("enrollment")
        .select("enrollment_id")
        .eq("student_user_id", studentUserId)
        .eq("section_id", sectionId)
        .maybeSingle()

      if (existingEnrollment) {
        // Archived (dropped/completed) enrollment in this section — reactivate it.
        // Safe w.r.t. the one-active-enrollment trigger: this branch is only
        // reached when the student has no active enrollment anywhere.
        const { error } = await service
          .from("enrollment")
          .update({ enrollment_status_id: activeStatusId, ...metadata })
          .eq("enrollment_id", existingEnrollment.enrollment_id)
        if (error) {
          console.error("[commitStudentImportChunk] enrollment reactivation failed", error)
          result.skipped += 1
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Failed to enroll ${row.email}.`,
            severity: "error",
            code: "enroll_failed",
          })
        } else {
          result.imported += 1
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Re-activated ${row.email}'s previous enrollment in this section.`,
            severity: "info",
            code: "reactivated",
          })
        }
      } else {
        const { error } = await service.from("enrollment").insert({
          section_id: sectionId,
          student_user_id: studentUserId,
          enrollment_status_id: activeStatusId,
          ...metadata,
        })
        if (error) {
          console.error("[commitStudentImportChunk] enrollment insert failed", error)
          result.skipped += 1
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Failed to enroll ${row.email}.`,
            severity: "error",
            code: "enroll_failed",
          })
        } else {
          result.imported += 1
        }
      }
      continue
    }

    if (activeEnrollment.section_id === sectionId) {
      // Already enrolled in the target class — just refresh metadata.
      const { error } = await service
        .from("enrollment")
        .update(metadata)
        .eq("enrollment_id", activeEnrollment.enrollment_id)
      if (error) {
        console.error("[commitStudentImportChunk] enrollment update failed", error)
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Failed to update ${row.email}'s enrollment.`,
          severity: "error",
          code: "enroll_failed",
        })
      } else {
        result.updated += 1
      }
      continue
    }

    const activeEnrollmentTermId = activeEnrollment.section?.term_id ?? null

    if (activeEnrollmentTermId === termId) {
      // CONFLICT — active enrollment this term under another facilitator.
      if (raw.conflictDecision === "move") {
        const { error } = await service
          .from("enrollment")
          .update({ section_id: sectionId, ...metadata })
          .eq("enrollment_id", activeEnrollment.enrollment_id)
        if (error) {
          console.error("[commitStudentImportChunk] conflict move failed", error)
          result.skipped += 1
          result.issues.push({
            rowNumber: row.rowNumber,
            message:
              (error as { code?: string }).code === "23505"
                ? `${row.email} has an archived enrollment in the target class — move them via Edit Student.`
                : `Failed to move ${row.email} to the new class.`,
            severity: "error",
            code: "conflict_move_blocked",
          })
        } else {
          result.updated += 1
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Moved ${row.email} to this class.`,
            severity: "info",
            code: "moved_section",
          })
        }
      } else {
        result.skipped += 1
        const currentFacilitatorName =
          activeEnrollment.section?.app_user?.full_name ?? "their current facilitator"
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `${row.email} kept with ${currentFacilitatorName} — not moved.`,
          severity: "info",
          code: "kept_current",
        })
      }
      continue
    }

    // RETURNING — active enrollment from a prior term.
    if (raw.priorDecision !== "complete" && raw.priorDecision !== "drop") {
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `${row.email} has an active enrollment from a previous term — re-run Check file and choose Complete or Drop.`,
        severity: "error",
        code: "needs_decision",
      })
      continue
    }

    const newStatusId = raw.priorDecision === "complete" ? completedStatusId : droppedStatusId
    const { error: closeError } = await service
      .from("enrollment")
      .update({ enrollment_status_id: newStatusId })
      .eq("enrollment_id", activeEnrollment.enrollment_id)
    if (closeError) {
      console.error("[commitStudentImportChunk] prior enrollment close-out failed", closeError)
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `Failed to close out ${row.email}'s previous enrollment.`,
        severity: "error",
        code: "enroll_failed",
      })
      continue
    }

    const oldClassLabel = formatClassLabel({
      courseCode: activeEnrollment.section?.course_code,
      facilitatorName: activeEnrollment.section?.app_user?.full_name,
    })
    const statusLabel = raw.priorDecision === "complete" ? "Completed" : "Dropped"

    const { data: existingEnrollment } = await service
      .from("enrollment")
      .select("enrollment_id")
      .eq("student_user_id", studentUserId)
      .eq("section_id", sectionId)
      .maybeSingle()

    if (existingEnrollment) {
      const { error } = await service
        .from("enrollment")
        .update({ enrollment_status_id: activeStatusId, ...metadata })
        .eq("enrollment_id", existingEnrollment.enrollment_id)
      if (error) {
        console.error("[commitStudentImportChunk] enrollment reactivation failed", error)
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Failed to enroll ${row.email}.`,
          severity: "error",
          code: "enroll_failed",
        })
      } else {
        result.imported += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Closed out ${row.email}'s previous class (${oldClassLabel}) as ${statusLabel}; re-activated their enrollment in this class.`,
          severity: "info",
          code: "prior_closed",
        })
      }
    } else {
      const { error } = await service.from("enrollment").insert({
        section_id: sectionId,
        student_user_id: studentUserId,
        enrollment_status_id: activeStatusId,
        ...metadata,
      })
      if (error) {
        console.error("[commitStudentImportChunk] enrollment insert failed", error)
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Failed to enroll ${row.email}.`,
          severity: "error",
          code: "enroll_failed",
        })
      } else {
        result.imported += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Closed out ${row.email}'s previous class (${oldClassLabel}) as ${statusLabel}.`,
          severity: "info",
          code: "prior_closed",
        })
      }
    }
  }

  return { ok: true, result }
}

export interface CheckStudentEmailActiveEnrollment {
  isActiveTerm: boolean
  classLabel: string
  termName: string
  facilitatorName: string
  hoursEarned: number
  hoursRequired: number
  suggested: PriorDecision
}

export type CheckStudentEmailResult =
  | { ok: true; exists: false }
  | {
    ok: true
    exists: true
    studentUserId: string
    fullName: string
    studentNumber: string | null
    roleCode: string | null
    activeEnrollment: CheckStudentEmailActiveEnrollment | null
  }
  | { ok: false; error: string }

/**
 * Looks up an email for the Add Student modal: whether an account already
 * exists, and — if it does and is a student — its current active enrollment
 * (with hours) so the modal can offer the same Complete/Drop-then-enroll flow
 * the CSV import uses for returning students.
 */
export async function checkStudentEmail(email: string): Promise<CheckStudentEmailResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return { ok: false, error: "Email is required." }

  const service = createSupabaseServiceClient()
  const existing = await findAppUserByEmail(service, trimmed)
  if (!existing) return { ok: true, exists: false }

  const termId = await getActiveTermId(service)
  const enrollments = await fetchActiveEnrollments(service, [existing.appUserId])
  const info = enrollments.get(existing.appUserId)

  return {
    ok: true,
    exists: true,
    studentUserId: existing.appUserId,
    fullName: existing.fullName,
    studentNumber: existing.studentNumber,
    roleCode: existing.roleCode,
    activeEnrollment: info
      ? {
        isActiveTerm: termId !== null && info.termId === termId,
        classLabel: info.classLabel,
        termName: info.termName,
        facilitatorName: info.currentFacilitatorName,
        hoursEarned: info.hoursEarned,
        hoursRequired: info.hoursRequired,
        suggested: info.suggested,
      }
      : null,
  }
}

/**
 * Enrolls an existing student account into a class — the manual-add
 * counterpart to the CSV import's returning-student handling. Re-verifies
 * the student's active enrollment server-side (mirrors the commit-phase
 * logic in commitStudentImportChunk) rather than trusting client state.
 */
export async function enrollExistingStudent(payload: {
  studentUserId: string
  sectionId: string
  priorDecision?: PriorDecision
  programId?: string | null
  studentClassificationId?: string | null
  enlistmentStatusId?: string | null
}): Promise<CreateStudentResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!payload.studentUserId.trim()) return { ok: false, error: "Student is required." }
  if (!payload.sectionId.trim()) return { ok: false, error: "Class is required." }

  const service = createSupabaseServiceClient()

  const { data: target } = await service
    .from("app_user")
    .select("role:role_id(code)")
    .eq("app_user_id", payload.studentUserId)
    .maybeSingle()
  if (!target) return { ok: false, error: "Student not found." }
  const roleCode = (target.role as { code?: string } | null)?.code ?? null
  if (roleCode !== "student") {
    return { ok: false, error: "Only student accounts can be enrolled." }
  }

  const { data: section } = await service
    .from("section")
    .select("section_id, term_id")
    .eq("section_id", payload.sectionId)
    .maybeSingle()
  if (!section) return { ok: false, error: "Class not found." }

  const activeStatusId = await lookupId("enrollment_status", "active")

  const { data: activeEnrollmentRow } = await service
    .from("enrollment")
    .select(
      "enrollment_id, section_id, section:section_id(term_id, course_code, app_user:adviser_user_id(full_name))"
    )
    .eq("student_user_id", payload.studentUserId)
    .eq("enrollment_status_id", activeStatusId)
    .maybeSingle()
  const activeEnrollment = activeEnrollmentRow as unknown as ActiveEnrollmentCommitRow | null

  if (activeEnrollment) {
    if (activeEnrollment.section_id === payload.sectionId) {
      return { ok: false, error: "Already enrolled in this class." }
    }

    const activeEnrollmentTermId = activeEnrollment.section?.term_id ?? null
    if (activeEnrollmentTermId === section.term_id) {
      const facilitatorName =
        activeEnrollment.section?.app_user?.full_name ?? "another facilitator"
      return {
        ok: false,
        error: `This student is already enrolled with ${facilitatorName} this term — move them via Edit Student.`,
      }
    }

    // Prior-term active enrollment — close it out per the chosen decision.
    if (payload.priorDecision !== "complete" && payload.priorDecision !== "drop") {
      return {
        ok: false,
        error: "Choose whether to complete or drop the previous enrollment.",
      }
    }
    const [completedStatusId, droppedStatusId] = await Promise.all([
      lookupId("enrollment_status", "completed"),
      lookupId("enrollment_status", "dropped"),
    ])
    const newStatusId = payload.priorDecision === "complete" ? completedStatusId : droppedStatusId
    const { error: closeError } = await service
      .from("enrollment")
      .update({ enrollment_status_id: newStatusId })
      .eq("enrollment_id", activeEnrollment.enrollment_id)
    if (closeError) {
      console.error("[enrollExistingStudent] close-out failed", closeError)
      return { ok: false, error: "Failed to close out the previous enrollment." }
    }
  }

  // Optional enrollment metadata — mirrors commitStudentImportChunk's metadata pattern.
  const metadata = {
    program_id: payload.programId ?? null,
    student_classification_id: payload.studentClassificationId ?? null,
    enlistment_status_id: payload.enlistmentStatusId ?? null,
  }

  const { data: existingEnrollment } = await service
    .from("enrollment")
    .select("enrollment_id")
    .eq("student_user_id", payload.studentUserId)
    .eq("section_id", payload.sectionId)
    .maybeSingle()

  if (existingEnrollment) {
    const { error } = await service
      .from("enrollment")
      .update({ enrollment_status_id: activeStatusId, ...metadata })
      .eq("enrollment_id", existingEnrollment.enrollment_id)
    if (error) {
      console.error("[enrollExistingStudent] reactivation failed", error)
      return { ok: false, error: "Failed to enroll the student." }
    }
  } else {
    const { error } = await service.from("enrollment").insert({
      section_id: payload.sectionId,
      student_user_id: payload.studentUserId,
      enrollment_status_id: activeStatusId,
      ...metadata,
    })
    if (error) {
      console.error("[enrollExistingStudent] insert failed", error)
      return { ok: false, error: "Failed to enroll the student." }
    }
  }

  return { ok: true }
}
