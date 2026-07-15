import "server-only"
import { lookupId } from "@/lib/lookups"
import { extractNstpType } from "@/lib/shared/class-label"
import type { ServiceClient } from "@/lib/admin/user-provision"

const DEFAULT_COMPONENT = "CWTS"

function nstpLevelFromSemester(semester: string | null | undefined): "1" | "2" {
  return semester === "first" ? "1" : "2"
}

export function courseCodeFromComponent(
  componentCode: string | null | undefined,
  semester: string | null | undefined
): string {
  const code = (componentCode ?? "").trim().toUpperCase() || DEFAULT_COMPONENT
  return `NSTP ${nstpLevelFromSemester(semester)} ${code}`
}

export type EnsureFacilitatorClassResult =
  | { ok: true; sectionId: string }
  | { ok: false; error: string }

/**
 * Get-or-create the facilitator's class for their NSTP component in the active term.
 *
 * Idempotent for per-semester re-imports: an existing row of the same NSTP type
 * is reused; its course_code is refreshed from the facilitator's current
 * component and its status is reset to active. Facilitators may also advise
 * other NSTP types in the same term (see uq_section_adviser_term_nstp_type).
 */
export async function ensureFacilitatorClass(
  service: ServiceClient,
  adviserUserId: string
): Promise<EnsureFacilitatorClassResult> {
  const { data: term } = await service
    .from("term")
    .select("term_id, semester")
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
  const courseCode = courseCodeFromComponent(componentCode, term.semester)
  const nstpType = extractNstpType(courseCode).toUpperCase()
  const activeStatusId = await lookupId("section_status", "active")

  const { data: existingRows, error: findError } = await service
    .from("section")
    .select("section_id, course_code")
    .eq("adviser_user_id", adviserUserId)
    .eq("term_id", term.term_id)
  if (findError) {
    console.error("[ensureFacilitatorClass] lookup failed", findError)
    return { ok: false, error: "Failed to look up the facilitator's class." }
  }

  const existing = (existingRows ?? []).find(
    (row) => extractNstpType(row.course_code).toUpperCase() === nstpType
  )

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
      const { data: racedRows } = await service
        .from("section")
        .select("section_id, course_code")
        .eq("adviser_user_id", adviserUserId)
        .eq("term_id", term.term_id)
      const raced = (racedRows ?? []).find(
        (row) => extractNstpType(row.course_code).toUpperCase() === nstpType
      )
      if (raced) return { ok: true, sectionId: raced.section_id }
    }
    console.error("[ensureFacilitatorClass] insert failed", insertError)
    return { ok: false, error: "Failed to create the facilitator's class." }
  }

  return { ok: true, sectionId: created.section_id }
}
