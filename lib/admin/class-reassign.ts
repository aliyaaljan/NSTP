/**
 * Facilitator class reassignment — used when a facilitator is deactivated or
 * deleted while still advising a class. Server-only utility — NOT "use server".
 *
 * Reassignment transfers the whole class to an active facilitator in the same
 * term who does not already advise the same NSTP type (CWTS / LTS / ROTC).
 * Classes and their enrollment history are never merged.
 */
import "server-only"
import { lookupId } from "@/lib/lookups"
import { extractNstpType, formatClassLabel } from "@/lib/shared/class-label"
import type { ServiceClient } from "@/lib/admin/user-provision"

export interface ReassignCandidate {
  adviserUserId: string
  fullName: string
}

export interface ReassignSourceClass {
  sectionId: string
  termId: string
  classLabel: string
  courseCode: string
  schoolYear: string | null
  activeStudentCount: number
  totalEnrollmentCount: number
  /** Active facilitators available for THIS class (same term, different NSTP type). */
  candidates: ReassignCandidate[]
}

export interface ClassReassignmentData {
  classes: ReassignSourceClass[]
}

function buildCandidatesForClass(
  advisers: Array<{ app_user_id: string; full_name: string | null }>,
  termSections: Array<{
    adviser_user_id: string
    course_code: string
  }>,
  sourceCourseCode: string
): ReassignCandidate[] {
  const sourceType = extractNstpType(sourceCourseCode).toUpperCase()
  const advisersWithSameType = new Set(
    termSections
      .filter((s) => extractNstpType(s.course_code).toUpperCase() === sourceType)
      .map((s) => s.adviser_user_id)
  )

  return advisers
    .filter((a) => !advisersWithSameType.has(a.app_user_id))
    .map((a) => ({
      adviserUserId: a.app_user_id,
      fullName: a.full_name ?? "Unknown",
    }))
}

/** Everything the ReassignClassModal needs for one source facilitator. */
export async function getClassReassignmentData(
  service: ServiceClient,
  sourceAdviserUserId: string
): Promise<ClassReassignmentData> {
  const activeEnrollmentStatusId = await lookupId("enrollment_status", "active")
  const adviserRoleId = await lookupId("role", "adviser")

  const { data: sections } = await service
    .from("section")
    .select(
      "section_id, term_id, course_code, adviser:adviser_user_id(full_name), term:term_id(school_year, semester)"
    )
    .eq("adviser_user_id", sourceAdviserUserId)

  const sortedSections = [...(sections ?? [])].sort((a, b) => {
    const yearA = (a.term as { school_year?: string } | null)?.school_year ?? ""
    const yearB = (b.term as { school_year?: string } | null)?.school_year ?? ""
    if (yearA !== yearB) return yearB.localeCompare(yearA)
    return (a.course_code as string).localeCompare(b.course_code as string)
  })

  const termIds = [...new Set(sortedSections.map((s) => s.term_id as string))]

  const [{ data: advisers }, { data: allTermSections }] = await Promise.all([
    service
      .from("app_user")
      .select("app_user_id, full_name")
      .eq("role_id", adviserRoleId)
      .eq("is_active", true)
      .neq("app_user_id", sourceAdviserUserId)
      .order("full_name"),
    termIds.length > 0
      ? service
          .from("section")
          .select(
            "section_id, term_id, course_code, adviser_user_id, adviser:adviser_user_id(full_name), term:term_id(school_year), status:section_status_id(code)"
          )
          .in("term_id", termIds)
      : Promise.resolve({ data: [] }),
  ])

  type TermSectionRow = {
    section_id: string
    term_id: string
    course_code: string
    adviser_user_id: string
    adviser: { full_name?: string } | null
    term: { school_year?: string } | null
    status: { code?: string } | null
  }

  const termSectionsByTerm = new Map<string, TermSectionRow[]>()
  for (const raw of allTermSections ?? []) {
    const s = raw as unknown as TermSectionRow
    const list = termSectionsByTerm.get(s.term_id) ?? []
    list.push(s)
    termSectionsByTerm.set(s.term_id, list)
  }

  const classes: ReassignSourceClass[] = []
  for (const s of sortedSections) {
    const [activeRes, totalRes] = await Promise.all([
      service
        .from("enrollment")
        .select("*", { count: "exact", head: true })
        .eq("section_id", s.section_id)
        .eq("enrollment_status_id", activeEnrollmentStatusId),
      service
        .from("enrollment")
        .select("*", { count: "exact", head: true })
        .eq("section_id", s.section_id),
    ])
    const schoolYear = (s.term as { school_year?: string } | null)?.school_year ?? null
    const termSections = termSectionsByTerm.get(s.term_id) ?? []
    classes.push({
      sectionId: s.section_id,
      termId: s.term_id,
      courseCode: s.course_code,
      schoolYear,
      classLabel: formatClassLabel({
        courseCode: s.course_code,
        facilitatorName: (s.adviser as { full_name?: string } | null)?.full_name,
        schoolYear,
      }),
      activeStudentCount: activeRes.count ?? 0,
      totalEnrollmentCount: totalRes.count ?? 0,
      candidates: buildCandidatesForClass(
        advisers ?? [],
        termSections,
        s.course_code as string
      ),
    })
  }

  return { classes }
}

