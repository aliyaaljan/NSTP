/**
 * Facilitator class reassignment — used when a facilitator is deactivated or
 * deleted while still advising a class. Server-only utility — NOT "use server".
 *
 * Two modes:
 *  - transfer: move the class to another facilitator with no class this term.
 *  - merge: move all enrollments into a busy facilitator's existing class,
 *    then archive the now-empty source class.
 *
 * `uq_section_adviser_term` (one class per facilitator per term) is why a
 * plain UPDATE section.adviser_user_id can't always be used — a facilitator
 * who already teaches this term must receive the source's STUDENTS, not the
 * class row itself.
 */
import "server-only"
import { lookupId } from "@/lib/lookups"
import { formatClassLabel } from "@/lib/shared/class-label"
import type { ServiceClient } from "@/lib/admin/user-provision"

export interface ReassignSourceClass {
  sectionId: string
  termId: string
  classLabel: string
  courseCode: string
  activeStudentCount: number
  totalEnrollmentCount: number
}

export interface ReassignCandidate {
  adviserUserId: string
  fullName: string
  /** true → picking them means MERGE into their existing class. */
  hasClassThisTerm: boolean
  targetSectionId?: string
  targetClassLabel?: string
  targetCourseCode?: string
}

export interface ClassReassignmentData {
  classes: ReassignSourceClass[]
  candidates: ReassignCandidate[]
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
      "section_id, term_id, course_code, adviser:adviser_user_id(full_name), term:term_id(school_year)"
    )
    .eq("adviser_user_id", sourceAdviserUserId)

  const classes: ReassignSourceClass[] = []
  for (const s of sections ?? []) {
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
    classes.push({
      sectionId: s.section_id,
      termId: s.term_id,
      courseCode: s.course_code,
      classLabel: formatClassLabel({
        courseCode: s.course_code,
        facilitatorName: (s.adviser as { full_name?: string } | null)?.full_name,
        schoolYear: (s.term as { school_year?: string } | null)?.school_year,
      }),
      activeStudentCount: activeRes.count ?? 0,
      totalEnrollmentCount: totalRes.count ?? 0,
    })
  }

  // Candidates: active advisers, excluding the source. Annotated with their
  // section in the FIRST source class's term (a facilitator has ≤1 class/term).
  const termId = classes[0]?.termId
  const { data: advisers } = await service
    .from("app_user")
    .select("app_user_id, full_name")
    .eq("role_id", adviserRoleId)
    .eq("is_active", true)
    .neq("app_user_id", sourceAdviserUserId)
    .order("full_name")

  const { data: termSections } = termId
    ? await service
        .from("section")
        .select(
          "section_id, course_code, adviser_user_id, adviser:adviser_user_id(full_name), term:term_id(school_year), status:section_status_id(code)"
        )
        .eq("term_id", termId)
    : { data: [] }

  const sectionByAdviser = new Map(
    (termSections ?? [])
      // A candidate's archived class is not a merge target — treat them as free.
      .filter((s) => (s.status as { code?: string } | null)?.code !== "archived")
      .map((s) => [s.adviser_user_id as string, s])
  )

  const candidates: ReassignCandidate[] = (advisers ?? []).map((a) => {
    const target = sectionByAdviser.get(a.app_user_id)
    return {
      adviserUserId: a.app_user_id,
      fullName: a.full_name ?? "Unknown",
      hasClassThisTerm: Boolean(target),
      targetSectionId: target?.section_id,
      targetCourseCode: target?.course_code,
      targetClassLabel: target
        ? formatClassLabel({
            courseCode: target.course_code,
            facilitatorName: (target.adviser as { full_name?: string } | null)?.full_name,
            schoolYear: (target.term as { school_year?: string } | null)?.school_year,
          })
        : undefined,
    }
  })

  return { classes, candidates }
}

export type ReassignClassMode = "transfer" | "merge"

export type ReassignClassOutcome =
  | {
      ok: true
      mode: ReassignClassMode
      movedStudents: number
      demotedLeaders: string[]
      skippedStudents: { name: string; reason: string }[]
      sourceArchived: boolean
      courseCodeMismatch: boolean
    }
  | { ok: false; error: string }

