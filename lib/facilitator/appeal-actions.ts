"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

import { lookupId } from "../lookups"
import { revalidatePath } from "next/cache"
import { formatClassLabel } from "@/lib/shared/class-label"
import type { FlagReason } from "@/lib/attendance/flag-reasons"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// Correction the facilitator confirms when approving a time request. The UI
// pre-fills this from the request's structured fields; the facilitator can adjust.
export type ApproveCorrection = {
  // edit = fix times on an existing session; add = create a missing session;
  // restore = supply the time-out for an auto-voided session (-> corrected);
  // clear_flag = leave times, clear ALL flags on the session; none = approve only.
  action: "edit" | "add" | "restore" | "clear_flag" | "none"
  attendanceSessionId?: string | null
  sessionDate?: string // YYYY-MM-DD (for add/edit/restore)
  timeIn?: string // HH:MM 24h
  timeOut?: string // HH:MM 24h
  resolutionNote?: string
}

// fetch every request for the sections handled by the logged-in adviser (any status)
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

    const { data: appeals, error } = await supabase
      .from("appeal")
      .select(
        `
          appeal_id,
          appeal_type_id,
          title,
          details,
          attendance_session_id,
          requested_time_in,
          requested_time_out,
          created_at,
          appeal_status!inner (name, code),
          appeal_type:appeal_type_id (name),
          appeal_attachment (storage_path, file_name, content_type, file_size_byte),
          attendance_session:attendance_session_id (
              started_at, ended_at, is_flagged, flag_reasons,
              attendance_session_status:attendance_session_status_id (code)
          ),
          enrollment!inner (
              enrollment_id,
              student_user_id,
              section_id,
              app_user!inner (full_name, student_number, avatar_url),
              section!inner (course_code, adviser_user_id, term:term_id (school_year))
          )
        `
      )
      .eq("enrollment.section.adviser_user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    const mapped = (appeals || []).map((app: any) => {
      const student = app.enrollment?.app_user
      const session = app.attendance_session

      return {
        appeal_id: app.appeal_id,
        appeal_type_id: app.appeal_type_id,
        enrollment_id: app.enrollment?.enrollment_id || "",
        section_id: app.enrollment?.section_id || "",
        student_name: student?.full_name || "Unknown Student",
        student_avatar_url: student?.avatar_url ?? null,
        student_number: student?.student_number || "—",
        section_name: formatClassLabel({
          courseCode: app.enrollment?.section?.course_code,
          facilitatorName: caller?.full_name,
          schoolYear: app.enrollment?.section?.term?.school_year,
        }),
        appeal_type_name: app.appeal_type?.name || "Others",
        title: app.title || "Request",
        note: app.details || "",
        status: app.appeal_status?.name || "Pending Review",
        statusCode: app.appeal_status?.code || "pending",
        attachments: app.appeal_attachment ?? [],
        // structured time-correction context (null for legacy/free-text requests)
        attendanceSessionId: app.attendance_session_id ?? null,
        requestedTimeIn: app.requested_time_in ?? null,
        requestedTimeOut: app.requested_time_out ?? null,
        session: session
          ? {
              startedAt: session.started_at ?? null,
              endedAt: session.ended_at ?? null,
              isFlagged: session.is_flagged ?? false,
              flagReasons: (session.flag_reasons ?? []) as FlagReason[],
              statusCode: session.attendance_session_status?.code ?? null,
            }
          : null,
        date: app.created_at
          ? new Date(app.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
      }
    })

    return { ok: true, data: mapped }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// Verify the caller advises the appeal's enrollment; returns the appeal row (service-read).
async function assertAdvisesAppeal(
  appealId: string
): Promise<
  | { ok: true; userId: string; enrollmentId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const service = createSupabaseServiceClient()
  const { data: appeal } = await service
    .from("appeal")
    .select("enrollment_id")
    .eq("appeal_id", appealId)
    .maybeSingle()
  if (!appeal) return { ok: false, error: "Appeal not found" }

  const { data: advises } = await supabase.rpc("app_advises_enrollment", {
    p_enrollment_id: appeal.enrollment_id,
  })
  if (!advises) return { ok: false, error: "Permission denied" }

  return { ok: true, userId: user.id, enrollmentId: appeal.enrollment_id }
}

