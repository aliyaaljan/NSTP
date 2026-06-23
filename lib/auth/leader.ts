import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DATABASE_IDS } from "@/lib/constants"

export type ActiveLeaderEnrollment = {
  enrollmentId: string
  sectionId: string
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
      section:section_id (
        section_id,
        name,
        course_code
      )
    `)
    .eq("student_user_id", userId)
    .eq("is_student_leader", true)
    .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)

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
    | { section_id: string; name: string; course_code: string }
    | null
    | undefined
  if (!section) return null

  return {
    enrollmentId: row.enrollment_id,
    sectionId: section.section_id,
    sectionName: section.name,
    courseCode: section.course_code,
  }
}
