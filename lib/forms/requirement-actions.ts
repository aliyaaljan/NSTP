"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import {
  uploadFormFile,
  deleteFormFile,
  getSignedUrl,
} from "@/lib/forms/storage"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormRequirement = {
  form_requirement_id: string
  section_id: string | null
  title: string
  description: string | null
  template_storage_path: string | null
  template_file_name: string | null
  template_content_type: string | null
  template_file_size_byte: number | null
  due_date: string | null
  is_active: boolean
  created_by_user_id: string
  created_at: string
  updated_at: string
}

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireAuth() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return { supabase, user }
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase.rpc("app_is_admin")
  if (!data) throw new Error("Admin access required")
}

async function requireAdvisesSection(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  sectionId: string
) {
  const { data } = await supabase.rpc("app_advises_section", {
    p_section_id: sectionId,
  })
  if (!data) throw new Error("You do not advise this section")
}

// ---------------------------------------------------------------------------
// Admin: create global default requirement
// ---------------------------------------------------------------------------

export async function createGlobalRequirement(
  title: string,
  description: string | null,
  dueDate: string | null,
  templateFile?: { buffer: Buffer; fileName: string }
): Promise<ActionResult<FormRequirement>> {
  try {
    const { supabase, user } = await requireAuth()
    await requireAdmin(supabase)

    const service = createSupabaseServiceClient()

    let templateFields: Record<string, unknown> = {}
    if (templateFile) {
      const upload = await uploadFormFile(
        templateFile.buffer,
        templateFile.fileName,
        "templates/global"
      )
      if (!upload.ok) return { ok: false, error: upload.error }
      templateFields = {
        template_storage_path: upload.storagePath,
        template_file_name: upload.sanitizedName,
        template_content_type: upload.contentType,
        template_file_size_byte: upload.fileSize,
      }
    }

    const { data, error } = await service
      .from("form_requirement")
      .insert({
        section_id: null,
        title,
        description,
        due_date: dueDate,
        created_by_user_id: user.id,
        ...templateFields,
      })
      .select()
      .single()

    if (error) {
      if (templateFields.template_storage_path) {
        await deleteFormFile(templateFields.template_storage_path as string)
      }
      console.error("[createGlobalRequirement]", error)
      return { ok: false, error: "Failed to create requirement" }
    }

    return { ok: true, data: data as FormRequirement }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Admin: update global default requirement
// ---------------------------------------------------------------------------

export async function updateGlobalRequirement(
  requirementId: string,
  updates: {
    title?: string
    description?: string | null
    dueDate?: string | null
    is_active?: boolean
  },
  newTemplate?: { buffer: Buffer; fileName: string }
): Promise<ActionResult<FormRequirement>> {
  try {
    const { supabase } = await requireAuth()
    await requireAdmin(supabase)

    const service = createSupabaseServiceClient()

    const { data: existing } = await service
      .from("form_requirement")
      .select("*")
      .eq("form_requirement_id", requirementId)
      .is("section_id", null)
      .single()

    if (!existing) return { ok: false, error: "Global requirement not found" }

    let templateFields: Record<string, unknown> = {}
    if (newTemplate) {
      const upload = await uploadFormFile(
        newTemplate.buffer,
        newTemplate.fileName,
        "templates/global"
      )
      if (!upload.ok) return { ok: false, error: upload.error }
      templateFields = {
        template_storage_path: upload.storagePath,
        template_file_name: upload.sanitizedName,
        template_content_type: upload.contentType,
        template_file_size_byte: upload.fileSize,
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (updates.title !== undefined) updatePayload.title = updates.title
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.dueDate !== undefined) updatePayload.due_date = updates.dueDate
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active

    const { data, error } = await service
      .from("form_requirement")
      .update({ ...updatePayload, ...templateFields })
      .eq("form_requirement_id", requirementId)
      .select()
      .single()

    if (error) {
      if (templateFields.template_storage_path) {
        await deleteFormFile(templateFields.template_storage_path as string)
      }
      console.error("[updateGlobalRequirement]", error)
      return { ok: false, error: "Failed to update requirement" }
    }

    if (newTemplate && existing.template_storage_path) {
      await deleteFormFile(existing.template_storage_path)
    }

    return { ok: true, data: data as FormRequirement }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: create section-specific requirement
// ---------------------------------------------------------------------------

export async function createSectionRequirement(
  sectionId: string,
  title: string,
  description: string | null,
  dueDate: string | null,
  templateFile?: { buffer: Buffer; fileName: string }
): Promise<ActionResult<FormRequirement>> {
  try {
    const { supabase, user } = await requireAuth()
    await requireAdvisesSection(supabase, sectionId)

    const service = createSupabaseServiceClient()

    let templateFields: Record<string, unknown> = {}
    if (templateFile) {
      const upload = await uploadFormFile(
        templateFile.buffer,
        templateFile.fileName,
        `templates/${sectionId}`
      )
      if (!upload.ok) return { ok: false, error: upload.error }
      templateFields = {
        template_storage_path: upload.storagePath,
        template_file_name: upload.sanitizedName,
        template_content_type: upload.contentType,
        template_file_size_byte: upload.fileSize,
      }
    }

    const { data, error } = await service
      .from("form_requirement")
      .insert({
        section_id: sectionId,
        title,
        description,
        due_date: dueDate,
        created_by_user_id: user.id,
        ...templateFields,
      })
      .select()
      .single()

    if (error) {
      if (templateFields.template_storage_path) {
        await deleteFormFile(templateFields.template_storage_path as string)
      }
      console.error("[createSectionRequirement]", error)
      return { ok: false, error: "Failed to create requirement" }
    }

    return { ok: true, data: data as FormRequirement }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: update section-specific requirement
// ---------------------------------------------------------------------------

export async function updateSectionRequirement(
  requirementId: string,
  sectionId: string,
  updates: {
    title?: string
    description?: string | null
    dueDate?: string | null
    is_active?: boolean
  },
  newTemplate?: { buffer: Buffer; fileName: string }
): Promise<ActionResult<FormRequirement>> {
  try {
    const { supabase } = await requireAuth()
    await requireAdvisesSection(supabase, sectionId)

    const service = createSupabaseServiceClient()

    const { data: existing } = await service
      .from("form_requirement")
      .select("*")
      .eq("form_requirement_id", requirementId)
      .eq("section_id", sectionId)
      .single()

    if (!existing) return { ok: false, error: "Section requirement not found" }

    let templateFields: Record<string, unknown> = {}
    if (newTemplate) {
      const upload = await uploadFormFile(
        newTemplate.buffer,
        newTemplate.fileName,
        `templates/${sectionId}`
      )
      if (!upload.ok) return { ok: false, error: upload.error }
      templateFields = {
        template_storage_path: upload.storagePath,
        template_file_name: upload.sanitizedName,
        template_content_type: upload.contentType,
        template_file_size_byte: upload.fileSize,
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (updates.title !== undefined) updatePayload.title = updates.title
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.dueDate !== undefined) updatePayload.due_date = updates.dueDate
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active

    const { data, error } = await service
      .from("form_requirement")
      .update({ ...updatePayload, ...templateFields })
      .eq("form_requirement_id", requirementId)
      .select()
      .single()

    if (error) {
      if (templateFields.template_storage_path) {
        await deleteFormFile(templateFields.template_storage_path as string)
      }
      console.error("[updateSectionRequirement]", error)
      return { ok: false, error: "Failed to update requirement" }
    }

    if (newTemplate && existing.template_storage_path) {
      await deleteFormFile(existing.template_storage_path)
    }

    return { ok: true, data: data as FormRequirement }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: exclude / include a global default for their section
// ---------------------------------------------------------------------------

export async function excludeGlobalRequirement(
  sectionId: string,
  requirementId: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAuth()
    await requireAdvisesSection(supabase, sectionId)

    const service = createSupabaseServiceClient()

    // Verify it is actually a global requirement
    const { data: req } = await service
      .from("form_requirement")
      .select("form_requirement_id")
      .eq("form_requirement_id", requirementId)
      .is("section_id", null)
      .eq("is_active", true)
      .maybeSingle()

    if (!req) return { ok: false, error: "Active global requirement not found" }

    const { error } = await service.from("form_requirement_exclusion").upsert(
      {
        section_id: sectionId,
        form_requirement_id: requirementId,
        created_by_user_id: user.id,
      },
      { onConflict: "section_id,form_requirement_id" }
    )

    if (error) {
      console.error("[excludeGlobalRequirement]", error)
      return { ok: false, error: "Failed to exclude requirement" }
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function includeGlobalRequirement(
  sectionId: string,
  requirementId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth()
    await requireAdvisesSection(supabase, sectionId)

    const service = createSupabaseServiceClient()

    const { error } = await service
      .from("form_requirement_exclusion")
      .delete()
      .eq("section_id", sectionId)
      .eq("form_requirement_id", requirementId)

    if (error) {
      console.error("[includeGlobalRequirement]", error)
      return { ok: false, error: "Failed to re-include requirement" }
    }

    return { ok: true, data: undefined }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Read: resolve requirements for a section
// ---------------------------------------------------------------------------

export async function getRequirementsForSection(
  sectionId: string
): Promise<ActionResult<FormRequirement[]>> {
  try {
    const { supabase } = await requireAuth()

    // Verify caller can read this section
    const { data: canRead } = await supabase.rpc("app_can_read_section", {
      p_section_id: sectionId,
    })
    if (!canRead) return { ok: false, error: "Access denied" }

    const service = createSupabaseServiceClient()

    // Global defaults not excluded for this section
    const { data: globals, error: gErr } = await service
      .from("form_requirement")
      .select("*")
      .is("section_id", null)
      .eq("is_active", true)

    if (gErr) {
      console.error("[getRequirementsForSection] globals", gErr)
      return { ok: false, error: "Failed to load global requirements" }
    }

    // Exclusions for this section
    const { data: exclusions } = await service
      .from("form_requirement_exclusion")
      .select("form_requirement_id")
      .eq("section_id", sectionId)

    const excludedIds = new Set(
      (exclusions ?? []).map((e: { form_requirement_id: string }) => e.form_requirement_id)
    )

    const activeGlobals = (globals ?? []).filter(
      (r: FormRequirement) => !excludedIds.has(r.form_requirement_id)
    )

    // Section-specific requirements
    const { data: sectionReqs, error: sErr } = await service
      .from("form_requirement")
      .select("*")
      .eq("section_id", sectionId)
      .eq("is_active", true)

    if (sErr) {
      console.error("[getRequirementsForSection] section", sErr)
      return { ok: false, error: "Failed to load section requirements" }
    }

    return {
      ok: true,
      data: [...activeGlobals, ...(sectionReqs ?? [])] as FormRequirement[],
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Read: get all global defaults (for admin management UI)
// ---------------------------------------------------------------------------

export async function getGlobalRequirements(): Promise<
  ActionResult<FormRequirement[]>
> {
  try {
    const { supabase } = await requireAuth()
    await requireAdmin(supabase)

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from("form_requirement")
      .select("*")
      .is("section_id", null)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[getGlobalRequirements]", error)
      return { ok: false, error: "Failed to load requirements" }
    }

    return { ok: true, data: (data ?? []) as FormRequirement[] }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Read: get exclusions for a section (for adviser management UI)
// ---------------------------------------------------------------------------

export async function getExclusionsForSection(
  sectionId: string
): Promise<ActionResult<string[]>> {
  try {
    const { supabase } = await requireAuth()
    await requireAdvisesSection(supabase, sectionId)

    const service = createSupabaseServiceClient()
    const { data, error } = await service
      .from("form_requirement_exclusion")
      .select("form_requirement_id")
      .eq("section_id", sectionId)

    if (error) {
      console.error("[getExclusionsForSection]", error)
      return { ok: false, error: "Failed to load exclusions" }
    }

    return {
      ok: true,
      data: (data ?? []).map((e: { form_requirement_id: string }) => e.form_requirement_id),
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Read: template download URL
// ---------------------------------------------------------------------------

export async function getTemplateDownloadUrl(
  requirementId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAuth()

    const service = createSupabaseServiceClient()
    const { data } = await service
      .from("form_requirement")
      .select("template_storage_path, section_id")
      .eq("form_requirement_id", requirementId)
      .maybeSingle()

    if (!data?.template_storage_path) {
      return { ok: false, error: "No template available for this requirement" }
    }

    if (data.section_id !== null) {
      const { data: canRead } = await supabase.rpc("app_can_read_section", {
        p_section_id: data.section_id,
      })
      if (!canRead) return { ok: false, error: "Access denied" }
    }

    return getSignedUrl(data.template_storage_path)
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
