"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"

export type ScanRecord = {
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  status: "On Time" | "Late"
}

export async function fetchLeaderScanHistory(): Promise<ScanRecord[]> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: records, error } = await supabase
    .from("attendance_event")
    .select(
      `
      effective_at,
      generated_meta,
      enrollment!inner (
        app_user!inner (
          full_name
        )
      )
    `
    )
    .eq("recorded_by", user.id)
    .order("effective_at", { ascending: false })

  if (error || !records) return []

  return records.map((row: any) => {
    const scannedDate = new Date(row.effective_at)
    const genMeta = (row.generated_meta as Record<string, any>) || {}
    const generatedDate = new Date(genMeta.generated_at || row.effective_at)

    const targetHours = parseInt(
      scannedDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Manila",
      })
    )
    const targetMinutes = parseInt(
      scannedDate.toLocaleTimeString("en-US", {
        minute: "2-digit",
        timeZone: "Asia/Manila",
      })
    )

    const minutesPastMidnight = targetHours * 60 + targetMinutes
    const isLate = minutesPastMidnight > 8 * 60 + 15 // Checks against 8:15 AM GMT+8

    return {
      name: row.enrollment?.app_user?.full_name || "Unknown Student",
      date: scannedDate.toISOString().split("T")[0],
      generatedTime: generatedDate.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila",
      }),
      scannedTime: scannedDate.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Manila", //GMT +8
      }),
      status: isLate ? "Late" : "On Time",
    }
  })
}