export async function reassignClass(
  service: ServiceClient,
  input: { sectionId: string; targetAdviserUserId: string; mode: ReassignClassMode }
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

  if (input.mode === "transfer") {
    const { error } = await service
      .from("section")
      .update({ adviser_user_id: input.targetAdviserUserId })
      .eq("section_id", input.sectionId)
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return {
          ok: false,
          error: `${target.full_name} already has a class this term. Choose Merge instead.`,
        }
      }
      console.error("[reassignClass] transfer failed", error)
      return { ok: false, error: "Failed to transfer the class." }
    }
    return {
      ok: true,
      mode: "transfer",
      movedStudents: 0,
      demotedLeaders: [],
      skippedStudents: [],
      sourceArchived: false,
      courseCodeMismatch: false,
    }
  }

  // --- MERGE ---
  const { data: targetSection } = await service
    .from("section")
    .select("section_id, course_code, status:section_status_id(code)")
    .eq("adviser_user_id", input.targetAdviserUserId)
    .eq("term_id", source.term_id)
    .maybeSingle()
  if (!targetSection) {
    return { ok: false, error: `${target.full_name} has no class this term. Use Transfer instead.` }
  }
  if ((targetSection.status as { code?: string } | null)?.code === "archived") {
    return { ok: false, error: "Cannot merge into an archived class." }
  }

  const activeStatusId = await lookupId("enrollment_status", "active")

  // Who is already in the target class (unique (section_id, student_user_id))?
  const { data: targetEnrollments } = await service
    .from("enrollment")
    .select("student_user_id, is_student_leader, enrollment_status_id")
    .eq("section_id", targetSection.section_id)
  const targetStudentIds = new Set(
    (targetEnrollments ?? []).map((e) => e.student_user_id as string)
  )
  let targetHasActiveLeader = (targetEnrollments ?? []).some(
    (e) => e.is_student_leader && e.enrollment_status_id === activeStatusId
  )

  // Move ALL source enrollments (every status) so history follows the student.
  const { data: sourceEnrollments } = await service
    .from("enrollment")
    .select(
      "enrollment_id, student_user_id, is_student_leader, enrollment_status_id, app_user:student_user_id(full_name)"
    )
    .eq("section_id", input.sectionId)

  let moved = 0
  const demotedLeaders: string[] = []
  const skippedStudents: { name: string; reason: string }[] = []

  for (const e of sourceEnrollments ?? []) {
    const name = (e.app_user as { full_name?: string } | null)?.full_name ?? "Unknown student"
    if (targetStudentIds.has(e.student_user_id as string)) {
      skippedStudents.push({ name, reason: "Already enrolled in the target class" })
      continue
    }
    const isActiveLeader = e.is_student_leader && e.enrollment_status_id === activeStatusId
    // assigned_geofence_id MUST be cleared: the enrollment_geofence_section_match
    // trigger aborts a section move while it points at a source-class site.
    const update: Record<string, unknown> = {
      section_id: targetSection.section_id,
      assigned_geofence_id: null,
    }
    if (isActiveLeader && targetHasActiveLeader) {
      update.is_student_leader = false // one active leader per section
      demotedLeaders.push(name)
    }
    const { error } = await service
      .from("enrollment")
      .update(update)
      .eq("enrollment_id", e.enrollment_id)
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        skippedStudents.push({ name, reason: "Already enrolled in the target class" })
        continue
      }
      console.error("[reassignClass] merge row failed", error)
      skippedStudents.push({ name, reason: "Could not be moved — try re-running the merge" })
      continue
    }
    if (isActiveLeader && !targetHasActiveLeader) targetHasActiveLeader = true
    moved += 1
  }

  // Archive the now-(mostly-)empty source class. Safe even when skips remain.
  const archivedStatusId = await lookupId("section_status", "archived")
  const { error: archiveError } = await service
    .from("section")
    .update({ section_status_id: archivedStatusId })
    .eq("section_id", input.sectionId)

  return {
    ok: true,
    mode: "merge",
    movedStudents: moved,
    demotedLeaders,
    skippedStudents,
    sourceArchived: !archiveError,
    courseCodeMismatch: source.course_code !== targetSection.course_code,
  }
}
