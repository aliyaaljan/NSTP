/**
 * Facilitator class reassignment — used when a facilitator is deactivated or
 * deleted while still advising a class, or when an admin wants to move a
 * class to a different facilitator directly from the Classes page. Server-only
 * utility — NOT "use server".
 *
 * A target facilitator with no class this term gets a plain TRANSFER (the
 * class moves as-is; adviser_user_id changes, nothing else). A target
 * facilitator who already has a class this term of the SAME NSTP component
 * (CWTS/LTS/ROTC) triggers a MERGE instead: the source class's roster, sites,
 * and section-scoped form requirements fold into the target's class, and the
 * emptied source class is deleted (merge_class_into RPC,
 * 0010_restore_one_class_per_term.sql). A target with a different-component
 * class is not offered as a candidate at all.
 *
 * `uq_section_adviser_term` enforces one class per facilitator per term —
 * merging (rather than allowing two classes) is how that rule stays intact
 * when reassigning onto a facilitator who already has a class.
 */
import "server-only"
import { lookupId } from "@/lib/lookups"
import { extractNstpType, formatClassLabel } from "@/lib/shared/class-label"
import type { ServiceClient } from "@/lib/admin/user-provision"

export interface ReassignCandidate {
  adviserUserId: string
  fullName: string
  mode: "transfer" | "merge"
  /** Present only when mode === "merge". */
  targetSectionId?: string
  targetCourseCode?: string
  targetStudentCount?: number
}

export interface ReassignSourceClass {
  sectionId: string
  termId: string
  classLabel: string
  courseCode: string
  schoolYear: string | null
  activeStudentCount: number
  totalEnrollmentCount: number
  /** Active facilitators eligible to receive this class (transfer or merge). */
  candidates: ReassignCandidate[]
}

export interface ClassReassignmentData {
  classes: ReassignSourceClass[]
}

export interface MergeLeader {
  enrollmentId: string
  fullName: string
  side: "source" | "target"
}

export interface MergePreview {
  targetClassLabel: string
  /** Total enrollment rows (any status) that will move. */
  moveStudentCount: number
  activeStudentCount: number
  siteCount: number
  requirementCount: number
  leaders: MergeLeader[]
  settingsDiffer: boolean
  targetRequiredHourTotal: number
  targetDailyCutoffTime: string
}

export interface MergeSummary {
  movedStudentCount: number
  mergedDuplicateNames: string[]
  leadersKept: number
  leadersDemoted: number
  geofencesMoved: number
  requirementsMoved: number
  targetClassLabel: string
}

export type ReassignClassOutcome =
  | { ok: true; mode: "transferred" }
  | { ok: true; mode: "merged"; summary: MergeSummary }
  | { ok: false; error: string }

type TermSectionRow = {
  section_id: string
  term_id: string
  course_code: string
  adviser_user_id: string
  adviser: { full_name?: string } | null
  term: { school_year?: string } | null
  status: { code?: string } | null
}

