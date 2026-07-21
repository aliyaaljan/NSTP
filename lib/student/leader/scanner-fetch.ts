"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { lookupId } from "@/lib/lookups"
import {
  type ScanRecord,
  manilaDateKey,
  manilaClock,
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
      attendance_session:attendance_session_id (
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

    const sessionRaw = row.attendance_session
    const session = Array.isArray(sessionRaw) ? sessionRaw[0] : sessionRaw

    const hours = session?.duration_minute
      ? Number((session.duration_minute / 60).toFixed(2))
      : 0
    const timeOut = session?.ended_at
      ? manilaClock(session.ended_at)
      : "Ongoing"

    return {
      id: row.attendance_event_id,
      name: fullName,
      date: manilaDateKey(row.effective_at),
      generatedTime: manilaClock(row.generated_at),
      scannedTime: manilaClock(row.effective_at),
      timeOut: timeOut,
      hours: hours,
      status: "Present",
    }
  })
}
