"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { lookupId } from "@/lib/lookups"
import {
  buildFormListRows,
  buildFormListSummary,
  buildSampleFormRows,
  FORM_REQUIREMENT_LIST_SELECT,
  type AdminCurrentUser,
  type FormListMeta,
  type FormListPageData,
  type FormListQuery,
  type FormListSectionDbRow,
  type FormListSectionOption,
  type FormRequirementExclusionDbRow,
  type FormRequirementListDbRow,
  type FormSubmissionCountDbRow,
} from "@/lib/admin/form-list"
import {
  normalizeFormSectionId,
  validateFormCreatePayload,
  validateFormEditPayload,
  type CreateFormResult,
  type DeleteFormResult,
  type FormCreatePayload,
  type FormEditPayload,
  type UpdateFormResult,
} from "@/lib/admin/form-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { uploadFormFile, deleteFormFile } from "@/lib/forms/storage"
import {
  isAcceptedFormImportFile,
  titleFromImportFileName,
  type ImportFormResult,
} from "@/lib/admin/form-import"

/**
 * Fetches everything the admin forms page needs.
 *
 * Backend checklist:
 * 1. Keep returning `FormListPageData` — no UI changes required.
 * 2. Add term scoping on `section` / `enrollment` when multi-term is live.
 * 3. Move `filterFormListRows()` / `buildFormListRows()` into SQL when the list grows.
 * 4. Replace hardcoded `meta` with a `term` table lookup.
 */
export async function getFormListData(query: FormListQuery): Promise<FormListPageData> {
  const supabase = await createSupabaseServerClient()
  const activeStatusId = await lookupId("enrollment_status", "active")

  const [
    requirementsRes,
    sectionsRes,
    exclusionsRes,
    enrollmentsRes,
    submissionsRes,
    { data: authData },
  ] = await Promise.all([
    supabase
      .from("form_requirement")
      .select(FORM_REQUIREMENT_LIST_SELECT)
      .order("title", { ascending: true }),
    supabase
      .from("section")
      .select("section_id, name, adviser_user_id, app_user:adviser_user_id(full_name)")
      .order("name"),
    supabase.from("form_requirement_exclusion").select("section_id, form_requirement_id"),
    supabase
      .from("enrollment")
      .select("section_id")
      .eq("enrollment_status_id", activeStatusId),
    supabase
      .from("form_submission")
      .select("form_requirement_id, enrollment:enrollment_id(section_id)"),
    supabase.auth.getUser(),
  ])

  if (requirementsRes.error) {
    console.error("[getFormListData] requirements query failed", requirementsRes.error)
  }
  if (sectionsRes.error) {
    console.error("[getFormListData] sections query failed", sectionsRes.error)
  }

  const sections = (sectionsRes.data ?? []) as unknown as FormListSectionDbRow[]
  const enrollmentCounts = new Map<string, number>()
  for (const enrollment of enrollmentsRes.data ?? []) {
    const sectionId = enrollment.section_id as string
    enrollmentCounts.set(sectionId, (enrollmentCounts.get(sectionId) ?? 0) + 1)
  }

  const submissionCounts = new Map<string, number>()
  for (const submission of (submissionsRes.data ?? []) as unknown as FormSubmissionCountDbRow[]) {
    const enrollment = submission.enrollment as { section_id: string } | { section_id: string }[] | null
    const sectionId = Array.isArray(enrollment) ? enrollment[0]?.section_id : enrollment?.section_id
    if (!sectionId) continue
    const key = `${submission.form_requirement_id}:${sectionId}`
    submissionCounts.set(key, (submissionCounts.get(key) ?? 0) + 1)
  }

  const sectionOptions: FormListSectionOption[] = sections.map((section) => ({
    sectionId: section.section_id,
    name: section.name,
  }))

  const forms = [
    ...buildSampleFormRows(sectionOptions),
    ...buildFormListRows(
      (requirementsRes.data ?? []) as unknown as FormRequirementListDbRow[],
      sections,
      (exclusionsRes.data ?? []) as FormRequirementExclusionDbRow[],
      enrollmentCounts,
      submissionCounts
    ),
  ]

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  const meta: FormListMeta = {
    // TODO(backend): read from `term` where is_active = true
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }

  return {
    forms,
    sections: sectionOptions,
    summary: buildFormListSummary(forms),
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
 * Creates a global or section-specific form requirement.
 * Maps to `form_requirement` insert via service client.
 */
export async function createForm(payload: FormCreatePayload): Promise<CreateFormResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateFormCreatePayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Not authenticated" }
  }

  const service = createSupabaseServiceClient()
  const sectionId = normalizeFormSectionId(payload.sectionId)

  const { error } = await service.from("form_requirement").insert({
    section_id: sectionId,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    due_date: payload.dueDate,
    created_by_user_id: user.id,
    is_active: true,
  })

  if (error) {
    console.error("[createForm]", error)
    return { ok: false, error: "Failed to create form." }
  }

  return { ok: true }
}

