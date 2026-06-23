"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { DATABASE_IDS } from "@/lib/constants"

export type StudentDashboardData = {
  enrollmentId: string | null
  fullName: string
  studentNumber: string | null
  sectionName: string | null
  requiredHours: number
  hoursRendered: number
  renderedDaysByMonth: Record<number, number[]>
  renderedTimeByMonth: Record<number, Record<number, string>>
}

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h 0m`
}

export async function getStudentDashboard(): Promise<
  { ok: true; data: StudentDashboardData } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  // Identity — always returned even without an enrollment
  const { data: appUser } = await service
    .from("app_user")
    .select("full_name, student_number")
    .eq("app_user_id", user.id)
    .single()

  const fullName = appUser?.full_name ?? ""
  const studentNumber = appUser?.student_number ?? null

  // Resolve the active section_status id by code
  const { data: activeSectionStatus } = await service
    .from("section_status")
    .select("section_status_id")
    .eq("code", "active")
    .single()

  if (!activeSectionStatus) {
    return {
      ok: true,
      data: {
        enrollmentId: null,
        fullName,
        studentNumber,
        sectionName: null,
        requiredHours: 60,
        hoursRendered: 0,
        renderedDaysByMonth: {},
        renderedTimeByMonth: {},
      },
    }
  }

  // Primary enrollment: active enrollment + active section, prefer active term
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
    .eq("student_user_id", user.id)
    .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)

  // Filter to active sections, sort by term.is_active desc then course_code asc
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
      const termA = Array.isArray(a.section.term)
        ? a.section.term[0]
        : a.section.term
      const termB = Array.isArray(b.section.term)
        ? b.section.term[0]
        : b.section.term
      const activeA = termA?.is_active ? 1 : 0
      const activeB = termB?.is_active ? 1 : 0
      if (activeB !== activeA) return activeB - activeA
      return (a.section.course_code ?? "").localeCompare(
        b.section.course_code ?? ""
      )
    })

  const primary = candidates[0] ?? null

  if (!primary) {
    return {
      ok: true,
      data: {
        enrollmentId: null,
        fullName,
        studentNumber,
        sectionName: null,
        requiredHours: 60,
        hoursRendered: 0,
        renderedDaysByMonth: {},
        renderedTimeByMonth: {},
      },
    }
  }

  // Resolve closed session status id
  const { data: closedStatus } = await service
    .from("attendance_session_status")
    .select("attendance_session_status_id")
    .eq("code", "closed")
    .single()

  // Fetch closed sessions for this enrollment
  const { data: sessions } = await service
    .from("attendance_session")
    .select("started_at, duration_minute")
    .eq("enrollment_id", primary.enrollmentId)
    .eq(
      "attendance_session_status_id",
      closedStatus!.attendance_session_status_id
    )

  let totalMinutes = 0
  const daysByMonth: Record<number, Set<number>> = {}
  const minutesByMonthDay: Record<number, Record<number, number>> = {}

  for (const s of sessions ?? []) {
    const dur = s.duration_minute ?? 0
    totalMinutes += dur

    // Convert to Manila local date for calendar grouping
    const d = new Date(s.started_at)
    const manila = new Date(
      d.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    )
    const month = manila.getMonth()
    const day = manila.getDate()

    if (!daysByMonth[month]) daysByMonth[month] = new Set()
    daysByMonth[month].add(day)

    if (!minutesByMonthDay[month]) minutesByMonthDay[month] = {}
    minutesByMonthDay[month][day] =
      (minutesByMonthDay[month][day] ?? 0) + dur
  }

  const renderedDaysByMonth: Record<number, number[]> = {}
  for (const [m, days] of Object.entries(daysByMonth)) {
    renderedDaysByMonth[Number(m)] = [...days].sort((a, b) => a - b)
  }

  const renderedTimeByMonth: Record<number, Record<number, string>> = {}
  for (const [m, days] of Object.entries(minutesByMonthDay)) {
    renderedTimeByMonth[Number(m)] = {}
    for (const [d, mins] of Object.entries(days)) {
      renderedTimeByMonth[Number(m)][Number(d)] = formatMinutes(mins)
    }
  }

  return {
    ok: true,
    data: {
      enrollmentId: primary.enrollmentId,
      fullName,
      studentNumber,
      sectionName: primary.section.name,
      requiredHours: primary.section.required_hour_total ?? 60,
      hoursRendered: Math.floor(totalMinutes / 60),
      renderedDaysByMonth,
      renderedTimeByMonth,
    },
  }
}
