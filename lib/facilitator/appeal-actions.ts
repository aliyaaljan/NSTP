"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"

import { lookupId } from "../lookups"
import { revalidatePath } from "next/cache"
import { parseReason, packReason } from "../student/appeal-utils"
import { formatClassLabel } from "@/lib/shared/class-label"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// fetch pending/open appeals or requests assigned to adviser's section

// fetch pending/open appeals or requests assigned to adviser's section
export async function getAdviserPendingRequests(): Promise<
  ActionResult<any[]>
> {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: "Not authenticated" }

    // All rows belong to the caller's own class — resolve their name once.
    const { data: caller } = await supabase
      .from("app_user")
      .select("full_name")
      .eq("app_user_id", user.id)
      .maybeSingle()

    // Fetch all requests matching sections handled by the logged-in adviser (No status filter)
    const { data: appeals, error } = await supabase
      .from("appeal")
      .select(
        `
          appeal_id,
          appeal_type_id,
          reason,
          created_at,
          appeal_status!inner (name, code),
          appeal_attachment (storage_path, file_name, content_type, file_size_byte),
          enrollment!inner (
              student_user_id,
              section_id,
              app_user!inner (full_name, student_number),
              section!inner (course_code, adviser_user_id, term:term_id (school_year))
          )
        `
      )
      .eq("enrollment.section.adviser_user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    const mapped = (appeals || []).map((app: any) => {
      // unpack triple pipe-formatted inputs
      const { type, title, body } = parseReason(app.reason || "")
      const student = app.enrollment?.app_user

      return {
        appeal_id: app.appeal_id,
        appeal_type_id: app.appeal_type_id,
        section_id: app.enrollment?.section_id || "",
        student_name: student?.full_name || "Unknown Student",
        student_number: student?.student_number || "—",
        section_name: formatClassLabel({
          courseCode: app.enrollment?.section?.course_code,
          facilitatorName: caller?.full_name,
          schoolYear: app.enrollment?.section?.term?.school_year,
        }),
        appeal_type_name: type || "Others",
        title: title || "Request",
        note: body || "",
        status: app.appeal_status?.name || "Pending Review",
        statusCode: app.appeal_status?.code || "pending",
        date: app.created_at
          ? new Date(app.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
        attachments: app.appeal_attachment ?? [],
      }
    })

    return { ok: true, data: mapped }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// resolving student requests

export async function resolveStudentRequest(
  appealId: string,
  decision: "approved" | "rejected",
  resolutionNote: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const { data: appeal } = await supabase
      .from("appeal")
      .select("enrollment_id")
      .eq("appeal_id", appealId)
      .single()
    if (!appeal) throw new Error("Appeal not found")

    const { data: advises } = await supabase.rpc("app_advises_enrollment", {
      p_enrollment_id: appeal.enrollment_id,
    })

    if (!advises) throw new Error("Permission denied")

    const statusId = await lookupId("appeal_status", decision)

    const { error } = await supabase
      .from("appeal")
      .update({
        appeal_status_id: statusId,
        resolution_note: resolutionNote,
        resolved_by_user_id: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("appeal_id", appealId)

    if (error) throw error
    revalidatePath("/facilitator/dashboard")
    revalidatePath("/facilitator/my-students")
    return {
      ok: true,
      data: { appealId, status: decision === "approved" ? "Approved" : "Rejected" },
    }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// function so when an adviser opens a request,
// it turns to 'under review'

export async function transitionToUnderReview(
  appealId: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()

    const openStatusId = await lookupId("appeal_status", "pending")
    const reviewStatusId = await lookupId("appeal_status", "under_review")

    const { data: appeal, error: fetchError } = await supabase
      .from("appeal")
      .select("appeal_status_id")
      .eq("appeal_id", appealId)
      .single()

    if (fetchError || !appeal)
      return { ok: false, error: "Record check failed" }

    // do nothing if request already transitioned to 'open' or 'under review'
    if (appeal.appeal_status_id !== openStatusId) {
      return {
        ok: true,
        data: "Skipped",
      }
    }

    const { error: updateError } = await supabase
      .from("appeal")
      .update({ appeal_status_id: reviewStatusId })
      .eq("appeal_id", appealId)

    if (updateError) throw updateError

    revalidatePath("/facilitator/dashboard")
    revalidatePath("/facilitator/my-students")

    return { ok: true, data: null }
  } catch (err: any) {
    console.error("[transitionToUnderReview] Framework error: ", err.message)
    return { ok: false, error: err.message }
  }
}
