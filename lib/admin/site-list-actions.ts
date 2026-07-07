"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  buildSampleSiteAdvisers,
  buildSampleSiteSections,
  buildSampleSites,
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
  validateSiteDelete,
  validateSiteUpdatePayload,
  type SiteCreatePayload,
  type SiteMutationResult,
  type SiteUpdatePayload,
} from "@/lib/admin/site-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { formatClassLabel } from "@/lib/shared/class-label"

const SEMESTER_LABELS: Record<string, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

/**
 * Fetches everything the admin site list page needs.
 *
 * Backend checklist:
 * 1. Keep returning `SiteListPageData` — no UI changes required.
 * 2. Scope section options to the active term (already done).
 * 3. Move `filterSiteListRows()` into SQL when the list grows large.
 * 4. Remove sample fallbacks once production data exists.
 */
export async function getSiteListData(query: SiteListQuery): Promise<SiteListPageData> {
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

  const sectionsRes = activeTerm?.term_id
    ? await supabase
        .from("section")
        .select(
          "section_id, course_code, adviser_user_id, adviser:adviser_user_id(full_name)"
        )
        .eq("term_id", activeTerm.term_id)
    : { data: null, error: null }

  const advisersRes = await supabase
    .from("app_user")
    .select("app_user_id, full_name")
    .eq("role_id", adviserRoleId)
    .order("full_name")

  if (sectionsRes.error) {
    console.error("[getSiteListData] section query failed", sectionsRes.error)
  }

  const dbSites =
    (geofencesRes.data as SiteListDbRow[] | null)
      ?.map(mapSiteListDbRow)
      .filter((row): row is NonNullable<typeof row> => row !== null) ?? []

  const sites = dbSites.length > 0 ? dbSites : buildSampleSites()

  const dbSections: SiteListSectionOption[] =
    sectionsRes.data
      ?.map((row) => ({
        sectionId: row.section_id as string,
        label: formatClassLabel({
          courseCode: row.course_code as string,
          facilitatorName: (row.adviser as { full_name?: string } | null)?.full_name,
        }),
        adviserUserId: (row.adviser_user_id as string | null) ?? "",
        supervisorName:
          (row.adviser as { full_name?: string } | null)?.full_name ?? "Unassigned",
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) ?? []

  const sections = dbSections.length > 0 ? dbSections : buildSampleSiteSections()

  const dbAdvisers: SiteListAdviserOption[] =
    advisersRes.data?.map((row) => ({
      adviserUserId: row.app_user_id as string,
      fullName: row.full_name ?? "Unknown",
    })) ?? []

  const advisers = dbAdvisers.length > 0 ? dbAdvisers : buildSampleSiteAdvisers()

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

export async function createSite(payload: SiteCreatePayload): Promise<SiteMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateSiteCreatePayload(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from("section_geofence").insert({
    section_id: payload.sectionId,
    label: payload.siteName.trim(),
    radius_meter: Math.round(payload.radiusMeters),
    center_latitude: payload.centerLatitude,
    center_longitude: payload.centerLongitude,
    is_active: true,
  })

  if (error) {
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

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
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
    console.error("[updateSite] update failed", error)
    return { ok: false, error: "Failed to update GPS site." }
  }

  return { ok: true }
}

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

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from("section_geofence")
    .delete()
    .eq("section_geofence_id", geofenceId)

  if (error) {
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
