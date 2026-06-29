"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib/lookups"
import { revalidatePath } from "next/cache"

export type AppealType =
  | "Absence Excuse"
  | "Hour Adjustment"
  | "Schedule Change"

export interface SubmitAppealPayload {
  enrollmentId: string
  appealType: AppealType
  reason: string
  requestedTimeIn?: string // Formatted ISO string or HH:MM
  requestedTimeOut?: string // Formatted ISO string or HH:MM
}

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/**
 * Inserts an attendance or schedule change request directly into the database.
 * Relies on the client-safe 'appeal_insert_self' RLS policy to validate student enrollment ownership.
 */
export async function submitStudentAppeal(
  payload: SubmitAppealPayload
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    // Resolve the dynamic lookup ID for the 'open' state safely without hardcoded UUIDs
    const openStatusId = await lookupId("appeal_status", "open")

    // Insert request directly into the database schema
    const { data: appeal, error } = await supabase
      .from("appeal")
      .insert({
        enrollment_id: payload.enrollmentId,
        requester_user_id: user.id,
        appeal_status_id: openStatusId,
        reason: `[${payload.appealType}] ${payload.reason}`,
        requested_time_in: payload.requestedTimeIn || null,
        requested_time_out: payload.requestedTimeOut || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[submitStudentAppeal] DB Exception:", error)
      return {
        ok: false,
        error: "Database rejection. Please check your session profile data.",
      }
    }

    // Force Next.js router cache to clear so changes propagate immediately on refresh
    revalidatePath("/student/dashboard")
    return { ok: true, data: appeal }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
