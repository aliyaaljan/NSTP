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
  type StudentListMeta,
  type StudentListPageData,
  type StudentListQuery,
  type StudentListSectionOption,
} from "@/lib/admin/student-list"
import {
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
import { mapRows, parseImportFile } from "@/lib/admin/import/parse"
import {
  getStudentImportLookups,
  type StudentImportLookups,
} from "@/lib/admin/import/lookups"
import {
  emptyCommitResult,
  isAcceptedImportFile,
  IMPORT_CHUNK_SIZE,
  type ImportCommitResult,
  type RowIssue,
} from "@/lib/admin/import/types"
import {
  deriveUniformCourseCode,
  STUDENT_IMPORT_COLUMNS,
  validateStudentImportValues,
  type EnsureImportSectionResult,
  type ImportPickerData,
  type ParseStudentImportResult,
  type StudentImportRow,
  type StudentImportSectionChoice,
} from "@/lib/admin/student-import"

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
  const supabase = await createSupabaseServerClient()
  const activeStatusId = await lookupId("enrollment_status", "active")

  let enrollmentQuery = supabase
    .from("enrollment")
    .select(ENROLLMENT_LIST_SELECT)
    .eq("enrollment_status_id", activeStatusId)
    .order("joined_at", { ascending: true })

  // Server-side section filter — backend can extend with adviser, term, etc.
  if (query.sectionId !== STUDENT_LIST_ALL_SECTIONS) {
    enrollmentQuery = enrollmentQuery.eq("section_id", query.sectionId)
  }

  const [enrollmentsRes, sectionsRes, { data: authData }] = await Promise.all([
    enrollmentQuery,
    supabase.from("section").select("section_id, name").order("name"),
    supabase.auth.getUser(),
  ])

  if (enrollmentsRes.error) {
    console.error("[getStudentListData] enrollment query failed", enrollmentsRes.error)
  }

  const students =
    (enrollmentsRes.data as EnrollmentListDbRow[] | null)
      ?.map(mapEnrollmentToStudentListRow)
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const sections: StudentListSectionOption[] =
    sectionsRes.data?.map((section) => ({
      sectionId: section.section_id,
      name: section.name,
    })) ?? []

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: StudentListMeta = {
    // TODO(backend): read from `term` where is_active = true
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }

  return {
    students,
    sections,
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

  const provisioned = await provisionUser(service, {
    email: payload.email,
    fullName: payload.fullName,
    roleCode: "student",
    studentNumber: payload.studentNumber,
  })
  if (!provisioned.ok) return provisioned

  const activeStatusId = await lookupId("enrollment_status", "active")
  const { error: enrollError } = await service.from("enrollment").insert({
    section_id: payload.sectionId,
    student_user_id: provisioned.userId,
    enrollment_status_id: activeStatusId,
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

  const nextEmail = payload.email.trim().toLowerCase()
  if (nextEmail !== (current.email ?? "").toLowerCase()) {
    const emailResult = await syncUserEmail(service, payload.studentUserId, nextEmail)
    if (!emailResult.ok) return emailResult
  }

  const { error: userError } = await service
    .from("app_user")
    .update({
      full_name: payload.fullName.trim(),
      email: nextEmail,
      student_number: payload.studentNumber?.trim() || null,
    })
    .eq("app_user_id", payload.studentUserId)

  if (userError) {
    console.error("[updateStudent] app_user update failed", userError)
    if ((userError as { code?: string }).code === "23505") {
      return { ok: false, error: "That email is already in use." }
    }
    return { ok: false, error: "Failed to update the student." }
  }

  const { data: enrollment, error: enrollmentError } = await service
    .from("enrollment")
    .select("section_id")
    .eq("enrollment_id", payload.enrollmentId)
    .maybeSingle()

  if (enrollmentError || !enrollment) {
    console.error("[updateStudent] enrollment lookup failed", enrollmentError)
    return { ok: false, error: "Enrollment not found." }
  }

  if (enrollment.section_id !== payload.sectionId) {
    const { error: moveError } = await service
      .from("enrollment")
      .update({ section_id: payload.sectionId })
      .eq("enrollment_id", payload.enrollmentId)

    if (moveError) {
      console.error("[updateStudent] section move failed", moveError)
      if ((moveError as { code?: string }).code === "23505") {
        return { ok: false, error: "This student already has an enrollment in that section." }
      }
      return { ok: false, error: "Failed to move the student to the new section." }
    }
  }

  return { ok: true }
}

/**
 * Archive-only removal: sets the enrollment's status to `dropped`. The
 * `app_user` account and all attendance/audit history are kept — nothing is
 * hard-deleted.
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
    })
  }
  if (row.classification && !lookups.classification(row.classification)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown classification "${row.classification}" — will be left blank.`,
    })
  }
  if (row.enlistmentStatus && !lookups.enlistment(row.enlistmentStatus)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown enlistment status "${row.enlistmentStatus}" — will be left blank.`,
    })
  }
}

/**
 * Phase 1 of the student import: parse + validate, no writes.
 * Accepts the NSTP office metadata file (.csv or .xlsx) as-is.
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
  const lookups = await getStudentImportLookups(service)

  const issues: RowIssue[] = []
  const validRows: StudentImportRow[] = []
  for (const { rowNumber, values } of rows) {
    const validated = validateStudentImportValues(values, rowNumber)
    issues.push(...validated.issues)
    if (!validated.row) continue
    warnUnknownStudentLookups(validated.row, lookups, issues)
    validRows.push(validated.row)
  }

  return {
    ok: true,
    totalRows: rows.length,
    validRows,
    issues,
    uniformCourseCode: deriveUniformCourseCode(validRows),
  }
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

/** Section + facilitator options for the import modal's section step. */
export async function getImportPickerData(): Promise<
  { ok: true; data: ImportPickerData } | { ok: false; error: string }
> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  const [adviserRoleId, activeSectionStatusId] = await Promise.all([
    lookupId("role", "adviser"),
    lookupId("section_status", "active"),
  ])
  const [sectionsRes, advisersRes] = await Promise.all([
    service
      .from("section")
      .select("section_id, name, course_code")
      .eq("term_id", termId)
      .eq("section_status_id", activeSectionStatusId)
      .order("name"),
    service
      .from("app_user")
      .select("app_user_id, full_name")
      .eq("role_id", adviserRoleId)
      .eq("is_active", true)
      .order("full_name"),
  ])

  if (sectionsRes.error || advisersRes.error) {
    console.error("[getImportPickerData] failed", sectionsRes.error, advisersRes.error)
    return { ok: false, error: "Failed to load sections and facilitators." }
  }

  return {
    ok: true,
    data: {
      sections: (sectionsRes.data ?? []).map((section) => ({
        sectionId: section.section_id,
        name: section.name,
        courseCode: section.course_code,
      })),
      advisers: (advisersRes.data ?? []).map((adviser) => ({
        adviserUserId: adviser.app_user_id,
        fullName: adviser.full_name,
      })),
    },
  }
}

/**
 * Resolve the target section for a student import: validate an existing
 * active-term section, or create a new one. Called once before the chunk loop.
 */
export async function ensureImportSection(
  choice: StudentImportSectionChoice
): Promise<EnsureImportSectionResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  if (choice.kind === "existing") {
    if (!choice.sectionId) return { ok: false, error: "Please choose a section." }
    const { data: section } = await service
      .from("section")
      .select("section_id")
      .eq("section_id", choice.sectionId)
      .eq("term_id", termId)
      .maybeSingle()
    if (!section) return { ok: false, error: "Section not found in the active term." }
    return { ok: true, sectionId: section.section_id }
  }

  const name = choice.name.trim()
  const courseCode = choice.courseCode.trim()
  if (!name) return { ok: false, error: "Section name is required." }
  if (!courseCode) return { ok: false, error: "Course code is required." }
  if (!choice.adviserUserId) {
    return { ok: false, error: "Please choose a facilitator for the new section." }
  }

  const adviserRoleId = await lookupId("role", "adviser")
  const { data: adviser } = await service
    .from("app_user")
    .select("app_user_id")
    .eq("app_user_id", choice.adviserUserId)
    .eq("role_id", adviserRoleId)
    .maybeSingle()
  if (!adviser) return { ok: false, error: "Selected facilitator not found." }

  const { data: existing } = await service
    .from("section")
    .select("section_id")
    .eq("term_id", termId)
    .ilike("name", name)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: `A section named "${name}" already exists in the active term.` }
  }

  const activeStatusId = await lookupId("section_status", "active")
  const { data: created, error: createError } = await service
    .from("section")
    .insert({
      term_id: termId,
      adviser_user_id: choice.adviserUserId,
      course_code: courseCode,
      name,
      section_status_id: activeStatusId,
    })
    .select("section_id")
    .single()

  if (createError || !created) {
    console.error("[ensureImportSection] section insert failed", createError)
    return { ok: false, error: "Failed to create the section." }
  }
  return { ok: true, sectionId: created.section_id }
}

