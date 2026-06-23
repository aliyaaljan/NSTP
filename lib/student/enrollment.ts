import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DATABASE_IDS } from "@/lib/constants"

export type ActiveStudentEnrollment = {
  enrollmentId: string
  section: {
    section_id: string
    name: string
    course_code: string
    required_hour_total: number
    section_status_id: string
  }
}

// Resolves the student's single "current" enrollment deterministically.
// A student can have several active enrollments (past terms, multiple sections),
// so a bare .limit(1) would bind the QR / time-out to an arbitrary section.
// We filter to active-status sections, then prefer the active term and break ties
// by course_code → name → enrollment_id so the choice is stable across calls.
// Pass the service client (this trusts server-side data and bypasses RLS).
export async function resolveActiveStudentEnrollment(
  service: SupabaseClient,
  userId: string
): Promise<ActiveStudentEnrollment | null> {
  const { data: activeSectionStatus } = await service
    .from("section_status")
    .select("section_status_id")
    .eq("code", "active")
    .single()

  if (!activeSectionStatus) return null

  const { data: enrollments } = await service
    .from("enrollment")
    .select(
      `
      enrollment_id,
      section:section_id (
        section_id,
        name,
        course_code,
        required_hour_total,
        section_status_id,
        term:term_id ( is_active )
      )
    `
    )
    .eq("student_user_id", userId)
    .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)

  const candidates = (enrollments ?? [])
    .map((e) => {
      const sec = Array.isArray(e.section) ? e.section[0] : e.section
      return { enrollmentId: e.enrollment_id, section: sec }
    })
    .filter(
      (e) =>
        e.section &&
        e.section.section_status_id === activeSectionStatus.section_status_id
    )
    .sort((a, b) => {
      const termA = Array.isArray(a.section.term) ? a.section.term[0] : a.section.term
      const termB = Array.isArray(b.section.term) ? b.section.term[0] : b.section.term
      const activeA = termA?.is_active ? 1 : 0
      const activeB = termB?.is_active ? 1 : 0
      if (activeB !== activeA) return activeB - activeA
      const byCourse = (a.section.course_code ?? "").localeCompare(
        b.section.course_code ?? ""
      )
      if (byCourse !== 0) return byCourse
      const byName = (a.section.name ?? "").localeCompare(b.section.name ?? "")
      if (byName !== 0) return byName
      return a.enrollmentId.localeCompare(b.enrollmentId)
    })

  if (candidates.length === 0) return null

  if (candidates.length > 1) {
    // Business rule: one active section per student at a time. Log and pick the
    // deterministic first (same convention as getActiveLeaderEnrollment).
    console.warn(
      "[resolveActiveStudentEnrollment] user %s has %d active enrollments; expected 1. Using first.",
      userId,
      candidates.length
    )
  }

  const primary = candidates[0]
  return {
    enrollmentId: primary.enrollmentId,
    section: {
      section_id: primary.section.section_id,
      name: primary.section.name,
      course_code: primary.section.course_code,
      required_hour_total: primary.section.required_hour_total,
      section_status_id: primary.section.section_status_id,
    },
  }
}
