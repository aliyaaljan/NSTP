"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  ADVISER_LIST_ALL_SECTIONS,
  ADVISER_LIST_SELECT,
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
import type { ImportAdvisersResult } from "@/lib/admin/adviser-import"
import {
  validateAdviserEditPayload,
  type AdviserEditPayload,
  type UpdateAdviserResult,
} from "@/lib/admin/adviser-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"

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
      lookupId("appeal_status", "open"),
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
    return { name: "Adviser Test Account", role: "NSTP Admin" }
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Adviser Test Account", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: isAdmin ? "Adviser Test Account" : appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
  }
}

/**
 * CSV import for admin adviser list.
 *
 * Backend checklist:
 * 1. Parse CSV → `AdviserCsvImportRow[]` (see `lib/admin/adviser-import.ts`).
 * 2. Create auth user + `app_user` (role = adviser) or match existing by email.
 * 3. Resolve `section_name` → `section.section_id` and set `adviser_user_id`.
 * 4. Return `{ ok: true, imported, skipped }`.
 */
export async function importAdvisersFromCsv(
  formData: FormData
): Promise<ImportAdvisersResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file to import." }
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "Only .csv files are accepted." }
  }

  // TODO(backend): parse CSV using ADVISER_CSV_COLUMNS, then upsert rows.
  const _preview = await file.text()
  console.info("[importAdvisersFromCsv] pending implementation", {
    fileName: file.name,
    bytes: file.size,
    previewLines: _preview.split("\n").slice(0, 3),
  })

  return {
    ok: false,
    error:
      "Import is not available yet. Backend CSV import handler still needs to be implemented.",
  }
}

/**
 * Update an adviser profile and section assignments.
 *
 * Backend checklist:
 * 1. Validate admin role (already done below).
 * 2. Update `app_user` SET full_name, email, is_active WHERE app_user_id = adviserUserId.
 * 3. For each sectionId in payload.sectionIds, SET `section.adviser_user_id = adviserUserId`.
 * 4. Clear `section.adviser_user_id` on sections previously assigned to this adviser but omitted.
 * 5. If email changes, sync `auth.users` email via Supabase Admin API if needed.
 * 6. Return `{ ok: true }` on success.
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

  // TODO(backend): implement adviser update.
  console.info("[updateAdviser] pending implementation", {
    adviserUserId: payload.adviserUserId,
    sectionIds: payload.sectionIds,
    isActive: payload.isActive,
  })

  return {
    ok: false,
    error:
      "Edit is not available yet. Backend handler still needs to be implemented.",
  }
}

/**
 * Remove an adviser account.
 *
 * Backend checklist:
 * 1. Reassign or clear `section.adviser_user_id` for their sections.
 * 2. Soft-delete via `is_active = false` or hard-delete per product rules.
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

  // TODO(backend): implement adviser deletion / deactivation.
  console.info("[deleteAdviser] pending implementation", { adviserUserId })

  return {
    ok: false,
    error:
      "Delete is not available yet. Backend handler still needs to be implemented.",
  }
}