/**
 * Phase 2 of the student import: upsert one chunk of rows into the section.
 * Idempotent — re-running the same file updates rather than duplicates.
 * Never changes is_active on existing users.
 */
export async function commitStudentImportChunk(input: {
  sectionId: string
  rows: StudentImportRow[]
}): Promise<{ ok: true; result: ImportCommitResult } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!input.sectionId) return { ok: false, error: "Section is required." }
  if (!Array.isArray(input.rows)) return { ok: false, error: "Invalid rows payload." }
  if (input.rows.length === 0) return { ok: true, result: emptyCommitResult() }
  if (input.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `Send at most ${IMPORT_CHUNK_SIZE} rows per request.` }
  }

  const service = createSupabaseServiceClient()
  const termId = await getActiveTermId(service)
  if (!termId) return { ok: false, error: "No active term configured." }

  const { data: section } = await service
    .from("section")
    .select("section_id")
    .eq("section_id", input.sectionId)
    .eq("term_id", termId)
    .maybeSingle()
  if (!section) return { ok: false, error: "Section not found in the active term." }

  const lookups = await getStudentImportLookups(service)
  const activeStatusId = await lookupId("enrollment_status", "active")
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
      },
      raw.rowNumber ?? 0
    )
    if (!validated.row) {
      result.skipped += 1
      result.issues.push(...validated.issues)
      continue
    }
    const row = validated.row

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
        result.issues.push({ rowNumber: row.rowNumber, message: provisioned.error })
        continue
      }
      studentUserId = provisioned.userId
    } else if (existing.roleCode !== "student") {
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `${row.email} belongs to a non-student account — skipped.`,
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

    const { data: activeEnrollment } = await service
      .from("enrollment")
      .select("enrollment_id, section_id")
      .eq("student_user_id", studentUserId)
      .eq("enrollment_status_id", activeStatusId)
      .maybeSingle()

    if (activeEnrollment && activeEnrollment.section_id === input.sectionId) {
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
        })
      } else {
        result.updated += 1
      }
    } else if (activeEnrollment) {
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `${row.email} already has an active enrollment in another section — skipped.`,
      })
    } else {
      const { error } = await service.from("enrollment").insert({
        section_id: input.sectionId,
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
        })
      } else {
        result.imported += 1
      }
    }
  }

  return { ok: true, result }
}
