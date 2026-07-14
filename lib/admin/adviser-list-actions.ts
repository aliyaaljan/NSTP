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
  type AdviserProfileLookups,
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
  findAppUserByEmail,
  provisionUser,
  resolveRoleIdByCode,
  syncAuthBan,
  syncUserEmail,
} from "@/lib/admin/user-provision"
import { ensureFacilitatorClass } from "@/lib/admin/class-provision"
import {
  getClassReassignmentData,
  reassignClass,
  type ClassReassignmentData,
  type ReassignClassMode,
  type ReassignClassOutcome,
} from "@/lib/admin/class-reassign"
import {
  getAdviserDeleteImpact,
  isForeignKeyViolation,
  type DeleteImpact,
} from "@/lib/admin/dependent-checks"
import { formatClassLabel } from "@/lib/shared/class-label"
import { mapRows, parseImportFile } from "@/lib/admin/import/parse"
import {
  getAdviserImportLookups,
  type AdviserImportLookups,
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
  ADVISER_IMPORT_COLUMNS,
  validateAdviserImportValues,
  type AdviserImportRow,
  type ParseAdviserImportResult,
  type RevalidateAdviserRowsResult,
} from "@/lib/admin/adviser-import"

const SEMESTER_LABELS: Record<string, string> = {
  first: "1st Semester",
  second: "2nd Semester",
  midyear: "Midyear",
}

/**
 * Fetches everything the admin adviser list page needs.
 *
 * Backend checklist:
 * 1. Keep returning `AdviserListPageData` — no UI changes required.
 * 2. Add term scoping (`term.is_active`) on `section` when multi-term is live.
 * 3. Move `filterAdviserListRows()` / pagination into SQL when the list grows large.
 */