export type ReassignClassOutcome =
  | { ok: true }
  | { ok: false; error: string }

export async function reassignClass(
  service: ServiceClient,
  input: { sectionId: string; targetAdviserUserId: string }
): Promise<ReassignClassOutcome> {
  const { data: source } = await service
    .from("section")
    .select("section_id, term_id, course_code, adviser_user_id")
    .eq("section_id", input.sectionId)
    .maybeSingle()
  if (!source) return { ok: false, error: "Class not found." }
  if (source.adviser_user_id === input.targetAdviserUserId) {
    return { ok: false, error: "The class already belongs to this facilitator." }
  }

  const { data: target } = await service
    .from("app_user")
    .select("full_name, is_active, role:role_id(code)")
    .eq("app_user_id", input.targetAdviserUserId)
    .maybeSingle()
  if (!target) return { ok: false, error: "Target facilitator not found." }
  if ((target.role as { code?: string } | null)?.code !== "adviser") {
    return { ok: false, error: "Target user is not a facilitator." }
  }
  if (!target.is_active) {
    return { ok: false, error: "Target facilitator's account is deactivated." }
  }

  const sourceType = extractNstpType(source.course_code).toUpperCase()
  const { data: targetClasses } = await service
    .from("section")
    .select("section_id, course_code")
    .eq("adviser_user_id", input.targetAdviserUserId)
    .eq("term_id", source.term_id)

  const targetTypes = [
    ...new Set(
      (targetClasses ?? [])
        .map((row) => extractNstpType(row.course_code).toUpperCase())
        .filter(Boolean)
    ),
  ]

  if (sourceType && targetTypes.includes(sourceType)) {
    return {
      ok: false,
      error: `${target.full_name} already has a ${sourceType} class this term. Choose another facilitator.`,
    }
  }

  const { error } = await service
    .from("section")
    .update({ adviser_user_id: input.targetAdviserUserId })
    .eq("section_id", input.sectionId)
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // Old DB constraint uq_section_adviser_term blocks ANY second class in the
      // term. New rule (0010) only blocks the same NSTP type.
      const owned =
        targetTypes.length > 0 ? targetTypes.join(", ") : "another class"
      return {
        ok: false,
        error: `${target.full_name} already advises ${owned} this term. Apply migration 0010_section_adviser_term_nstp_type.sql so facilitators can hold different NSTP types in the same term.`,
      }
    }
    console.error("[reassignClass] transfer failed", error)
    return { ok: false, error: "Failed to reassign the class." }
  }

  return { ok: true }
}
