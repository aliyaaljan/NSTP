import "server-only"
import { lookupId } from "@/lib/lookups"
import type { ServiceClient } from "@/lib/admin/user-provision"

/** Fallback when a facilitator has no NSTP component on record. */
const DEFAULT_COURSE_CODE = "NSTP 2 CWTS"

/** "CWTS" → "NSTP 2 CWTS"; null/blank → the CWTS default. */
export function courseCodeFromComponent(componentCode: string | null | undefined): string {
  const code = (componentCode ?? "").trim().toUpperCase()
  return code ? `NSTP 2 ${code}` : DEFAULT_COURSE_CODE
}

export type EnsureFacilitatorClassResult =
  | { ok: true; sectionId: string }
  | { ok: false; error: string }

/**
 * Get-or-create the facilitator's single class for the active term.
 *
 * Idempotent for per-semester re-imports: an existing row is reused; its
 * course_code is refreshed from the facilitator's current component and its
 * status is reset to active (facilitator appointments renew every semester).
 */
export async function ensureFacilitatorClass(
  service: ServiceClient,
  adviserUserId: string
): Promise<EnsureFacilitatorClassResult> {
  const { data: term } = await service
    .from("term")
    .select("term_id")
    .eq("is_active", true)
    .maybeSingle()
  if (!term) {
    return { ok: false, error: "No active term — create/activate a term first." }
  }

  const { data: adviser } = await service
    .from("app_user")
    .select("full_name, nstp_component:nstp_component_id(code)")
    .eq("app_user_id", adviserUserId)
    .maybeSingle()
  if (!adviser) {
    return { ok: false, error: "Facilitator account not found." }
  }

  const componentCode = (adviser.nstp_component as { code?: string } | null)?.code
  const courseCode = courseCodeFromComponent(componentCode)
  const activeStatusId = await lookupId("section_status", "active")

  const { data: existing, error: findError } = await service
    .from("section")
    .select("section_id")
    .eq("adviser_user_id", adviserUserId)
    .eq("term_id", term.term_id)
    .maybeSingle()
  if (findError) {
    console.error("[ensureFacilitatorClass] lookup failed", findError)
    return { ok: false, error: "Failed to look up the facilitator's class." }
  }

  if (existing) {
    const { error } = await service
      .from("section")
      .update({ course_code: courseCode, section_status_id: activeStatusId })
      .eq("section_id", existing.section_id)
    if (error) {
      console.error("[ensureFacilitatorClass] update failed", error)
      return { ok: false, error: "Failed to update the facilitator's class." }
    }
    return { ok: true, sectionId: existing.section_id }
  }

  const { data: created, error: insertError } = await service
    .from("section")
    .insert({
      term_id: term.term_id,
      adviser_user_id: adviserUserId,
      course_code: courseCode,
      section_status_id: activeStatusId,
    })
    .select("section_id")
    .single()

  if (insertError) {
    // 23505: a concurrent writer created the row between our SELECT and INSERT.
    if (insertError.code === "23505") {
      const { data: raced } = await service
        .from("section")
        .select("section_id")
        .eq("adviser_user_id", adviserUserId)
        .eq("term_id", term.term_id)
        .maybeSingle()
      if (raced) return { ok: true, sectionId: raced.section_id }
    }
    console.error("[ensureFacilitatorClass] insert failed", insertError)
    return { ok: false, error: "Failed to create the facilitator's class." }
  }

  return { ok: true, sectionId: created.section_id }
}
