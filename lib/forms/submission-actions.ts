"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { uploadFormFile, deleteFormFile, getSignedUrl } from "@/lib/forms/storage"
import { DATABASE_IDS } from "@/lib/constants"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormSubmission = {
  form_submission_id: string
  form_requirement_id: string
  enrollment_id: string
  storage_path: string
  file_name: string
  content_type: string | null
  file_size_byte: number | null
  form_submission_status_id: string
  reviewer_comment: string | null
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  submitted_at: string
  updated_at: string
}

export type StudentFormView = {
  form_requirement_id: string
  title: string
  description: string | null
  template_file_name: string | null
  has_template: boolean
  due_date: string | null
  status: "missing" | "submitted" | "approved" | "rejected"
  is_late: boolean
  submission: FormSubmission | null
}

export type SubmissionByFormEntry = {
  enrollment_id: string
  student_user_id: string
  full_name: string
  student_number: string | null
  status: "missing" | "submitted" | "approved" | "rejected"
  is_late: boolean
  submission: FormSubmission | null
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

// ---------------------------------------------------------------------------
// Student: submit / resubmit a form
// ---------------------------------------------------------------------------

export async function submitForm(
  enrollmentId: string,
  requirementId: string,
  fileBuffer: Buffer,
  originalFileName: string
): Promise<ActionResult<FormSubmission>> {
  try {
    const { supabase, user } = await requireAuth()
    const service = createSupabaseServiceClient()

    // §4a: verify the caller owns this enrollment
    const { data: enrollment } = await service
      .from("enrollment")
      .select("enrollment_id, section_id, student_user_id")
      .eq("enrollment_id", enrollmentId)
      .single()

    if (!enrollment || enrollment.student_user_id !== user.id) {
      return { ok: false, error: "You are not enrolled with this enrollment" }
    }

    // §4b: verify the requirement applies to this section (resolution rule)
    const { data: requirement } = await service
      .from("form_requirement")
      .select("form_requirement_id, section_id, is_active")
      .eq("form_requirement_id", requirementId)
      .eq("is_active", true)
      .maybeSingle()

    if (!requirement) {
      return { ok: false, error: "Requirement not found or inactive" }
    }

    if (requirement.section_id === null) {
      // Global default — check not excluded for this section
      const { data: exclusion } = await service
        .from("form_requirement_exclusion")
        .select("form_requirement_exclusion_id")
        .eq("section_id", enrollment.section_id)
        .eq("form_requirement_id", requirementId)
        .maybeSingle()

      if (exclusion) {
        return { ok: false, error: "This requirement is not required for your section" }
      }
    } else if (requirement.section_id !== enrollment.section_id) {
      return { ok: false, error: "This requirement does not belong to your section" }
    }

    // §6: read existing submission (for overwrite-latest)
    const { data: existing } = await service
      .from("form_submission")
      .select("form_submission_id, storage_path")
      .eq("form_requirement_id", requirementId)
      .eq("enrollment_id", enrollmentId)
      .maybeSingle()

    const oldStoragePath = existing?.storage_path ?? null

    // Upload new file
    const upload = await uploadFormFile(
      fileBuffer,
      originalFileName,
      `submissions/${enrollmentId}/${requirementId}`
    )
    if (!upload.ok) return { ok: false, error: upload.error }

    // Upsert submission row
    const { data: submission, error: dbError } = await service
      .from("form_submission")
      .upsert(
        {
          form_requirement_id: requirementId,
          enrollment_id: enrollmentId,
          storage_path: upload.storagePath,
          file_name: upload.sanitizedName,
          content_type: upload.contentType,
          file_size_byte: upload.fileSize,
          form_submission_status_id: DATABASE_IDS.formSubmissionStatuses.submitted,
          reviewer_comment: null,
          reviewed_by_user_id: null,
          reviewed_at: null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "form_requirement_id,enrollment_id" }
      )
      .select()
      .single()

    if (dbError) {
      // Rollback: delete the just-uploaded file
      await deleteFormFile(upload.storagePath)
      console.error("[submitForm] upsert failed", dbError)
      return { ok: false, error: "Failed to save submission" }
    }

    // Best-effort: delete old file after successful DB write
    if (oldStoragePath && oldStoragePath !== upload.storagePath) {
      await deleteFormFile(oldStoragePath)
    }

    return { ok: true, data: submission as FormSubmission }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Student: get my forms for a given enrollment
// ---------------------------------------------------------------------------

export async function getMyForms(
  enrollmentId: string
): Promise<ActionResult<StudentFormView[]>> {
  try {
    const { supabase, user } = await requireAuth()
    const service = createSupabaseServiceClient()

    const { data: enrollment } = await service
      .from("enrollment")
      .select("enrollment_id, section_id, student_user_id")
      .eq("enrollment_id", enrollmentId)
      .single()

    if (!enrollment || enrollment.student_user_id !== user.id) {
      return { ok: false, error: "Access denied" }
    }

    // Resolve requirements for this section
    const { data: globals } = await service
      .from("form_requirement")
      .select("*")
      .is("section_id", null)
      .eq("is_active", true)

    const { data: exclusions } = await service
      .from("form_requirement_exclusion")
      .select("form_requirement_id")
      .eq("section_id", enrollment.section_id)

    const excludedIds = new Set(
      (exclusions ?? []).map((e: { form_requirement_id: string }) => e.form_requirement_id)
    )

    const { data: sectionReqs } = await service
      .from("form_requirement")
      .select("*")
      .eq("section_id", enrollment.section_id)
      .eq("is_active", true)

    const requirements = [
      ...(globals ?? []).filter(
        (r: { form_requirement_id: string }) => !excludedIds.has(r.form_requirement_id)
      ),
      ...(sectionReqs ?? []),
    ]

    if (requirements.length === 0) {
      return { ok: true, data: [] }
    }

    // Get all submissions for this enrollment
    const reqIds = requirements.map((r: { form_requirement_id: string }) => r.form_requirement_id)
    const { data: submissions } = await service
      .from("form_submission")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .in("form_requirement_id", reqIds)

    const submissionMap = new Map<string, FormSubmission>()
    for (const s of (submissions ?? []) as FormSubmission[]) {
      submissionMap.set(s.form_requirement_id, s)
    }

    // Status code lookup
    const statusCodes = await getStatusCodeMap(service)
    const now = new Date()

    const views: StudentFormView[] = requirements.map((req: any) => {
      const sub = submissionMap.get(req.form_requirement_id) ?? null
      let status: StudentFormView["status"] = "missing"
      if (sub) {
        status = statusCodes.get(sub.form_submission_status_id) ?? "submitted"
      }

      const isLate =
        req.due_date != null &&
        (status === "missing"
          ? now > new Date(req.due_date + "T23:59:59+08:00")
          : sub != null &&
            new Date(sub.submitted_at) > new Date(req.due_date + "T23:59:59+08:00"))

      return {
        form_requirement_id: req.form_requirement_id,
        title: req.title,
        description: req.description,
        template_file_name: req.template_file_name,
        has_template: req.template_storage_path != null,
        due_date: req.due_date,
        status,
        is_late: isLate,
        submission: sub,
      }
    })

    return { ok: true, data: views }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Student: get download URL for own submission
// ---------------------------------------------------------------------------

export async function getMySubmissionUrl(
  submissionId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireAuth()
    const service = createSupabaseServiceClient()

    const { data: sub } = await service
      .from("form_submission")
      .select("storage_path, enrollment_id, enrollment:enrollment!inner(student_user_id)")
      .eq("form_submission_id", submissionId)
      .maybeSingle()

    if (!sub) return { ok: false, error: "Submission not found" }

    const enrollment = sub.enrollment as unknown as { student_user_id: string }
    if (enrollment.student_user_id !== user.id) {
      const { data: canAccess } = await supabase.rpc("app_can_access_enrollment", {
        p_enrollment_id: sub.enrollment_id,
      })
      if (!canAccess) {
        return { ok: false, error: "Access denied" }
      }
    }

    return getSignedUrl(sub.storage_path)
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: get submissions grouped by form for a section
// ---------------------------------------------------------------------------

export async function getSubmissionsByForm(
  sectionId: string
): Promise<
  ActionResult<
    {
      requirement: { form_requirement_id: string; title: string; due_date: string | null }
      entries: SubmissionByFormEntry[]
    }[]
  >
> {
  try {
    const { supabase } = await requireAuth()
    const { data: advises } = await supabase.rpc("app_advises_section", {
      p_section_id: sectionId,
    })
    if (!advises) return { ok: false, error: "Access denied" }

    const service = createSupabaseServiceClient()

    // Resolve requirements
    const { data: globals } = await service
      .from("form_requirement")
      .select("form_requirement_id, title, due_date")
      .is("section_id", null)
      .eq("is_active", true)

    const { data: exclusions } = await service
      .from("form_requirement_exclusion")
      .select("form_requirement_id")
      .eq("section_id", sectionId)

    const excludedIds = new Set(
      (exclusions ?? []).map((e: { form_requirement_id: string }) => e.form_requirement_id)
    )

    const { data: sectionReqs } = await service
      .from("form_requirement")
      .select("form_requirement_id, title, due_date")
      .eq("section_id", sectionId)
      .eq("is_active", true)

    const requirements = [
      ...(globals ?? []).filter(
        (r: { form_requirement_id: string }) => !excludedIds.has(r.form_requirement_id)
      ),
      ...(sectionReqs ?? []),
    ] as { form_requirement_id: string; title: string; due_date: string | null }[]

    if (requirements.length === 0) {
      return { ok: true, data: [] }
    }

    // Get all enrolled students in this section
    const { data: enrollments } = await service
      .from("enrollment")
      .select(
        "enrollment_id, student_user_id, app_user:app_user!inner(full_name, student_number)"
      )
      .eq("section_id", sectionId)
      .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)

    if (!enrollments || enrollments.length === 0) {
      return {
        ok: true,
        data: requirements.map((r) => ({ requirement: r, entries: [] })),
      }
    }

    // Get all submissions for these enrollments and requirements
    const enrollmentIds = enrollments.map((e: any) => e.enrollment_id)
    const reqIds = requirements.map((r) => r.form_requirement_id)

    const { data: allSubs } = await service
      .from("form_submission")
      .select("*")
      .in("enrollment_id", enrollmentIds)
      .in("form_requirement_id", reqIds)

    // Index submissions by (requirement, enrollment)
    const subMap = new Map<string, FormSubmission>()
    for (const s of (allSubs ?? []) as FormSubmission[]) {
      subMap.set(`${s.form_requirement_id}:${s.enrollment_id}`, s)
    }

    const statusCodes = await getStatusCodeMap(service)

    const result = requirements.map((req) => {
      const entries: SubmissionByFormEntry[] = enrollments.map((enr: any) => {
        const key = `${req.form_requirement_id}:${enr.enrollment_id}`
        const sub = subMap.get(key) ?? null
        let status: SubmissionByFormEntry["status"] = "missing"
        if (sub) {
          status = statusCodes.get(sub.form_submission_status_id) ?? "submitted"
        }

        const isLate =
          req.due_date != null &&
          (status === "missing"
            ? new Date() > new Date(req.due_date + "T23:59:59+08:00")
            : sub != null &&
              new Date(sub.submitted_at) >
                new Date(req.due_date + "T23:59:59+08:00"))

        return {
          enrollment_id: enr.enrollment_id,
          student_user_id: enr.student_user_id,
          full_name: (enr.app_user as any)?.full_name ?? "",
          student_number: (enr.app_user as any)?.student_number ?? null,
          status,
          is_late: isLate,
          submission: sub,
        }
      })

      return { requirement: req, entries }
    })

    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: review a submission (approve / reject + comment)
// ---------------------------------------------------------------------------

export async function reviewSubmission(
  submissionId: string,
  decision: "approved" | "rejected",
  comment: string | null
): Promise<ActionResult<FormSubmission>> {
  try {
    const { supabase, user } = await requireAuth()
    const service = createSupabaseServiceClient()

    // Load submission + enrollment for authz
    const { data: sub } = await service
      .from("form_submission")
      .select("form_submission_id, enrollment_id")
      .eq("form_submission_id", submissionId)
      .maybeSingle()

    if (!sub) return { ok: false, error: "Submission not found" }

    // §5: verify caller advises the enrollment's section
    const { data: advises } = await supabase.rpc("app_advises_enrollment", {
      p_enrollment_id: sub.enrollment_id,
    })
    if (!advises) return { ok: false, error: "You do not advise this student" }

    const statusId =
      decision === "approved"
        ? DATABASE_IDS.formSubmissionStatuses.approved
        : DATABASE_IDS.formSubmissionStatuses.rejected

    const { data: updated, error } = await service
      .from("form_submission")
      .update({
        form_submission_status_id: statusId,
        reviewer_comment: comment,
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("form_submission_id", submissionId)
      .select()
      .single()

    if (error) {
      console.error("[reviewSubmission]", error)
      return { ok: false, error: "Failed to review submission" }
    }

    return { ok: true, data: updated as FormSubmission }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Adviser: get download URL for a student's submission
// ---------------------------------------------------------------------------

export async function getSubmissionDownloadUrl(
  submissionId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { supabase } = await requireAuth()
    const service = createSupabaseServiceClient()

    const { data: sub } = await service
      .from("form_submission")
      .select("storage_path, enrollment_id")
      .eq("form_submission_id", submissionId)
      .maybeSingle()

    if (!sub) return { ok: false, error: "Submission not found" }

    const { data: canAccess } = await supabase.rpc("app_can_access_enrollment", {
      p_enrollment_id: sub.enrollment_id,
    })
    if (!canAccess) return { ok: false, error: "Access denied" }

    return getSignedUrl(sub.storage_path)
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Admin: cross-section completion overview
// ---------------------------------------------------------------------------

export async function getCompletionOverview(): Promise<
  ActionResult<
    {
      form_requirement_id: string
      title: string
      total_enrolled: number
      submitted: number
      approved: number
      rejected: number
      missing: number
    }[]
  >
> {
  try {
    const { supabase } = await requireAuth()
    const { data: isAdmin } = await supabase.rpc("app_is_admin")
    if (!isAdmin) return { ok: false, error: "Admin access required" }

    const service = createSupabaseServiceClient()

    // Get all active global requirements
    const { data: globals } = await service
      .from("form_requirement")
      .select("form_requirement_id, title")
      .is("section_id", null)
      .eq("is_active", true)

    if (!globals || globals.length === 0) {
      return { ok: true, data: [] }
    }

    // Count active enrollments across all active sections
    const { count: totalEnrolled } = await service
      .from("enrollment")
      .select("enrollment_id", { count: "exact", head: true })
      .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)

    const statusCodes = await getStatusCodeMap(service)

    const reqIds = globals.map((g: { form_requirement_id: string }) => g.form_requirement_id)
    const { data: allSubs } = await service
      .from("form_submission")
      .select("form_requirement_id, form_submission_status_id")
      .in("form_requirement_id", reqIds)

    // Count per requirement
    const countsMap = new Map<
      string,
      { submitted: number; approved: number; rejected: number }
    >()
    for (const reqId of reqIds) {
      countsMap.set(reqId, { submitted: 0, approved: 0, rejected: 0 })
    }

    for (const s of allSubs ?? []) {
      const counts = countsMap.get(s.form_requirement_id)
      if (!counts) continue
      const code = statusCodes.get(s.form_submission_status_id)
      if (code === "submitted") counts.submitted++
      else if (code === "approved") counts.approved++
      else if (code === "rejected") counts.rejected++
    }

    const total = totalEnrolled ?? 0
    const result = globals.map((g: { form_requirement_id: string; title: string }) => {
      const c = countsMap.get(g.form_requirement_id)!
      const totalSubmissions = c.submitted + c.approved + c.rejected
      return {
        form_requirement_id: g.form_requirement_id,
        title: g.title,
        total_enrolled: total,
        submitted: c.submitted,
        approved: c.approved,
        rejected: c.rejected,
        missing: Math.max(0, total - totalSubmissions),
      }
    })

    return { ok: true, data: result }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

// ---------------------------------------------------------------------------
// Internal: map status UUIDs to codes
// ---------------------------------------------------------------------------

async function getStatusCodeMap(
  service: ReturnType<typeof createSupabaseServiceClient>
): Promise<Map<string, "submitted" | "approved" | "rejected">> {
  const { data } = await service
    .from("form_submission_status")
    .select("form_submission_status_id, code")

  const map = new Map<string, "submitted" | "approved" | "rejected">()
  for (const row of data ?? []) {
    map.set(
      row.form_submission_status_id,
      row.code as "submitted" | "approved" | "rejected"
    )
  }
  return map
}
