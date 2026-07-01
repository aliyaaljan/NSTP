"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "../supabase/service-client"
import { lookupId } from "../lookups"
import { revalidatePath } from "next/cache"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// fetch pending/open appeals or requests assigned to adviser's section

export async function getAdviserPendingRequests(): Promise<
  ActionResult<any[]>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const openStatusId = await lookupId("appeal_status", "open")
    const reviewStatusId = await lookupId("appeal_status", "under_review")

    // fetch open or under_review requests matching sections handled by the logged-in adviser
    const { data: appeals, error } = await service
      .from("appeal")
      .select(
        `
        appeal_id,
        reason,
        created_at,
        enrollment!inner (
            student_user_id,
            app_user!inner (full_name, student_number),
            section!inner (name, adviser_user_id)
        )
        `
      )
      .eq("enrollment.section.adviser_user_id", user.id)
      .in("appeal_status_id", [openStatusId, reviewStatusId])
      .order("created_at", { ascending: false })

    if (error) throw error

    const mapped = (appeals || []).map((app: any) => {
      const parts = app.reason.split("|||")
      const title = parts.length > 1 ? parts[0] : "Request"
      const details = parts.length > 1 ? parts.slice(1).join("|||") : app.reason

      const student = app.enrollment?.app_user

      return {
        id: app.appeal_id,
        name: student?.full_name || "Unkown Student",
        studentNo: student?.student_number || "-",
        section: app.enrollment?.section?.name || "-",
        type: "Hour Adjustment", // default
        dateSubmitted: new Date(app.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        hasAttachment: false,
        note: `[${title}] ${details}`,
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
    const service = createSupabaseServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const { data: appeal } = await service
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

    const { error } = await service
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
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
