"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { lookupId } from "@/lib/lookups"
import { revalidatePath } from "next/cache"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function resolveStudentRequest(
  appealId: string,
  decision: "approved" | "rejected",
  resolutionNote: string
): Promise<ActionResult<any>> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const { data: appeal } = await service
      .from("appeal")
      .select("enrollment_id")
      .eq("appeal_id", appealId)
      .single()
    if (!appeal) throw new Error("Appeal not found")

    const { data: advises } = await supabase.rpc("app_advises_enrollment", {
      p_enrollment_id: appeal.enrollment_id,
    })
    if (!advises) throw new Error("Permission denied")

    const statusId = await lookupId("appeal_status", decision)

    // Bypass RLS to update
    const { error } = await service
      .from("appeal")
      .update({
        appeal_status_id: statusId,
        resolution_note: resolutionNote,
        resolved_by_user_id: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("appeal_id", appealId)

    if (error) throw error

    revalidatePath("/facilitator/dashboard")
    return { ok: true, data: null }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