// resolve a request (approve/reject) WITHOUT applying an attendance correction
export async function resolveStudentRequest(
  appealId: string,
  decision: "approved" | "rejected",
  resolutionNote: string
): Promise<ActionResult<any>> {
  try {
    const guard = await assertAdvisesAppeal(appealId)
    if (!guard.ok) throw new Error(guard.error)

    const statusId = await lookupId("appeal_status", decision)
    const service = createSupabaseServiceClient()

    const { error } = await service
      .from("appeal")
      .update({
        appeal_status_id: statusId,
        resolution_note: resolutionNote,
        resolved_by_user_id: guard.userId,
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

// approve a time request AND apply the confirmed correction, then link the session
export async function approveRequestWithCorrection(
  appealId: string,
  correction: ApproveCorrection
): Promise<ActionResult<any>> {
  try {
    const guard = await assertAdvisesAppeal(appealId)
    if (!guard.ok) throw new Error(guard.error)

    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    let linkedSessionId: string | null = correction.attendanceSessionId ?? null

    if (correction.action === "add") {
      if (!correction.sessionDate || !correction.timeIn || !correction.timeOut) {
        return { ok: false, error: "Missing date/time for the new session" }
      }
      const { data: newId, error } = await supabase.rpc("create_attendance_session", {
        p_enrollment_id: guard.enrollmentId,
        p_session_date: correction.sessionDate,
        p_time_in: correction.timeIn,
        p_time_out: correction.timeOut,
      })
      if (error) throw error
      linkedSessionId = (newId as string) ?? null
    } else if (correction.action === "edit" || correction.action === "restore") {
      if (
        !correction.attendanceSessionId ||
        !correction.sessionDate ||
        !correction.timeIn ||
        !correction.timeOut
      ) {
        return { ok: false, error: "Missing session/time for the correction" }
      }
      const { data: correctedStatus } = await service
        .from("attendance_session_status")
        .select("attendance_session_status_id")
        .eq("code", "corrected")
        .single()

      const { error } = await supabase.rpc("update_attendance_session", {
        p_attendance_session_id: correction.attendanceSessionId,
        p_adviser_user_id: guard.userId,
        p_session_date: correction.sessionDate,
        p_time_in: correction.timeIn,
        p_time_out: correction.timeOut,
        p_attendance_session_status_id:
          correctedStatus?.attendance_session_status_id,
        p_void_reason: null,
      })
      if (error) throw error
    } else if (correction.action === "clear_flag") {
      if (!correction.attendanceSessionId) {
        return { ok: false, error: "Missing session for clear-flag" }
      }
      const { error } = await service
        .from("attendance_session")
        .update({ is_flagged: false, flag_reasons: [] })
        .eq("attendance_session_id", correction.attendanceSessionId)
      if (error) throw error
    }

    const approvedStatusId = await lookupId("appeal_status", "approved")
    const { error: resolveError } = await service
      .from("appeal")
      .update({
        appeal_status_id: approvedStatusId,
        resolution_note: correction.resolutionNote ?? null,
        resolved_by_user_id: guard.userId,
        resolved_at: new Date().toISOString(),
        attendance_session_id: linkedSessionId,
      })
      .eq("appeal_id", appealId)
    if (resolveError) throw resolveError

    revalidatePath("/facilitator/dashboard")
    revalidatePath("/facilitator/my-students")
    return { ok: true, data: { appealId, attendanceSessionId: linkedSessionId } }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// when an adviser opens a pending request, flip it to 'under review'
export async function transitionToUnderReview(
  appealId: string
): Promise<ActionResult<any>> {
  try {
    const service = createSupabaseServiceClient()

    const openStatusId = await lookupId("appeal_status", "pending")
    const reviewStatusId = await lookupId("appeal_status", "under_review")

    const { data: appeal, error: fetchError } = await service
      .from("appeal")
      .select("appeal_status_id")
      .eq("appeal_id", appealId)
      .maybeSingle()

    if (fetchError || !appeal)
      return { ok: false, error: "Record check failed" }

    // idempotent: only pending -> under_review
    if (appeal.appeal_status_id !== openStatusId) {
      return { ok: true, data: "Skipped" }
    }

    const { error: updateError } = await service
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
