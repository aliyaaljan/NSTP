"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { lookupId } from "@/lib/lookups"
import { manilaDateKey, manilaClock, formatDate } from "@/lib/student/leader/scan-history"

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
        "attendance_session_id, started_at, ended_at, duration_minute, is_flagged, flag_reasons"
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
        // Students only ever see the off-site label — fraud flag codes are facilitator-only.
        site: ((s.flag_reasons ?? []) as { code?: string }[]).some((r) => r.code === "offsite")
          ? `${siteLabel} (Off-site)`
          : siteLabel,
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

// Session options for the "Submit Request" time-correction picker. Unlike
// getMyAttendanceHistory (dashboard: closed + corrected only), this includes
// voided sessions (so a student can request a restore) and surfaces each
// session's status + off-site flag.
export type RequestSessionOption = {
  sessionId: string
  dateKey: string // YYYY-MM-DD (Manila) — feeds the correction date
  dateLabel: string // readable
  timeIn: string // HH:MM 24h (Manila) for input pre-fill; "" if none
  timeOut: string // HH:MM 24h (Manila); "" if none
  timeInLabel: string // 12h display
  timeOutLabel: string // 12h display
  statusCode: string
  isFlagged: boolean
}

function manilaTime24(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
}

export async function getMySessionsForRequest(): Promise<
  | { ok: true; data: RequestSessionOption[] }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const primary = await resolveActiveStudentEnrollment(service, user.id)
    if (!primary) return { ok: true, data: [] }

    const { data: sessions, error } = await service
      .from("attendance_session")
      .select(
        "attendance_session_id, started_at, ended_at, is_flagged, flag_reasons, attendance_session_status:attendance_session_status_id ( code )"
      )
      .eq("enrollment_id", primary.enrollmentId)
      .order("started_at", { ascending: false })

    if (error) {
      console.error("[getMySessionsForRequest] query failed", error)
      return { ok: false, error: "Failed to load your sessions." }
    }

    const rows: RequestSessionOption[] = (sessions ?? [])
      .map((s: any) => ({
        sessionId: s.attendance_session_id,
        dateKey: manilaDateKey(s.started_at),
        dateLabel: formatDate(manilaDateKey(s.started_at)),
        timeIn: manilaTime24(s.started_at),
        timeOut: manilaTime24(s.ended_at),
        timeInLabel: manilaClock(s.started_at),
        timeOutLabel: manilaClock(s.ended_at),
        statusCode: s.attendance_session_status?.code ?? "",
        // off-site only — fraud flag codes are facilitator-only
        isFlagged: ((s.flag_reasons ?? []) as { code?: string }[]).some((r) => r.code === "offsite"),
      }))
      // in-progress ('open') sessions aren't correctable via a request
      .filter((r) => r.statusCode && r.statusCode !== "open")

    return { ok: true, data: rows }
  } catch (err) {
    console.error("[getMySessionsForRequest] failed", err)
    return {
      ok: false,
      error: "Failed to load your sessions. Please try again.",
    }
  }
}
