"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { lookupId } from "@/lib/lookups"
import { manilaDateKey, manilaClock } from "@/lib/student/leader/scan-history"

export type AttendanceHistoryRow = {
  attendanceSessionId: string
  date: string
  qrGen: string
  qrScan: string
  timeOut: string
  hours: number
  site: string
}

type ActionResult =
  | { ok: true; data: AttendanceHistoryRow[] }
  | { ok: false; error: string }

export async function getMyAttendanceHistory(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const primary = await resolveActiveStudentEnrollment(service, user.id)
    if (!primary) return { ok: true, data: [] }

    // Same "counts toward hours" filter as getStudentDashboard(): closed + corrected only.
    const { data: countedStatuses } = await service
      .from("attendance_session_status")
      .select("attendance_session_status_id")
      .in("code", ["closed", "corrected"])

    if (!countedStatuses || countedStatuses.length === 0) {
      return { ok: true, data: [] }
    }

    const { data: sessions, error: sessionsError } = await service
      .from("attendance_session")
      .select(
        "attendance_session_id, started_at, ended_at, duration_minute, is_flagged"
      )
      .eq("enrollment_id", primary.enrollmentId)
      .in(
        "attendance_session_status_id",
        countedStatuses.map((s) => s.attendance_session_status_id)
      )
      .order("started_at", { ascending: false })

    if (sessionsError) {
      console.error(
        "[getMyAttendanceHistory] session query failed",
        sessionsError
      )
      return { ok: false, error: "Failed to load attendance history." }
    }

    const sessionRows = sessions ?? []
    const sessionIds = sessionRows.map((s) => s.attendance_session_id)

    const timeInBySession = new Map<
      string,
      { generatedAt: string | null; effectiveAt: string }
    >()

    if (sessionIds.length > 0) {
      const timeInTypeId = await lookupId("attendance_event_type", "time_in")
      const { data: events } = await service
        .from("attendance_event")
        .select("attendance_session_id, generated_at, effective_at")
        .in("attendance_session_id", sessionIds)
        .eq("attendance_event_type_id", timeInTypeId)

      for (const e of events ?? []) {
        if (e.attendance_session_id) {
          timeInBySession.set(e.attendance_session_id, {
            generatedAt: e.generated_at,
            effectiveAt: e.effective_at,
          })
        }
      }
    }

    const { data: enrollmentRow } = await service
      .from("enrollment")
      .select("geofence:assigned_geofence_id ( label )")
      .eq("enrollment_id", primary.enrollmentId)
      .single()

    const geofenceRaw = enrollmentRow?.geofence
    const geofence = Array.isArray(geofenceRaw) ? geofenceRaw[0] : geofenceRaw
    const siteLabel = geofence?.label ?? "Unassigned"

    const rows: AttendanceHistoryRow[] = sessionRows.map((s) => {
      const timeIn = timeInBySession.get(s.attendance_session_id)
      const hours = Math.round(((s.duration_minute ?? 0) / 60) * 10) / 10

      return {
        attendanceSessionId: s.attendance_session_id,
        date: manilaDateKey(s.started_at),
        qrGen: timeIn?.generatedAt ? manilaClock(timeIn.generatedAt) : "—",
        qrScan: timeIn
          ? manilaClock(timeIn.effectiveAt)
          : manilaClock(s.started_at),
        timeOut: s.ended_at ? manilaClock(s.ended_at) : "—",
        hours,
        site: s.is_flagged ? `${siteLabel} (Off-site)` : siteLabel,
      }
    })

    return { ok: true, data: rows }
  } catch (err) {
    console.error("[getMyAttendanceHistory] failed", err)
    return {
      ok: false,
      error: "Failed to load attendance history. Please try again.",
    }
  }
}
