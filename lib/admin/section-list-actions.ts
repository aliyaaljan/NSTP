"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  buildSectionListSummary,
  mapSectionDbRowToListRow,
  SECTION_LIST_SELECT,
  type AdminCurrentUser,
  type SectionListAdviserOption,
  type SectionListDbRow,
  type SectionListMeta,
  type SectionListPageData,
  type SectionListQuery,
  type SectionListStatusOption,
} from "@/lib/admin/section-list"
import {
  validateSectionCreatePayload,
  validateSectionEditPayload,
  type SectionCreatePayload,
  type SectionEditPayload,
  type SectionMutationResult,
} from "@/lib/admin/section-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

const SEMESTER_LABELS: Record<string, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

/**
 * Fetches everything the admin section list page needs.
 */
export async function getSectionListData(
  query: SectionListQuery
): Promise<SectionListPageData> {
  const supabase = await createSupabaseServerClient()
  const activeStatusId = await lookupId("enrollment_status", "active")

  const [termsRes, statusesRes, adviserRoleId, { data: authData }] =
    await Promise.all([
      supabase
        .from("term")
        .select("term_id, school_year, semester, is_active")
        .order("school_year", { ascending: false }),
      supabase
        .from("section_status")
        .select("section_status_id, code, name")
        .order("name"),
      lookupId("role", "adviser"),
      supabase.auth.getUser(),
    ])

  const terms = termsRes.data ?? []
  const activeTerm = terms.find((t) => t.is_active) ?? terms[0]

  const [sectionsRes, enrollmentsRes, advisersRes] = await Promise.all([
    activeTerm?.term_id
      ? supabase
          .from("section")
          .select(SECTION_LIST_SELECT)
          .eq("term_id", activeTerm.term_id)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("enrollment")
      .select("section_id")
      .eq("enrollment_status_id", activeStatusId),
    supabase
      .from("app_user")
      .select("app_user_id, full_name")
      .eq("role_id", adviserRoleId)
      .order("full_name"),
  ])

  if (sectionsRes.error) {
    console.error(
      "[getSectionListData] section query failed",
      sectionsRes.error
    )
  }

  const enrollmentCounts = new Map<string, number>()
  for (const enrollment of enrollmentsRes.data ?? []) {
    const sectionId = enrollment.section_id as string
    enrollmentCounts.set(sectionId, (enrollmentCounts.get(sectionId) ?? 0) + 1)
  }

  const sections =
    ((sectionsRes.data ?? []) as unknown as SectionListDbRow[])
      .map((row) =>
        mapSectionDbRowToListRow(row, enrollmentCounts.get(row.section_id) ?? 0)
      )
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const advisers: SectionListAdviserOption[] =
    advisersRes.data?.map((row) => ({
      adviserUserId: row.app_user_id,
      fullName: row.full_name ?? "Unknown",
    })) ?? []

  const statuses: SectionListStatusOption[] =
    (statusesRes.data ?? [])
      .filter((row) => row.code !== "draft")
      .map((row) => ({
        sectionStatusId: row.section_status_id,
        code: row.code as SectionListStatusOption["code"],
        name: row.name,
      })) ?? []

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: SectionListMeta = {
    academicYear: activeTerm?.school_year ?? "2025-2026",
    semester:
      SEMESTER_LABELS[activeTerm?.semester ?? "second"] ?? "2nd Semester",
    activeTermId: activeTerm?.term_id ?? "",
  }

  return {
    sections,
    advisers,
    statuses,
    summary: buildSectionListSummary(sections),
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

async function resolveStatusId(code: string): Promise<string | null> {
  try {
    return await lookupId("section_status", code)
  } catch {
    return null
  }
}

/**
 * Creates a section for the active term.
 */
export async function createSection(
  payload: SectionCreatePayload,
  activeTermId: string
): Promise<SectionMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateSectionCreatePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  if (!activeTermId) {
    return {
      ok: false,
      error: "No active term found. Configure a term in Settings first.",
    }
  }

  const sectionStatusId = await resolveStatusId(payload.statusCode)
  if (!sectionStatusId) {
    return { ok: false, error: "Invalid section status." }
  }

  const service = createSupabaseServiceClient()

  const { error } = await service.from("section").insert({
    term_id: activeTermId,
    adviser_user_id: payload.adviserUserId,
    course_code: payload.courseCode.trim(),
    section_status_id: sectionStatusId,
    required_hour_total: payload.requiredHourTotal,
    daily_cutoff_time: `${payload.dailyCutoffTime}:00`,
  })

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This facilitator already has a class this term." }
    }
    console.error("[createSection]", error)
    return { ok: false, error: "Failed to create section." }
  }

  return { ok: true }
}

/**
 * Updates an existing section row.
 */
export async function updateSection(
  payload: SectionEditPayload
): Promise<SectionMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateSectionEditPayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const sectionStatusId = await resolveStatusId(payload.statusCode)
  if (!sectionStatusId) {
    return { ok: false, error: "Invalid section status." }
  }

  const service = createSupabaseServiceClient()
  const { error } = await service
    .from("section")
    .update({
      adviser_user_id: payload.adviserUserId,
      course_code: payload.courseCode.trim(),
      section_status_id: sectionStatusId,
      required_hour_total: payload.requiredHourTotal,
      daily_cutoff_time: `${payload.dailyCutoffTime}:00`,
      updated_at: new Date().toISOString(),
    })
    .eq("section_id", payload.sectionId)

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This facilitator already has a class this term." }
    }
    console.error("[updateSection]", error)
    return { ok: false, error: "Failed to update section." }
  }

  return { ok: true }
}

/**
 * Removes a section from the list.
 * - Sections with active enrollments are archived (soft delete).
 * - Empty sections are hard-deleted from the database.
 */
export async function deleteSection(
  sectionId: string
): Promise<SectionMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  if (!sectionId.trim()) {
    return { ok: false, error: "Section ID is required." }
  }

  const supabase = await createSupabaseServerClient()
  const activeStatusId = await lookupId("enrollment_status", "active")

  // check if section has active enrollments
  const { count, error: countError } = await supabase
    .from("enrollment")
    .select("enrollment_id", { count: "exact", head: true })
    .eq("section_id", sectionId)
    .eq("enrollment_status_id", activeStatusId)

  if (countError) {
    console.error("[deleteSection] enrollment count failed", countError)
    return { ok: false, error: "Failed to check enrollments." }
  }

  const service = createSupabaseServiceClient()
  // SOFT DELETE: If students are enrolled, it just becomes archived
  if ((count ?? 0) > 0) {
    const archivedStatusId = await resolveStatusId("archived")
    if (!archivedStatusId) {
      return { ok: false, error: "Archived status not found." }
    }

    const { error } = await service
      .from("section")
      .update({
        section_status_id: archivedStatusId,
        updated_at: new Date().toISOString(),
      })
      .eq("section_id", sectionId)

    if (error) {
      console.error("[deleteSection] archive failed", error)
      return { ok: false, error: "Failed to archive section." }
    }

    return { ok: true }
  }
  // HARD DELETE: If empty, remove the section entirely
  const { error } = await service
    .from("section")
    .delete()
    .eq("section_id", sectionId)

  if (error) {
    console.error("[deleteSection] hard delete failed", error)
    return { ok: false, error: "Failed to delete section." }
  }

  return { ok: true }
}
