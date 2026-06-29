"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib/lookups"
import { lookup } from "dns"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// fetch all the requests for student
export async function getStudentRequests(
  enrollmentId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createSupabaseServerClient()

    // fetch appeals and join with status to get the code
    const { data: appeals, error } = await supabase
      .from("appeal")
      .select(
        `
            appeal_id,
            reason,
            resolution_note,
            created_at,
            updated_at,
            appeal_status:appeal_status_id ( code, name )
            `
      )
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    // map the database data to match the student/request page
    const mappedRequests = appeals.map((app: any) => {
      // parse title and body out of the 'reason' field
      // format the parts based on student/request page
      const parts = app.reason.split("|||")
      const title = parts.length > 1 ? parts[0] : "Request"
      const body = parts.length > 1 ? parts.slice(1).join("|||") : app.reason

      // mapping database status to UI Badges

      const statusCode = app.appeal_status?.code

      let uiStatus = "Under Review" // "open" or "under_review"
      if (statusCode === "approved") {
        uiStatus = "Approved"
      }
      if (statusCode === "rejected") {
        uiStatus = "Declined"
      }

      return {
        id: app.appeal_id,
        title: title,
        status: uiStatus,
        body: body,
        note: app.resolution_note
          ? `Adviser's Note: ${app.resolution_note}`
          : "Adviser's Note: Pending review",
        date: new Date(app.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        lastEdited:
          app.updated_at !== app.created_at
            ? new Date(app.updated_at).toLocaleDateString()
            : null,
      }
    })
    return { ok: true, data: mappedRequests }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// submit a new request

export async function submitStudentRequest(
  enrollmentId: string,
  title: string,
  body: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const openStatusId = await lookupId("appeal_status", "open")

    // combine title and body to fit into the single `reason` column in frontend
    const combinedReason = `${title}|||${body}`
    const { error } = await supabase.from("appeal").insert({
      enrollment_id: enrollmentId,
      requester_user_id: user.id,
      appeal_status_id: openStatusId,
      reason: combinedReason,
    })
    if (error) {
      throw error
    }
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// edit an existing request
export async function updateStudentRequest(
  appealId: string,
  title: string,
  body: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const combinedReason = `${title}|||${body.replace(/^Request:\s*/, "")}`

    const { error } = await supabase
      .from("appeal")
      .update({
        reason: combinedReason,
        updated_at: new Date().toISOString(),
      })
      .eq("appeal_id", appealId)
      // only allow editing if request is still open
      .eq("appeal_status_id", await lookupId("appeal_status", "open"))

    if (error) {
      throw error
    }
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
