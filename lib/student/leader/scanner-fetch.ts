"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { lookupId } from "@/lib/lookups"
import {
  type ScanRecord,
  manilaDateKey,
  manilaClock,
  manilaMinutesPastMidnight,
  LATE_CUTOFF_MINUTES,
} from "@/lib/student/leader/scan-history"

export async function fetchLeaderScanHistory(): Promise<ScanRecord[]> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const qrScanSourceId = await lookupId("attendance_event_source", "qr_scan")

  const { data: records, error } = await service
    .from("attendance_event")
    .select(
      `
      attendance_event_id,
      effective_at,
      generated_at,
      attendance_session!left (
        started_at,
        ended_at,
        duration_minute
      ),
      enrollment!inner (
        student_user_id,
        app_user!inner (
          full_name
        )
      )
    `
    )
    .eq("recorded_by_user_id", user.id)
    .eq("attendance_event_source_id", qrScanSourceId)
    .order("effective_at", { ascending: false })

  if (error || !records) return []

  return records.map((row: any) => {
    const enrollmentRaw = row.enrollment
    const enrollment = Array.isArray(enrollmentRaw)
      ? enrollmentRaw[0]
      : enrollmentRaw
    const appUserRaw = enrollment?.app_user
    const appUser = Array.isArray(appUserRaw) ? appUserRaw[0] : appUserRaw
    const fullName: string = appUser?.full_name ?? "Unknown Student"

    const session = row.attendance_session
    let timeOut: string | null = null
    let hours: number = 0

    if (session) {
      if (session.ended_at) {
        timeOut = manilaClock(session.ended_at)
      }
      
      if (session.duration_minute) {
        hours = parseFloat((session.duration_minute / 60).toFixed(1))
      }
    }

    return {
      id: row.attendance_event_id,
      name: fullName,
      date: manilaDateKey(row.effective_at),
      generatedTime: manilaClock(row.generated_at),
      scannedTime: manilaClock(row.effective_at),
      timeOut: timeOut,
      hours: hours,
      status:
        manilaMinutesPastMidnight(row.effective_at) > LATE_CUTOFF_MINUTES
          ? ("Late" as const)
          : ("On Time" as const),
    }
  })
}
