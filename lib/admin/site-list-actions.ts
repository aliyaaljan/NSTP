"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  buildSiteListSummary,
  mapSiteListDbRow,
  SITE_LIST_SELECT,
  type AdminCurrentUser,
  type SiteListAdviserOption,
  type SiteListDbRow,
  type SiteListMeta,
  type SiteListPageData,
  type SiteListQuery,
  type SiteListSectionOption,
} from "@/lib/admin/site-list"
import {
  validateSiteCreatePayload,
  validateSiteUpdatePayload,
  type SiteCreatePayload,
  type SiteMutationResult,
  type SiteUpdatePayload,
} from "@/lib/admin/site-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { formatClassLabel } from "@/lib/shared/class-label"
import {
  getSiteDeleteImpact,
  isForeignKeyViolation,
  type DeleteImpact,
} from "@/lib/admin/dependent-checks"

const SEMESTER_LABELS: Record<string, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

/**
 * Fetches everything the admin site list page needs.
 */
export async function getSiteListData(query: SiteListQuery): Promise<SiteListPageData> {
  const role = await getAppUserRole()
  if (role !== "admin") throw new Error("Unauthorized")

  const supabase = await createSupabaseServerClient()

  const [termsRes, geofencesRes, adviserRoleId, { data: authData }] = await Promise.all([
    supabase
      .from("term")
      .select("term_id, school_year, semester, is_active")
      .order("school_year", { ascending: false }),
    supabase.from("section_geofence").select(SITE_LIST_SELECT).order("label"),
    lookupId("role", "adviser"),
    supabase.auth.getUser(),
  ])

  if (termsRes.error) {
    console.error("[getSiteListData] term query failed", termsRes.error)
  }
  if (geofencesRes.error) {
    console.error("[getSiteListData] section_geofence query failed", geofencesRes.error)
  }

  const terms = termsRes.data ?? []
  const activeTerm = terms.find((t) => t.is_active) ?? terms[0]

  // Archived classes are not valid Add-Site targets.
  const sectionsRes = activeTerm?.term_id
    ? await supabase
        .from("section")
        .select(
          "section_id, course_code, adviser_user_id, adviser:adviser_user_id(full_name), status:section_status_id!inner(code)"
        )
        .eq("term_id", activeTerm.term_id)
        .neq("status.code", "archived")
    : { data: null, error: null }

  const advisersRes = await supabase
    .from("app_user")
    .select("app_user_id, full_name")
    .eq("role_id", adviserRoleId)
    .order("full_name")

  if (sectionsRes.error) {
    console.error("[getSiteListData] section query failed", sectionsRes.error)
  }

  const sites =
    (geofencesRes.data as SiteListDbRow[] | null)
      ?.map(mapSiteListDbRow)
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const sections: SiteListSectionOption[] =
    sectionsRes.data
      ?.map((row) => ({
        sectionId: row.section_id as string,
        label: formatClassLabel({
          courseCode: row.course_code as string,
          facilitatorName: (row.adviser as { full_name?: string } | null)?.full_name,
          schoolYear: activeTerm?.school_year,
        }),
        adviserUserId: (row.adviser_user_id as string | null) ?? "",
        supervisorName:
          (row.adviser as { full_name?: string } | null)?.full_name ?? "Unassigned",
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? []

  const advisers: SiteListAdviserOption[] =
    advisersRes.data?.map((row) => ({
      adviserUserId: row.app_user_id as string,
      fullName: row.full_name ?? "Unknown",
    })) ?? []

  const semesterCode = activeTerm?.semester ?? "first"
  const meta: SiteListMeta = {
    academicYear: activeTerm?.school_year ?? "2025-2026",
    semester: SEMESTER_LABELS[semesterCode] ?? semesterCode,
  }

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  return {
    sites,
    sections,
    advisers,
    summary: buildSiteListSummary(sites),
    meta,
    currentUser,
    query,
  }
}

/** True if `label` already belongs to another site (case/whitespace-insensitive). */
async function findDuplicateSiteName(
  service: ReturnType<typeof createSupabaseServiceClient>,
  siteName: string,
  excludeGeofenceId?: string
): Promise<boolean> {
  const normalized = siteName.trim().toLowerCase()
  let query = service.from("section_geofence").select("section_geofence_id, label")
  if (excludeGeofenceId) {
    query = query.neq("section_geofence_id", excludeGeofenceId)
  }
  const { data } = await query
  return (data ?? []).some((row) => (row.label ?? "").trim().toLowerCase() === normalized)
}

function duplicateNameError(siteName: string): string {
  return `A site named "${siteName.trim()}" already exists. Site names must be unique.`
}

export async function createSite(payload: SiteCreatePayload): Promise<SiteMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateSiteCreatePayload(payload)
  if (validationError) return { ok: false, error: validationError }

  const service = createSupabaseServiceClient()

  const { data: section } = await service
    .from("section")
    .select("status:section_status_id(code)")
    .eq("section_id", payload.sectionId)
    .maybeSingle()
  if (!section) return { ok: false, error: "Class not found." }
  if ((section.status as { code?: string } | null)?.code === "archived") {
    return { ok: false, error: "Cannot assign a site to an archived class." }
  }

  if (await findDuplicateSiteName(service, payload.siteName)) {
    return { ok: false, error: duplicateNameError(payload.siteName) }
  }

  const { error } = await service.from("section_geofence").insert({
    section_id: payload.sectionId,
    label: payload.siteName.trim(),
    radius_meter: Math.round(payload.radiusMeters),
    center_latitude: payload.centerLatitude,
    center_longitude: payload.centerLongitude,
    is_active: true,
  })

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: duplicateNameError(payload.siteName) }
    }
    console.error("[createSite] insert failed", error)
    return { ok: false, error: "Failed to add GPS site." }
  }

  return { ok: true }
}

