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

  // TODO(backend): implement student creation.
  console.info("[createStudent] pending implementation", {
    sectionId: payload.sectionId,
    email: payload.email,
  })

  return {
    ok: false,
    error:
      "Add is not available yet. Backend handler still needs to be implemented.",
  }
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

  // TODO(backend): implement student update.
  console.info("[updateStudent] pending implementation", {
    enrollmentId: payload.enrollmentId,
    studentUserId: payload.studentUserId,
    sectionId: payload.sectionId,
  })

  return {
    ok: false,
    error:
      "Edit is not available yet. Backend handler still needs to be implemented.",
  }
}

/**
 * Remove a student enrollment (or deactivate the student account).
 *
 * Backend checklist:
 * 1. Set `enrollment.enrollment_status_id` to withdrawn/inactive, or delete the row.
 * 2. Optionally soft-delete `app_user` if the student should lose portal access.
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

  // TODO(backend): implement student removal / deactivation.
  console.info("[deleteStudent] pending implementation", { enrollmentId })

  return {
    ok: false,
    error:
      "Delete is not available yet. Backend handler still needs to be implemented.",
  }
}