export async function getAdviserListData(
  query: AdviserListQuery
): Promise<AdviserListPageData> {
  const role = await getAppUserRole()
  if (role !== "admin") throw new Error("Unauthorized")

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
    enrollment(enrollment_id, section:section_id(adviser_user_id))
  `

  const [advisersRes, sectionsRes, appealsRes, collegesRes, componentsRes, termsRes, { data: authData }] =
    await Promise.all([
      adviserQuery,
      supabase
        .from("section")
        .select("section_id, course_code, adviser_user_id, term:term_id(school_year), app_user:adviser_user_id(full_name)"),
      supabase
        .from("appeal")
        .select(pendingAppealsSelect)
        .in("appeal_status_id", [openStatusId, underReviewStatusId]),
      supabase.from("college").select("college_id, code, name").order("name"),
      supabase.from("nstp_component").select("nstp_component_id, code, name").order("name"),
      supabase
        .from("term")
        .select("school_year, semester, is_active")
        .order("school_year", { ascending: false }),
      supabase.auth.getUser(),
    ])
  const activeTerm = (termsRes.data ?? []).find((t) => t.is_active) ?? termsRes.data?.[0]

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

  const sections: AdviserListSectionOption[] = (
    sectionsRes.data as unknown as {
      section_id: string
      course_code: string
      adviser_user_id?: string
      term: { school_year: string } | null
      app_user: { full_name: string } | null
    }[]
    ?? []
  )
    .map((section) => ({
      sectionId: section.section_id,
      label: formatClassLabel({
        courseCode: section.course_code,
        facilitatorName: section.app_user?.full_name,
        schoolYear: section.term?.school_year,
      }),
      courseCode: section.course_code,
      adviserUserId: section.adviser_user_id ?? "",
      adviserName: section.app_user?.full_name ?? "Unassigned",
      schoolYear: section.term?.school_year ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const lookups: AdviserProfileLookups = {
    colleges: ((collegesRes.data ?? []) as { college_id: string; code: string; name: string }[]).map(
      (c) => ({ id: c.college_id, label: c.name })
    ),
    components: ((componentsRes.data ?? []) as {
      nstp_component_id: string
      code: string
      name: string
    }[]).map((c) => ({ id: c.nstp_component_id, label: c.name })),
  }

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: AdviserListMeta = {
    academicYear: activeTerm?.school_year ?? "2025-2026",
    semester: SEMESTER_LABELS[activeTerm?.semester ?? "second"] ?? "2nd Semester",
  }

  return {
    advisers,
    sections,
    lookups,
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

  // Facilitator profile metadata must land BEFORE ensureFacilitatorClass below —
  // it derives the class's course_code from nstp_component_id.
  const { error: metadataError } = await service
    .from("app_user")
    .update({
      college_id: payload.collegeId,
      nstp_component_id: payload.nstpComponentId,
      partnership_type: payload.partnershipType?.trim() || null,
    })
    .eq("app_user_id", result.userId)
  if (metadataError) {
    console.error("[createAdviser] metadata update failed", metadataError)
    return {
      ok: false,
      error: "Facilitator account created, but their profile details could not be saved.",
    }
  }

  // One class per facilitator per term: auto-create theirs for the active term.
  if (payload.isActive !== false) {
    const classResult = await ensureFacilitatorClass(service, result.userId)
    if (!classResult.ok) {
      console.error("[createAdviser] class provisioning failed", classResult.error)
      return {
        ok: false,
        error: `Facilitator account created, but their class could not be created: ${classResult.error}`,
      }
    }
  }
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
    .select("email, is_active, nstp_component_id")
    .eq("app_user_id", payload.adviserUserId)
    .maybeSingle()

  if (currentError || !current) {
    console.error("[updateAdviser] target lookup failed", currentError)
    return { ok: false, error: "Facilitator not found." }
  }

  const nextEmail = payload.email.trim().toLowerCase()

  // app_user commits FIRST: a 23505 (duplicate email) fails cleanly here with
  // nothing else touched, instead of leaving auth.users ahead of app_user.
  const { error: updateError } = await service
    .from("app_user")
    .update({
      full_name: payload.fullName.trim(),
      email: nextEmail,
      is_active: payload.isActive,
      college_id: payload.collegeId,
      nstp_component_id: payload.nstpComponentId,
      partnership_type: payload.partnershipType?.trim() || null,
    })
    .eq("app_user_id", payload.adviserUserId)

  if (updateError) {
    console.error("[updateAdviser] update failed", updateError)
    if ((updateError as { code?: string }).code === "23505") {
      return { ok: false, error: "That email is already in use." }
    }
    return { ok: false, error: "Failed to update the facilitator." }
  }

  // auth email sync AFTER; revert app_user.email if auth rejects it, so the
  // two never end up out of lockstep.
  if (nextEmail !== (current.email ?? "").toLowerCase()) {
    const emailResult = await syncUserEmail(service, payload.adviserUserId, nextEmail)
    if (!emailResult.ok) {
      await service
        .from("app_user")
        .update({ email: current.email })
        .eq("app_user_id", payload.adviserUserId)
      return emailResult
    }
  }

  // auth ban sync AFTER; revert is_active if the ban call fails, preserving
  // the documented ban ⇔ !is_active invariant.
  if (current.is_active !== payload.isActive) {
    const banResult = await syncAuthBan(service, payload.adviserUserId, payload.isActive)
    if (!banResult.ok) {
      await service
        .from("app_user")
        .update({ is_active: current.is_active })
        .eq("app_user_id", payload.adviserUserId)
      return banResult
    }
  }

  // Reactivation re-provisions/restores the facilitator's class.
  if (!current.is_active && payload.isActive) {
    const classResult = await ensureFacilitatorClass(service, payload.adviserUserId)
    if (!classResult.ok) {
      return {
        ok: false,
        error: `Facilitator reactivated, but their class could not be created: ${classResult.error}`,
      }
    }
  } else if (
    payload.isActive &&
    current.nstp_component_id !== payload.nstpComponentId
  ) {
    // The component changed while active — ensureFacilitatorClass refreshes
    // the class's course_code from the new component.
    const classResult = await ensureFacilitatorClass(service, payload.adviserUserId)
    if (!classResult.ok) {
      return {
        ok: false,
        error: `Facilitator updated, but their class could not be refreshed: ${classResult.error}`,
      }
    }
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

/** Everything the ReassignClassModal needs for one facilitator's class(es). */
export async function getClassReassignmentDataAction(
  adviserUserId: string
): Promise<{ ok: true; data: ClassReassignmentData } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  const service = createSupabaseServiceClient()
  return { ok: true, data: await getClassReassignmentData(service, adviserUserId) }
}

/** Transfer a class to a free facilitator, or merge its students into a busy one's class. */
export async function reassignClassAction(input: {
  sectionId: string
  targetAdviserUserId: string
  mode: ReassignClassMode
}): Promise<ReassignClassOutcome | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  const service = createSupabaseServiceClient()
  return reassignClass(service, input)
}

export async function getAdviserDeleteImpactAction(
  adviserUserId: string
): Promise<{ ok: true; impact: DeleteImpact } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  const service = createSupabaseServiceClient()
  return { ok: true, impact: await getAdviserDeleteImpact(service, adviserUserId) }
}

/**
 * Hard step: only inactive facilitators, and only once no historical records
 * reference their account (classes advised, recorded events, resolved
 * appeals, audit trail, etc — see getUserAccountBlockers). Deletes the
 * `app_user` row and the auth.users account; admins are refused outright
 * (managed on Access Control instead).
 */
export async function hardDeleteAdviser(
  adviserUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }
  if (!adviserUserId) return { ok: false, error: "Adviser ID is required." }

  const service = createSupabaseServiceClient()

  const impact = await getAdviserDeleteImpact(service, adviserUserId)
  if (impact.state === "blocked") {
    return {
      ok: false,
      error:
        impact.lifecycleBlocked ??
        "Cannot delete: this account is referenced by historical records, which are never deleted.",
    }
  }

  // login_session has no cascade (operational rows) — clear it first.
  await service.from("login_session").delete().eq("app_user_id", adviserUserId)

  // app_user row first, auth user second (no FK between them). If the row is
  // already gone (retry after a half-completed delete), skip straight to auth.
  const { data: existing } = await service
    .from("app_user")
    .select("app_user_id")
    .eq("app_user_id", adviserUserId)
    .maybeSingle()
  if (existing) {
    const { error } = await service.from("app_user").delete().eq("app_user_id", adviserUserId)
    if (error) {
      if (isForeignKeyViolation(error)) {
        return { ok: false, error: "Cannot delete: other records still reference this account." }
      }
      console.error("[hardDeleteAdviser] app_user delete failed", error)
      return { ok: false, error: "Failed to delete the facilitator." }
    }
  }

  const { error: authError } = await service.auth.admin.deleteUser(adviserUserId)
  if (authError && authError.status !== 404) {
    console.error("[hardDeleteAdviser] auth delete failed", authError)
    return {
      ok: false,
      error:
        "Account data was deleted, but the sign-in account could not be removed. Run Delete again to finish.",
    }
  }

  return { ok: true }
}

/** Max upload size; also bounded by Next's 1 MB server-action body limit. */
const IMPORT_MAX_FILE_BYTES = 1024 * 1024

function warnUnknownAdviserLookups(
  row: AdviserImportRow,
  lookups: AdviserImportLookups,
  issues: RowIssue[]
) {
  if (row.college && !lookups.college(row.college)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown college "${row.college}" — will be left blank.`,
      severity: "warning",
      code: "unknown_college",
    })
  }
  if (row.component && !lookups.component(row.component)) {
    issues.push({
      rowNumber: row.rowNumber,
      message: `Unknown component "${row.component}" — will be left blank.`,
      severity: "warning",
      code: "unknown_component",
    })
  }
}

