"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  ADVISER_LIST_ALL_SECTIONS,
  ADVISER_LIST_SELECT,
  buildAdviserListSummary,
  buildPendingAppealCounts,
  mapAdviserDbRowToListRow,
  type AdminCurrentUser,
  type AdviserListDbRow,
  type AdviserListMeta,
  type AdviserListPageData,
  type AdviserListQuery,
  type AdviserListSectionOption,
  type AdviserPendingAppealDbRow,
} from "@/lib/admin/adviser-list"
import {
  validateAdviserEditPayload,
  validateAdviserCreatePayload,
  type AdviserEditPayload,
  type AdviserCreatePayload,
  type UpdateAdviserResult,
  type CreateAdviserResult,
} from "@/lib/admin/adviser-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import {
  deactivateUser,
  provisionUser,
  syncAuthBan,
  syncUserEmail,
} from "@/lib/admin/user-provision"

/**
 * Fetches everything the admin adviser list page needs.
 *
 * Backend checklist:
 * 1. Keep returning `AdviserListPageData` — no UI changes required.
 * 2. Add term scoping (`term.is_active`) on `section` when multi-term is live.
 * 3. Move `filterAdviserListRows()` / pagination into SQL when the list grows large.
 * 4. Replace hardcoded `meta` with a `term` table lookup.
 */
export async function getAdviserListData(
  query: AdviserListQuery
): Promise<AdviserListPageData> {
  const supabase = await createSupabaseServerClient()
  const [adviserRoleId, activeStatusId, openStatusId, underReviewStatusId] =
    await Promise.all([
      lookupId("role", "adviser"),
      lookupId("enrollment_status", "active"),
      lookupId("appeal_status", "pending"),
      lookupId("appeal_status", "under_review"),
    ])

  let adviserSelect: string = ADVISER_LIST_SELECT

  if (query.sectionId !== ADVISER_LIST_ALL_SECTIONS) {
    adviserSelect = adviserSelect.replace(
      "section:section_adviser_user_id_fkey(",
      "section:section_adviser_user_id_fkey!inner("
    )
  }

  let adviserQuery = supabase
    .from("app_user")
    .select(adviserSelect)
    .eq("role_id", adviserRoleId)
    .order("full_name")

  if (query.sectionId !== ADVISER_LIST_ALL_SECTIONS) {
    adviserQuery = adviserQuery.eq("section.section_id", query.sectionId)
  }

  const pendingAppealsSelect = `
    appeal_id,
    assigned_adviser_user_id,
    enrollment(enrollment_id, section:section_id(adviser_user_id))
  `

  const [advisersRes, sectionsRes, appealsRes, { data: authData }] =
    await Promise.all([
      adviserQuery,
      supabase.from("section").select("section_id, name").order("name"),
      supabase
        .from("appeal")
        .select(pendingAppealsSelect)
        .in("appeal_status_id", [openStatusId, underReviewStatusId]),
      supabase.auth.getUser(),
    ])

  if (advisersRes.error) {
    console.error("[getAdviserListData] adviser query failed", advisersRes.error)
  }

  const pendingCounts = buildPendingAppealCounts(
    (appealsRes.data as AdviserPendingAppealDbRow[] | null) ?? []
  )

  const advisers =
    (advisersRes.data as AdviserListDbRow[] | null)?.map((row) =>
      mapAdviserDbRowToListRow(
        row,
        activeStatusId,
        pendingCounts.get(row.app_user_id) ?? 0
      )
    ) ?? []

  const sections: AdviserListSectionOption[] =
    sectionsRes.data?.map((section) => ({
      sectionId: section.section_id,
      name: section.name,
    })) ?? []

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: AdviserListMeta = {
    // TODO(backend): read from `term` where is_active = true
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }

  return {
    advisers,
    sections,
    summary: buildAdviserListSummary(advisers),
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
 * Create a new adviser account.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Create auth user + `app_user` (role = adviser) with full_name, email, is_active.
 * 3. Return `{ ok: true }` on success.
 *
 * Section assignment is managed on the Section List page.
 */
export async function createAdviser(
  payload: AdviserCreatePayload
): Promise<CreateAdviserResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateAdviserCreatePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()
  const result = await provisionUser(service, {
    email: payload.email,
    fullName: payload.fullName,
    roleCode: "adviser",
    isActive: payload.isActive,
  })
  if (!result.ok) return result
  return { ok: true }
}

/**
 * Update an adviser profile.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Update `app_user` SET full_name, email, is_active WHERE app_user_id = adviserUserId.
 * 3. If email changes, sync `auth.users` email via Supabase Admin API if needed.
 * 4. Return `{ ok: true }` on success.
 *
 * Section assignment is managed on the Section List page.
 */
export async function updateAdviser(
  payload: AdviserEditPayload
): Promise<UpdateAdviserResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateAdviserEditPayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()

  const { data: current, error: currentError } = await service
    .from("app_user")
    .select("email, is_active")
    .eq("app_user_id", payload.adviserUserId)
    .maybeSingle()

  if (currentError || !current) {
    console.error("[updateAdviser] target lookup failed", currentError)
    return { ok: false, error: "Facilitator not found." }
  }

  const nextEmail = payload.email.trim().toLowerCase()
  if (nextEmail !== (current.email ?? "").toLowerCase()) {
    const emailResult = await syncUserEmail(service, payload.adviserUserId, nextEmail)
    if (!emailResult.ok) return emailResult
  }

  const { error: updateError } = await service
    .from("app_user")
    .update({
      full_name: payload.fullName.trim(),
      email: nextEmail,
      is_active: payload.isActive,
    })
    .eq("app_user_id", payload.adviserUserId)

  if (updateError) {
    console.error("[updateAdviser] update failed", updateError)
    if ((updateError as { code?: string }).code === "23505") {
      return { ok: false, error: "That email is already in use." }
    }
    return { ok: false, error: "Failed to update the facilitator." }
  }

  if (current.is_active !== payload.isActive) {
    const banResult = await syncAuthBan(service, payload.adviserUserId, payload.isActive)
    if (!banResult.ok) return banResult
  }

  return { ok: true }
}

/**
 * Archive-only: deactivates the facilitator's account (is_active=false + auth
 * ban + login_session revoke). Never hard-deletes the `app_user` row. Sections
 * keep their `adviser_user_id` unchanged — reassignment is handled on the
 * Section List page.
 */
export async function deleteAdviser(
  adviserUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  if (!adviserUserId) {
    return { ok: false, error: "Adviser ID is required." }
  }

  const service = createSupabaseServiceClient()
  return deactivateUser(service, adviserUserId)
}