/** Candidates for ONE source class — depends on that class's NSTP component. */
function buildCandidatesForClass(
  advisers: Array<{ app_user_id: string; full_name: string | null }>,
  termSections: TermSectionRow[],
  sourceCourseCode: string,
  activeCountBySection: Map<string, number>
): ReassignCandidate[] {
  const sourceType = extractNstpType(sourceCourseCode)
  const sectionByAdviser = new Map(termSections.map((s) => [s.adviser_user_id, s]))

  const out: ReassignCandidate[] = []
  for (const a of advisers) {
    const owned = sectionByAdviser.get(a.app_user_id)
    if (!owned) {
      out.push({ adviserUserId: a.app_user_id, fullName: a.full_name ?? "Unknown", mode: "transfer" })
      continue
    }
    if (owned.status?.code === "active" && extractNstpType(owned.course_code) === sourceType) {
      out.push({
        adviserUserId: a.app_user_id,
        fullName: a.full_name ?? "Unknown",
        mode: "merge",
        targetSectionId: owned.section_id,
        targetCourseCode: owned.course_code,
        targetStudentCount: activeCountBySection.get(owned.section_id) ?? 0,
      })
    }
    // Different-component or non-active class → not a candidate at all.
  }
  return out
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
      "section_id, term_id, course_code, adviser:adviser_user_id(full_name), term:term_id(school_year, semester), status:section_status_id(code)"
    )
    .eq("adviser_user_id", sourceAdviserUserId)

  // Only active classes are reassignable/mergeable.
  const activeSections = (sections ?? []).filter(
    (s) => (s.status as { code?: string } | null)?.code === "active"
  )

  const sortedSections = [...activeSections].sort((a, b) => {
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

  const termSectionsByTerm = new Map<string, TermSectionRow[]>()
  for (const raw of allTermSections ?? []) {
    const s = raw as unknown as TermSectionRow
    const list = termSectionsByTerm.get(s.term_id) ?? []
    list.push(s)
    termSectionsByTerm.set(s.term_id, list)
  }

  // Batched active-enrollment counts for every section that might be a merge
  // target (used to show "N students" on the merge candidate option).
  const candidateSectionIds = (allTermSections ?? []).map((s) => s.section_id as string)
  const activeCountBySection = new Map<string, number>()
  if (candidateSectionIds.length > 0) {
    const { data: rows } = await service
      .from("enrollment")
      .select("section_id")
      .in("section_id", candidateSectionIds)
      .eq("enrollment_status_id", activeEnrollmentStatusId)
    for (const r of rows ?? []) {
      const id = r.section_id as string
      activeCountBySection.set(id, (activeCountBySection.get(id) ?? 0) + 1)
    }
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
        termSectionsByTerm.get(s.term_id) ?? [],
        s.course_code,
        activeCountBySection
      ),
    })
  }

  return { classes }
}

/** Everything the merge confirm step needs, once a merge target is picked. */
export async function getMergePreview(
  service: ServiceClient,
  sourceSectionId: string,
  targetSectionId: string
): Promise<{ ok: true; preview: MergePreview } | { ok: false; error: string }> {
  const activeEnrollmentStatusId = await lookupId("enrollment_status", "active")

  const [{ data: source }, { data: target }] = await Promise.all([
    service
      .from("section")
      .select("section_id, course_code, required_hour_total, daily_cutoff_time")
      .eq("section_id", sourceSectionId)
      .maybeSingle(),
    service
      .from("section")
      .select(
        "section_id, course_code, required_hour_total, daily_cutoff_time, adviser:adviser_user_id(full_name), term:term_id(school_year)"
      )
      .eq("section_id", targetSectionId)
      .maybeSingle(),
  ])
  if (!source || !target) return { ok: false, error: "Class not found." }

  const [moveRes, activeRes, siteRes, reqRes, { data: leaderRows }] = await Promise.all([
    service.from("enrollment").select("*", { count: "exact", head: true }).eq("section_id", sourceSectionId),
    service
      .from("enrollment")
      .select("*", { count: "exact", head: true })
      .eq("section_id", sourceSectionId)
      .eq("enrollment_status_id", activeEnrollmentStatusId),
    service.from("section_geofence").select("*", { count: "exact", head: true }).eq("section_id", sourceSectionId),
    service.from("form_requirement").select("*", { count: "exact", head: true }).eq("section_id", sourceSectionId),
    service
      .from("enrollment")
      .select("enrollment_id, section_id, student:student_user_id(full_name)")
      .in("section_id", [sourceSectionId, targetSectionId])
      .eq("is_student_leader", true),
  ])

  return {
    ok: true,
    preview: {
      targetClassLabel: formatClassLabel({
        courseCode: target.course_code,
        facilitatorName: (target.adviser as { full_name?: string } | null)?.full_name,
        schoolYear: (target.term as { school_year?: string } | null)?.school_year,
      }),
      moveStudentCount: moveRes.count ?? 0,
      activeStudentCount: activeRes.count ?? 0,
      siteCount: siteRes.count ?? 0,
      requirementCount: reqRes.count ?? 0,
      leaders: (leaderRows ?? []).map((r) => ({
        enrollmentId: r.enrollment_id as string,
        fullName: (r.student as { full_name?: string } | null)?.full_name ?? "Unknown",
        side: r.section_id === sourceSectionId ? ("source" as const) : ("target" as const),
      })),
      settingsDiffer:
        source.required_hour_total !== target.required_hour_total ||
        source.daily_cutoff_time !== target.daily_cutoff_time,
      targetRequiredHourTotal: target.required_hour_total as number,
      targetDailyCutoffTime: target.daily_cutoff_time as string,
    },
  }
}