/** Phase 1 of the facilitator import: parse + validate, no writes. */
export async function parseAdviserImport(
  formData: FormData
): Promise<ParseAdviserImportResult> {
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

  const { rows, missingHeaders } = mapRows(table, ADVISER_IMPORT_COLUMNS)
  if (missingHeaders.length > 0) {
    return { ok: false, error: `Missing required column(s): ${missingHeaders.join(", ")}.` }
  }
  if (rows.length === 0) {
    return { ok: false, error: "The file has no data rows." }
  }

  const service = createSupabaseServiceClient()
  const lookups = await getAdviserImportLookups(service)

  const { validRows, errorRows, issues } = runAdviserRowPipeline(rows, lookups)

  return { ok: true, totalRows: rows.length, validRows, errorRows, issues }
}

/** Shared validate → warn pipeline used by both parseAdviserImport (phase 1,
 * all rows) and revalidateAdviserRows (inline-fix re-check, a few rows). */
function runAdviserRowPipeline(
  rows: { rowNumber: number; values: Record<string, string> }[],
  lookups: AdviserImportLookups
): { validRows: AdviserImportRow[]; errorRows: ErrorRow[]; issues: RowIssue[] } {
  const issues: RowIssue[] = []
  const errorRows: ErrorRow[] = []
  const validRows: AdviserImportRow[] = []
  for (const { rowNumber, values } of rows) {
    const validated = validateAdviserImportValues(values, rowNumber)
    if (!validated.row) {
      issues.push(...validated.issues)
      errorRows.push({ rowNumber, values, issues: validated.issues })
      continue
    }
    warnUnknownAdviserLookups(validated.row, lookups, issues)
    validRows.push(validated.row)
  }
  return { validRows, errorRows, issues }
}