/**
 * Updates an existing form requirement.
 * Global requirements update the catalog row; section-specific rows update in place.
 */
export async function updateForm(payload: FormEditPayload): Promise<UpdateFormResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const validationError = validateFormEditPayload(payload)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const service = createSupabaseServiceClient()
  const sectionId = normalizeFormSectionId(payload.sectionId)

  const { data: existing, error: fetchError } = await service
    .from("form_requirement")
    .select("form_requirement_id, section_id")
    .eq("form_requirement_id", payload.formRequirementId)
    .maybeSingle()

  if (fetchError || !existing) {
    console.error("[updateForm] fetch failed", fetchError)
    return { ok: false, error: "Form not found." }
  }

  const { error } = await service
    .from("form_requirement")
    .update({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      due_date: payload.dueDate,
      section_id: sectionId,
    })
    .eq("form_requirement_id", payload.formRequirementId)

  if (error) {
    console.error("[updateForm]", error)
    return { ok: false, error: "Failed to update form." }
  }

  return { ok: true }
}

/**
 * Removes a form from the admin list.
 * - Section-specific requirements → `is_active = false`
 * - Global requirement on one section → `form_requirement_exclusion` row
 */
export async function deleteForm(
  formRequirementId: string,
  sectionId: string,
  isGlobal: boolean
): Promise<DeleteFormResult> {
  if (formRequirementId.startsWith("sample-")) {
    return { ok: false, error: "Sample rows cannot be deleted." }
  }
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Not authenticated" }
  }

  const service = createSupabaseServiceClient()

  if (isGlobal) {
    const { error } = await service.from("form_requirement_exclusion").upsert(
      {
        section_id: sectionId,
        form_requirement_id: formRequirementId,
        created_by_user_id: user.id,
      },
      { onConflict: "section_id,form_requirement_id" }
    )

    if (error) {
      console.error("[deleteForm] exclusion", error)
      return { ok: false, error: "Failed to remove form from this section." }
    }

    return { ok: true }
  }

  const { error } = await service
    .from("form_requirement")
    .update({ is_active: false })
    .eq("form_requirement_id", formRequirementId)
    .eq("section_id", sectionId)

  if (error) {
    console.error("[deleteForm] deactivate", error)
    return { ok: false, error: "Failed to delete form." }
  }

  return { ok: true }
}

/**
 * Imports a PDF or Word document as a form template.
 * Uploads to Storage, then inserts `form_requirement` with template fields.
 */
export async function importFormTemplate(formData: FormData): Promise<ImportFormResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a PDF or Word document to import." }
  }

  if (!isAcceptedFormImportFile(file.name)) {
    return { ok: false, error: "Only .pdf, .doc, and .docx files are accepted." }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Not authenticated" }
  }

  const titleField = formData.get("title")
  const title =
    typeof titleField === "string" && titleField.trim()
      ? titleField.trim()
      : titleFromImportFileName(file.name)

  const sectionField = formData.get("sectionId")
  const sectionId = normalizeFormSectionId(
    typeof sectionField === "string" ? sectionField : null
  )

  const dueDateField = formData.get("dueDate")
  const dueDate =
    typeof dueDateField === "string" && dueDateField.trim() ? dueDateField.trim() : null

  const buffer = Buffer.from(await file.arrayBuffer())
  const pathPrefix = sectionId ? `templates/${sectionId}` : "templates/global"
  const upload = await uploadFormFile(buffer, file.name, pathPrefix)

  if (!upload.ok) {
    return { ok: false, error: upload.error }
  }

  const service = createSupabaseServiceClient()
  const { data, error } = await service
    .from("form_requirement")
    .insert({
      section_id: sectionId,
      title,
      description: null,
      due_date: dueDate,
      created_by_user_id: user.id,
      is_active: true,
      template_storage_path: upload.storagePath,
      template_file_name: upload.sanitizedName,
      template_content_type: upload.contentType,
      template_file_size_byte: upload.fileSize,
    })
    .select("form_requirement_id")
    .single()

  if (error || !data) {
    await deleteFormFile(upload.storagePath)
    console.error("[importFormTemplate]", error)
    return { ok: false, error: "Failed to save imported form." }
  }

  return { ok: true, formRequirementId: data.form_requirement_id as string }
}