export async function reassignClass(
  service: ServiceClient,
  input: {
    sectionId: string
    targetAdviserUserId: string
    merge?: boolean
    keepLeaderEnrollmentIds?: string[]
    actorUserId: string
  }
): Promise<ReassignClassOutcome> {
  const { data: source } = await service
    .from("section")
    .select("section_id, term_id, adviser_user_id, course_code, status:section_status_id(code)")
    .eq("section_id", input.sectionId)
    .maybeSingle()
  if (!source) return { ok: false, error: "Class not found." }
  if ((source.status as { code?: string } | null)?.code !== "active") {
    return { ok: false, error: "Only active classes can be reassigned." }
  }
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

  const { data: targetClass } = await service
    .from("section")
    .select("section_id, course_code, status:section_status_id(code)")
    .eq("adviser_user_id", input.targetAdviserUserId)
    .eq("term_id", source.term_id)
    .maybeSingle()

  if (!targetClass) {
    // PLAIN TRANSFER — target has no class this term. Any component is fine;
    // course_code stays with the class, the facilitator's own component is
    // untouched (they aren't tied to one component across semesters).
    const { error } = await service
      .from("section")
      .update({ adviser_user_id: input.targetAdviserUserId })
      .eq("section_id", input.sectionId)
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        // Race: someone else gave this facilitator a class between our SELECT and UPDATE.
        return {
          ok: false,
          error: `${target.full_name} already has a class this term. Choose another facilitator.`,
        }
      }
      console.error("[reassignClass] transfer failed", error)
      return { ok: false, error: "Failed to reassign the class." }
    }
    return { ok: true, mode: "transferred" }
  }

  // MERGE — target already has a class this term.
  if ((targetClass.status as { code?: string } | null)?.code !== "active") {
    return {
      ok: false,
      error: `${target.full_name}'s class this term is not active, so it can't receive a merge.`,
    }
  }
  const sourceType = extractNstpType(source.course_code)
  const targetType = extractNstpType(targetClass.course_code)
  if (sourceType !== targetType) {
    return {
      ok: false,
      error: `${target.full_name} has a ${targetType} class this term — a ${sourceType} class can't merge into it.`,
    }
  }
  if (!input.merge) {
    return {
      ok: false,
      error: `${target.full_name} already has a ${targetType} class this term. Confirm the merge to continue.`,
    }
  }

  const { data, error } = await service.rpc("merge_class_into", {
    p_source_section_id: input.sectionId,
    p_target_section_id: targetClass.section_id,
    p_keep_leader_enrollment_ids: input.keepLeaderEnrollmentIds ?? null,
    p_actor_user_id: input.actorUserId,
  })
  if (error) {
    console.error("[reassignClass] merge failed", error)
    return { ok: false, error: "Failed to merge the classes. No changes were made." }
  }

  const removedPaths = ((data?.removed_submission_storage_paths ?? []) as string[]).filter(Boolean)
  if (removedPaths.length > 0) {
    const { error: removeError } = await service.storage.from("forms").remove(removedPaths)
    if (removeError) {
      console.error("[reassignClass] failed to clean up superseded form submission files", removeError)
    }
  }

  return {
    ok: true,
    mode: "merged",
    summary: {
      movedStudentCount: data.moved_student_count,
      mergedDuplicateNames: data.merged_duplicate_names ?? [],
      leadersKept: data.leaders_kept,
      leadersDemoted: data.leaders_demoted,
      geofencesMoved: data.geofences_moved,
      requirementsMoved: data.requirements_moved,
      targetClassLabel: data.target_class_label,
    },
  }
}