/**
 * Re-runs the parse pipeline for a handful of rows whose values were edited
 * inline in the preview — lets the admin fix errors without re-uploading.
 */
export async function revalidateAdviserRows(input: {
  rows: { rowNumber: number; values: Record<string, string> }[]
}): Promise<RevalidateAdviserRowsResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    return { ok: false, error: "No rows to re-check." }
  }
  if (input.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `Send at most ${IMPORT_CHUNK_SIZE} rows per request.` }
  }

  const service = createSupabaseServiceClient()
  const lookups = await getAdviserImportLookups(service)
  const result = runAdviserRowPipeline(input.rows, lookups)
  return { ok: true, ...result }
}

/**
 * Phase 2 of the facilitator import: upsert one chunk of rows.
 * Existing students are promoted to adviser (audited via role_change);
 * existing admins keep their role and only gain the metadata columns.
 * Never changes is_active on existing users.
 */
export async function commitAdviserImportChunk(input: {
  rows: AdviserImportRow[]
}): Promise<{ ok: true; result: ImportCommitResult } | { ok: false; error: string }> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized" }

  if (!Array.isArray(input.rows)) return { ok: false, error: "Invalid rows payload." }
  if (input.rows.length === 0) return { ok: true, result: emptyCommitResult() }
  if (input.rows.length > IMPORT_CHUNK_SIZE) {
    return { ok: false, error: `Send at most ${IMPORT_CHUNK_SIZE} rows per request.` }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user: actingUser },
  } = await supabase.auth.getUser()
  if (!actingUser) return { ok: false, error: "Unauthorized" }

  const service = createSupabaseServiceClient()
  const lookups = await getAdviserImportLookups(service)
  const adviserRoleId = await resolveRoleIdByCode(service, "adviser")
  if (!adviserRoleId) return { ok: false, error: "Adviser role not found." }

  const result = emptyCommitResult()

  for (const raw of input.rows) {
    // Phase-1 output is client-held: re-validate and re-normalize everything.
    const validated = validateAdviserImportValues(
      {
        full_name: raw.fullName ?? "",
        college: raw.college ?? "",
        component: raw.component ?? "",
        partnership_type: raw.partnershipType ?? "",
        email: raw.email ?? "",
      },
      raw.rowNumber ?? 0
    )
    if (!validated.row) {
      result.skipped += 1
      result.issues.push(...validated.issues)
      continue
    }
    const row = validated.row

    const metadata = {
      college_id: row.college ? lookups.college(row.college) : null,
      nstp_component_id: row.component ? lookups.component(row.component) : null,
      partnership_type: row.partnershipType || null,
    }

    const existing = await findAppUserByEmail(service, row.email)

    if (!existing) {
      const provisioned = await provisionUser(service, {
        email: row.email,
        fullName: row.fullName,
        roleCode: "adviser",
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
      const { error } = await service
        .from("app_user")
        .update(metadata)
        .eq("app_user_id", provisioned.userId)
      if (error) {
        console.error("[commitAdviserImportChunk] metadata update failed", error)
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Created ${row.email}'s account, but failed to save facilitator metadata (college/component/partnership type).`,
          severity: "warning",
          code: "profile_update_failed",
        })
      }
      const provisionedClass = await ensureFacilitatorClass(service, provisioned.userId)
      if (!provisionedClass.ok) {
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Created ${row.email}'s account, but their class could not be created: ${provisionedClass.error}`,
          severity: "warning",
          code: "class_provision_failed",
        })
      }
      result.imported += 1
      continue
    }

    if (existing.roleCode === "admin") {
      // Admins keep their role and name; only the facilitator metadata lands.
      const { error } = await service
        .from("app_user")
        .update(metadata)
        .eq("app_user_id", existing.appUserId)
      if (error) {
        console.error("[commitAdviserImportChunk] admin metadata update failed", error)
        result.skipped += 1
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Failed to update ${row.email}.`,
          severity: "error",
          code: "profile_update_failed",
        })
      } else {
        const adminClass = await ensureFacilitatorClass(service, existing.appUserId)
        if (!adminClass.ok) {
          result.issues.push({
            rowNumber: row.rowNumber,
            message: `Updated ${row.email}, but their class could not be created: ${adminClass.error}`,
            severity: "warning",
            code: "class_provision_failed",
          })
        }
        result.updated += 1
      }
      continue
    }

    const promote = existing.roleCode === "student"
    const { error } = await service
      .from("app_user")
      .update({
        full_name: row.fullName,
        ...(promote ? { role_id: adviserRoleId } : {}),
        ...metadata,
      })
      .eq("app_user_id", existing.appUserId)

    if (error) {
      console.error("[commitAdviserImportChunk] update failed", error)
      result.skipped += 1
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `Failed to update ${row.email}.`,
        severity: "error",
        code: "profile_update_failed",
      })
      continue
    }

    if (promote) {
      // Audit the promotion. Best-effort: the role change already succeeded.
      const { error: auditError } = await service.from("role_change").insert({
        target_user_id: existing.appUserId,
        changed_by_user_id: actingUser.id,
        old_role_id: existing.roleId,
        new_role_id: adviserRoleId,
        reason: "Facilitator roster import",
      })
      if (auditError) {
        console.error("[commitAdviserImportChunk] role_change insert failed", auditError)
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Promoted ${row.email} from student to facilitator, but the audit record failed to save.`,
          severity: "warning",
          code: "role_promotion_audit_failed",
        })
      } else {
        result.issues.push({
          rowNumber: row.rowNumber,
          message: `Promoted ${row.email} from student to facilitator.`,
          severity: "info",
          code: "role_promoted",
        })
      }
    }

    const updatedClass = await ensureFacilitatorClass(service, existing.appUserId)
    if (!updatedClass.ok) {
      result.issues.push({
        rowNumber: row.rowNumber,
        message: `Updated ${row.email}, but their class could not be created: ${updatedClass.error}`,
        severity: "warning",
        code: "class_provision_failed",
      })
    }
    result.updated += 1
  }

  return { ok: true, result }
}
