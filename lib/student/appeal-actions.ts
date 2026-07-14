"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib/lookups"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import type { StructuredCorrection } from "@/lib/student/time-correction"
import { notifyAdviserOnAppeal } from "@/lib/email/notifications"
import { notifyAdviserOnAppealPush } from "../push/notifications"

const MAX_NUM_ATTACHMENT = 1

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type RequestAttachment = {
  storage_path: string
  file_name: string
  content_type: string
  file_size_byte: number
}

// fetch all the requests for a student
export async function getStudentRequests(
  enrollmentId: string
): Promise<ActionResult<any[]>> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: appeals, error } = await supabase
      .from("appeal")
      .select(
        `
          appeal_id,
          title,
          details,
          attendance_session_id,
          requested_time_in,
          requested_time_out,
          resolution_note,
          created_at,
          updated_at,
          appeal_status:appeal_status_id ( code, name ),
          appeal_type:appeal_type_id ( name ),
          appeal_attachment ( storage_path, file_name )
        `
      )
      .eq("enrollment_id", enrollmentId)
      .order("created_at", { ascending: false })

    if (error) throw error

    const mappedRequests = (appeals ?? []).map((app: any) => {
      const uiStatus = app.appeal_status?.name || "Under Review"

      return {
        id: app.appeal_id,
        type: app.appeal_type?.name || "Others",
        title: app.title || "Request",
        body: app.details || "",
        status: uiStatus,
        note: app.resolution_note
          ? `Adviser's Note: ${app.resolution_note}`
          : `Adviser's Note: ${uiStatus}`,
        date: new Date(app.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        lastEdited:
          app.updated_at !== app.created_at
            ? new Date(app.updated_at).toLocaleString()
            : null,
        attachments: app.appeal_attachment ?? [],
        attendanceSessionId: app.attendance_session_id ?? null,
        requestedTimeIn: app.requested_time_in ?? null,
        requestedTimeOut: app.requested_time_out ?? null,
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
  title: string,
  body: string,
  attachments: RequestAttachment[] = [],
  structured: StructuredCorrection = {}
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }
    if (attachments.length > MAX_NUM_ATTACHMENT) {
      return {
        ok: false,
        error: `You can attach at most ${MAX_NUM_ATTACHMENT} files per request`,
      }
    }

    const openStatusId = await lookupId("appeal_status", "pending")

    const { data, error } = await supabase
      .from("appeal")
      .insert({
        enrollment_id: enrollmentId,
        requester_user_id: user.id,
        appeal_status_id: openStatusId,
        appeal_type_id: appealTypeId,
        title: title.trim(),
        details: body.trim(),
        attendance_session_id: structured.attendanceSessionId ?? null,
        requested_time_in: structured.requestedTimeIn ?? null,
        requested_time_out: structured.requestedTimeOut ?? null,
      })
      .select("appeal_id")
      .single()

    if (error) throw error

    // insert attachments into the appeal_attachment table
    if (attachments.length > 0) {
      const rows = attachments.map((a) => ({
        appeal_id: data.appeal_id,
        storage_path: a.storage_path,
        file_name: a.file_name,
        content_type: a.content_type,
        file_size_byte: a.file_size_byte,
      }))

      const { error: attachmentError } = await supabase
        .from("appeal_attachment")
        .insert(rows)

      if (attachmentError) {
        await supabase.from("appeal").delete().eq("appeal_id", data.appeal_id)
        throw attachmentError
      }
    }

    await notifyAdviserOnAppeal(data.appeal_id).catch(console.error)
    await notifyAdviserOnAppealPush(data.appeal_id).catch(console.error)

    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// edit an existing request (only while still 'pending')
/**
 * Update an existing pending request using the service client to bypass RLS
 * after manually verifying the caller owns the record and it is still editable.
 * When `structured` is omitted the time-correction columns are left untouched.
 */
export async function updateStudentRequest(
  appealId: string,
  appealTypeId: string,
  title: string,
  body: string,
  structured?: StructuredCorrection,
  attachments?: { toInsert: RequestAttachment[]; removePaths: string[] }
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

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

    const openStatusId = await lookupId("appeal_status", "pending")
    if (existingAppeal.appeal_status_id !== openStatusId) {
      return {
        ok: false,
        error: "This request is already being processed and cannot be modified",
      }
    }

    const updatePayload: Record<string, unknown> = {
      appeal_type_id: appealTypeId,
      title: title.trim(),
      details: body.trim(),
      updated_at: new Date().toISOString(),
    }
    if (structured) {
      updatePayload.attendance_session_id =
        structured.attendanceSessionId ?? null
      updatePayload.requested_time_in = structured.requestedTimeIn ?? null
      updatePayload.requested_time_out = structured.requestedTimeOut ?? null
    }

    const { error: updateError } = await service
      .from("appeal")
      .update(updatePayload)
      .eq("appeal_id", appealId)

    if (updateError) throw updateError

    // Reconcile attachments (add / remove / replace). Runs on the service client,
    // consistent with the ownership-checked update above.
    if (attachments) {
      const removePaths = attachments.removePaths ?? []
      const toInsert = attachments.toInsert ?? []

      if (removePaths.length > 0) {
        const { error: deleteRowError } = await service
          .from("appeal_attachment")
          .delete()
          .eq("appeal_id", appealId)
          .in("storage_path", removePaths)
        if (deleteRowError) throw deleteRowError

        const { error: storageError } = await service.storage
          .from("request-attachments")
          .remove(removePaths)
        if (storageError) throw storageError
      }

      if (toInsert.length > 0) {
        const rows = toInsert.map((a) => ({
          appeal_id: appealId,
          storage_path: a.storage_path,
          file_name: a.file_name,
          content_type: a.content_type,
          file_size_byte: a.file_size_byte,
        }))
        const { error: insertError } = await service
          .from("appeal_attachment")
          .insert(rows)
        if (insertError) throw insertError
      }

      // Defense-in-depth: a request may never hold more than MAX_NUM_ATTACHMENT.
      const { count } = await service
        .from("appeal_attachment")
        .select("appeal_attachment_id", { count: "exact", head: true })
        .eq("appeal_id", appealId)
      if ((count ?? 0) > MAX_NUM_ATTACHMENT) {
        return {
          ok: false,
          error: `You can attach at most ${MAX_NUM_ATTACHMENT} file per request`,
        }
      }
    }

    return { ok: true, data: null }
  } catch (err: any) {
    console.error("[updateStudentRequest] Error: ", err)
    return { ok: false, error: err.message }
  }
}
