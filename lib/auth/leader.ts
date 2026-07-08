import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { lookupId } from "@/lib/lookups"
import { formatClassLabel } from "@/lib/shared/class-label"

export type ActiveLeaderEnrollment = {
  enrollmentId: string
  sectionId: string
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  sectionName: string
  courseCode: string
}

export async function getActiveLeaderEnrollment(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveLeaderEnrollment | null> {
  const { data, error } = await supabase
    .from("enrollment")
    .select(`
      enrollment_id,
      section:section_id!inner (
        section_id,
        course_code,
        adviser:adviser_user_id ( full_name ),
        term:term_id ( school_year )
      )
    `)
    .eq("student_user_id", userId)
    .eq("is_student_leader", true)
    .eq("enrollment_status_id", await lookupId("enrollment_status", "active"))
    .eq("section.section_status_id", await lookupId("section_status", "active"))

  if (error) {
    console.error("[getActiveLeaderEnrollment] query failed", error)
    return null
  }

  if (!data || data.length === 0) return null

  if (data.length > 1) {
    // Business rule: one active section at a time. Log and pick the first deterministically.
    console.warn(
      "[getActiveLeaderEnrollment] user %s leads %d active sections; expected 1. Using first.",
      userId,
      data.length
    )
  }

  const row = data[0]
  // Supabase FK joins can be typed as arrays by the SDK even for many-to-one
  const sectionRaw = row.section
  const section = (Array.isArray(sectionRaw) ? sectionRaw[0] : sectionRaw) as
    | {
        section_id: string
        course_code: string
        adviser: { full_name: string } | { full_name: string }[] | null
        term: { school_year: string } | { school_year: string }[] | null
      }
    | null
    | undefined
  if (!section) return null

  const adviser = Array.isArray(section.adviser) ? section.adviser[0] : section.adviser
  const term = Array.isArray(section.term) ? section.term[0] : section.term

  return {
    enrollmentId: row.enrollment_id,
    sectionId: section.section_id,
    sectionName: formatClassLabel({
      courseCode: section.course_code,
      facilitatorName: adviser?.full_name,
      schoolYear: term?.school_year,
    }),
    courseCode: section.course_code,
  }
}
