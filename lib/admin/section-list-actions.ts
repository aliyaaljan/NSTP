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
import {
  getSectionDeleteImpact,
  isForeignKeyViolation,
  type DeleteImpact,
} from "@/lib/admin/dependent-checks"
import { getAssignableFacilitators, isFacilitatorEligible } from "@/lib/admin/facilitator-pool"

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
  const role = await getAppUserRole()
  if (role !== "admin") throw new Error("Unauthorized")

  const supabase = await createSupabaseServerClient()
  const activeStatusId = await lookupId("enrollment_status", "active")

  const [termsRes, statusesRes, { data: authData }] =
    await Promise.all([
      supabase
        .from("term")
        .select("term_id, school_year, semester, is_active")
        .order("school_year", { ascending: false }),
      supabase
        .from("section_status")
        .select("section_status_id, code, name")
        .order("name"),
      supabase.auth.getUser(),
    ])

  const terms = termsRes.data ?? []
  const activeTerm = terms.find((t) => t.is_active) ?? terms[0]

  const [sectionsRes, enrollmentsRes, assignableFacilitators] = await Promise.all([
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
    getAssignableFacilitators(supabase),
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

  const advisers: SectionListAdviserOption[] = assignableFacilitators.map((a) => ({
    adviserUserId: a.userId,
    fullName: a.fullName || "Unknown",
    isActive: true,
    isAdmin: a.isAdmin,
  }))

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

async function resolveStatusId(code: string): Promise<string | null> {
  try {
    return await lookupId("section_status", code)
  } catch {
    return null
  }
}

/** Rejects an inactive/non-facilitator adviser id. Never trust a client-supplied id. */
async function assertActiveAdviser(
  service: ReturnType<typeof createSupabaseServiceClient>,
  adviserUserId: string
): Promise<string | null> {
  const { data } = await service
    .from("app_user")
    .select("is_active, role:role_id(code)")
    .eq("app_user_id", adviserUserId)
    .maybeSingle()
  if (!data) return "Facilitator not found."
  if (!isFacilitatorEligible((data.role as { code?: string } | null)?.code)) {
    return "Selected user is not a facilitator or admin."
  }
  if (!data.is_active) {
    return "This facilitator's account is deactivated. Reactivate the account or choose an active facilitator."
  }
  return null
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

  if (payload.statusCode !== "active") {
    return { ok: false, error: "A new class must start out Active." }
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

  const adviserError = await assertActiveAdviser(service, payload.adviserUserId)
  if (adviserError) return { ok: false, error: adviserError }

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

  const { data: current } = await service
    .from("section")
    .select("adviser_user_id")
    .eq("section_id", payload.sectionId)
    .maybeSingle()
  if (!current) return { ok: false, error: "Class not found." }

  // Only re-validate the adviser when it's actually changing — an admin must
  // still be able to fix hours/status on a class whose adviser was just
  // deactivated without being forced to reassign it first.
  if (current.adviser_user_id !== payload.adviserUserId) {
    const adviserError = await assertActiveAdviser(service, payload.adviserUserId)
    if (adviserError) return { ok: false, error: adviserError }
  }

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
 * Soft step: archives a class regardless of enrollment count. Enrollments and
 * history are kept; the class can be restored later by setting it back to Active.
 */
export async function archiveSection(sectionId: string): Promise<SectionMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  if (!sectionId.trim()) {
    return { ok: false, error: "Section ID is required." }
  }

  const archivedStatusId = await resolveStatusId("archived")
  if (!archivedStatusId) {
    return { ok: false, error: "Archived status not found." }
  }

  const service = createSupabaseServiceClient()
  const { error } = await service
    .from("section")
    .update({
      section_status_id: archivedStatusId,
      updated_at: new Date().toISOString(),
    })
    .eq("section_id", sectionId)

  if (error) {
    console.error("[archiveSection] failed", error)
    return { ok: false, error: "Failed to archive the class." }
  }

  return { ok: true }
}

export async function getSectionDeleteImpactAction(
  sectionId: string
): Promise<{ ok: true; impact: DeleteImpact } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  const service = createSupabaseServiceClient()
  return { ok: true, impact: await getSectionDeleteImpact(service, sectionId) }
}

/**
 * Hard step: only archived/draft classes, and only once no attendance or
 * request history exists on ANY of its enrollments (active, completed, or
 * dropped) — a finished class with completed students is NOT "empty".
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

  const service = createSupabaseServiceClient()

  const impact = await getSectionDeleteImpact(service, sectionId)
  if (impact.state === "blocked") {
    return {
      ok: false,
      error:
        impact.lifecycleBlocked ??
        "Cannot delete: this class has attendance or request history, which is never deleted.",
    }
  }

  const { error } = await service.from("section").delete().eq("section_id", sectionId)

  if (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "Cannot delete: other records still reference this class." }
    }
    console.error("[deleteSection] hard delete failed", error)
    return { ok: false, error: "Failed to delete the class." }
  }

  return { ok: true }
}
