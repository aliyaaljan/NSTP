import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { lookupId } from "@/lib/lookups"
import { formatClassLabel } from "@/lib/shared/class-label"

export type ActiveStudentEnrollment = {
  enrollmentId: string
  isStudentLeader: boolean
  adviserName: string | null
  adviserEmail: string | null
  termEndDate: string | null
  programName: string | null
  classificationName: string | null
  siteLocation: string | null
  section: {
    section_id: string
    label: string
    course_code: string
    required_hour_total: number
    section_status_id: string
  }
}

// Resolves the student's single "current" enrollment deterministically.
// A student can have several active enrollments (past terms, multiple sections),
// so a bare .limit(1) would bind the QR / time-out to an arbitrary section.
// We filter to active-status sections, then prefer the active term and break ties
// by course_code → enrollment_id so the choice is stable across calls.
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
      is_student_leader,
      program:program_id ( name ),
      student_classification:student_classification_id ( name ),
      geofence:assigned_geofence_id ( label ),
      section:section_id (
        section_id,
        course_code,
        required_hour_total,
        section_status_id,
        adviser:adviser_user_id ( full_name, email ),
        term:term_id ( is_active, school_year, end_date )
      )
    `
    )
    .eq("student_user_id", userId)
    .eq("enrollment_status_id", await lookupId("enrollment_status", "active"))

  const candidates = (enrollments ?? [])
    .map((e) => {
      const sec = Array.isArray(e.section) ? e.section[0] : e.section
      const program = Array.isArray(e.program) ? e.program[0] : e.program
      const classification = Array.isArray(e.student_classification)
        ? e.student_classification[0]
        : e.student_classification
      const geofence = Array.isArray(e.geofence) ? e.geofence[0] : e.geofence
      return {
        enrollmentId: e.enrollment_id,
        isStudentLeader: e.is_student_leader ?? false,
        section: sec,
        programName: program?.name ?? null,
        classificationName: classification?.name ?? null,
        siteLocation: geofence?.label ?? null,
      }
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
  const adviser = Array.isArray(primary.section.adviser)
    ? primary.section.adviser[0]
    : primary.section.adviser
  const term = Array.isArray(primary.section.term)
    ? primary.section.term[0]
    : primary.section.term
  return {
    enrollmentId: primary.enrollmentId,
    isStudentLeader: primary.isStudentLeader,
    adviserName: adviser?.full_name ?? null,
    adviserEmail: adviser?.email ?? null,
    termEndDate: term?.end_date ?? null,
    programName: primary.programName,
    classificationName: primary.classificationName,
    siteLocation: primary.siteLocation,
    section: {
      section_id: primary.section.section_id,
      label: formatClassLabel({
        courseCode: primary.section.course_code,
        facilitatorName: adviser?.full_name,
        schoolYear: term?.school_year,
      }),
      course_code: primary.section.course_code,
      required_hour_total: primary.section.required_hour_total,
      section_status_id: primary.section.section_status_id,
    },
  }
}
