"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib/lookups"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { packReason, parseReason } from "@/lib/student/appeal-utils"

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
      const { type, title, body } = parseReason(app.reason)
      const uiStatus = app.appeal_status?.name || "Under Review"

      return {
        id: app.appeal_id,
        type: type,
        title: title,
        body: body,
        status: uiStatus,
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
            ? new Date(app.updated_at).toLocaleString()
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
  appealTypeId: string,
  typeName: string,
  title: string,
  body: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const openStatusId = await lookupId("appeal_status", "pending")

    // standardize display label (e.g. "Excused Absence")
    const displayLabel = typeName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    // pack reason securely using helper (type|||title|||body)
    const combinedReason = packReason(displayLabel, title, body)

    const { error } = await supabase.from("appeal").insert({
      enrollment_id: enrollmentId,
      requester_user_id: user.id,
      appeal_status_id: openStatusId,
      appeal_type_id: appealTypeId,
      reason: combinedReason,
    })

    if (error) throw error
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// edit an existing request
/**
 * update an existing open record using the service client to bypass RLS
 * after performing a manual security check to guarantee user ownership
 */
export async function updateStudentRequest(
  appealId: string,
  appealTypeId: string,
  typeName: string,
  title: string,
  body: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    // authenticate the user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    // check if the appeal belongs to the logged-in user
    const { data: existingAppeal, error: fetchError } = await service
      .from("appeal")
      .select("requester_user_id, appeal_status_id")
      .eq("appeal_id", appealId)
      .maybeSingle()

    if (fetchError || !existingAppeal) {
      return { ok: false, error: "Request record not found" }
    }
    if (existingAppeal.requester_user_id !== user.id) {
      return {
        ok: false,
        error: "Unauthorized access: You do not own this record",
      }
    }

    // check if the record is still editable ('open')
    const openStatusId = await lookupId("appeal_status", "pending")
    if (existingAppeal.appeal_status_id !== openStatusId) {
      return {
        ok: false,
        error: "This request is already being processed and cannot be modified",
      }
    }
    //standardized formatting
    const displayLabel = typeName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    //clean the request
    const cleanBody = body.replace(/^Request:\s*/, "")
    const combinedReason = packReason(displayLabel, title, cleanBody)

    const { error: updateError } = await service
      .from("appeal")
      .update({
        appeal_type_id: appealTypeId,
        reason: combinedReason,
        updated_at: new Date().toISOString(),
      })
      .eq("appeal_id", appealId)

    if (updateError) throw updateError
    return { ok: true, data: null }
  } catch (err: any) {
    console.error("[updateStudentRequest] Error: ", err)
    return { ok: false, error: err.message }
  }
}