export async function updateSite(payload: SiteUpdatePayload): Promise<SiteMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateSiteUpdatePayload(payload)
  if (validationError) return { ok: false, error: validationError }

  if (payload.geofenceId.startsWith("sample-")) {
    return {
      ok: false,
      error: "Sample GPS sites cannot be updated until database sites are available.",
    }
  }

  const service = createSupabaseServiceClient()

  const { data: section } = await service
    .from("section")
    .select("status:section_status_id(code)")
    .eq("section_id", payload.sectionId)
    .maybeSingle()
  if (!section) return { ok: false, error: "Class not found." }
  if ((section.status as { code?: string } | null)?.code === "archived") {
    return { ok: false, error: "Cannot assign a site to an archived class." }
  }

  if (await findDuplicateSiteName(service, payload.siteName, payload.geofenceId)) {
    return { ok: false, error: duplicateNameError(payload.siteName) }
  }

  const { error } = await service
    .from("section_geofence")
    .update({
      section_id: payload.sectionId,
      label: payload.siteName.trim(),
      radius_meter: Math.round(payload.radiusMeters),
      center_latitude: payload.centerLatitude,
      center_longitude: payload.centerLongitude,
      is_active: payload.isActive,
    })
    .eq("section_geofence_id", payload.geofenceId)

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: duplicateNameError(payload.siteName) }
    }
    console.error("[updateSite] update failed", error)
    return { ok: false, error: "Failed to update GPS site." }
  }

  return { ok: true }
}

export async function getSiteDeleteImpactAction(
  geofenceId: string
): Promise<{ ok: true; impact: DeleteImpact } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }
  if (geofenceId.startsWith("sample-")) {
    return {
      ok: false,
      error: "Sample GPS sites cannot be deleted until database sites are available.",
    }
  }
  const service = createSupabaseServiceClient()
  return { ok: true, impact: await getSiteDeleteImpact(service, geofenceId) }
}

/**
 * Two-step lifecycle: a site must be deactivated (Edit Site → uncheck Active)
 * before it can be hard-deleted, and delete is blocked while any student is
 * still assigned to it (`enrollment.assigned_geofence_id`).
 */
export async function deleteSite(geofenceId: string): Promise<SiteMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  if (!geofenceId.trim()) return { ok: false, error: "Site ID is required." }

  if (geofenceId.startsWith("sample-")) {
    return {
      ok: false,
      error: "Sample GPS sites cannot be deleted until database sites are available.",
    }
  }

  const service = createSupabaseServiceClient()

  const impact = await getSiteDeleteImpact(service, geofenceId)
  if (impact.state === "blocked") {
    return {
      ok: false,
      error:
        impact.lifecycleBlocked ??
        `Cannot delete: ${impact.blockers
          .map((b) => `${b.count} ${b.label.toLowerCase()}`)
          .join(", ")}.`,
    }
  }

  const { error } = await service
    .from("section_geofence")
    .delete()
    .eq("section_geofence_id", geofenceId)

  if (error) {
    if (isForeignKeyViolation(error)) {
      const recheck = await getSiteDeleteImpact(service, geofenceId)
      return {
        ok: false,
        error:
          `Cannot delete: ${recheck.blockers
            .map((b) => `${b.count} ${b.label.toLowerCase()}`)
            .join(", ") || "referenced by other records"}.`,
      }
    }
    console.error("[deleteSite] delete failed", error)
    return { ok: false, error: "Failed to delete GPS site." }
  }

  return { ok: true }
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
