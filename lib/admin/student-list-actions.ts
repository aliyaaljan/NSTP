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
import { provisionUser, syncUserEmail } from "@/lib/admin/user-provision"

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
