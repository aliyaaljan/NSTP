"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { lookupId } from "@/lib/lookups"
import { getInitials } from "@/lib/student/dashboard-view"
import { extractNstpType } from "@/lib/shared/class-label"

export type StudentDashboardData = {
  enrollmentId: string | null
  isLeader: boolean
  fullName: string
  studentNumber: string | null
  email: string | null
  sectionName: string | null
  adviserName: string | null
  adviserEmail: string | null
  termEndDate: string | null
  requiredHours: number
  hoursRendered: number
  renderedDaysByMonth: Record<number, number[]>
  renderedTimeByMonth: Record<number, Record<number, string>>
  classmateCount: number
  classmateInitials: string[]
  programName: string | null
  classificationName: string | null
  nstpType: string | null
  siteLocation: string | null
}

type ActionResult =
  | { ok: true; data: StudentDashboardData }
  | { ok: false; error: string }

function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h 0m`
}

const MANILA_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

function manilaMonthDay(iso: string): { month: number; day: number } | null {
  const parts = MANILA_FORMAT.formatToParts(new Date(iso))
  const month = Number(parts.find((p) => p.type === "month")?.value)
  const day = Number(parts.find((p) => p.type === "day")?.value)
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null
  return { month: month - 1, day } // month index 0-11
}

function emptyDashboard(
  fullName: string,
  studentNumber: string | null,
  email: string | null
): StudentDashboardData {
  return {
    enrollmentId: null,
    isLeader: false,
    fullName,
    studentNumber,
    email,
    sectionName: null,
    adviserName: null,
    adviserEmail: null,
    termEndDate: null,
    requiredHours: 60,
    hoursRendered: 0,
    renderedDaysByMonth: {},
    renderedTimeByMonth: {},
    classmateCount: 0,
    classmateInitials: [],
    programName: null,
    classificationName: null,
    nstpType: null,
    siteLocation: null,
  }
}

export async function getStudentDashboard(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const { data: appUser } = await service
      .from("app_user")
      .select("full_name, student_number, email")
      .eq("app_user_id", user.id)
      .single()

    const fullName = appUser?.full_name ?? ""
    const studentNumber = appUser?.student_number ?? null
    const email = appUser?.email ?? null

    const primary = await resolveActiveStudentEnrollment(service, user.id)

    if (!primary) {
      return { ok: true, data: emptyDashboard(fullName, studentNumber, email) }
    }

    const { data: classmates } = await service
      .from("enrollment")
      .select("app_user:student_user_id(full_name)")
      .eq("section_id", primary.section.section_id)
      .eq(
        "enrollment_status_id",
        await lookupId("enrollment_status", "active")
      )

    const classmateCount = classmates?.length ?? 0
    const classmateInitials = (classmates ?? [])
      .map((c) => {
        const au = Array.isArray(c.app_user) ? c.app_user[0] : c.app_user
        return au?.full_name ? getInitials(au.full_name) : ""
      })
      .filter(Boolean)
      .slice(0, 4)

    // Rendered hours count completed sessions only: 'closed' (normal/manual) + 'corrected' (edited via appeal/adviser).
    const { data: countedStatuses } = await service
      .from("attendance_session_status")
      .select("attendance_session_status_id")
      .in("code", ["closed", "corrected"])

    if (!countedStatuses || countedStatuses.length === 0) {
      return {
        ok: true,
        data: {
          ...emptyDashboard(fullName, studentNumber, email),
          enrollmentId: primary.enrollmentId,
          isLeader: primary.isStudentLeader,
          sectionName: primary.section.label,
          adviserName: primary.adviserName,
          adviserEmail: primary.adviserEmail,
          termEndDate: primary.termEndDate,
          requiredHours: primary.section.required_hour_total ?? 60,
          classmateCount,
          classmateInitials,
          programName: primary.programName,
          classificationName: primary.classificationName,
          nstpType: extractNstpType(primary.section.course_code),
          siteLocation: primary.siteLocation,
        },
      }
    }

    const { data: sessions } = await service
      .from("attendance_session")
      .select("started_at, duration_minute")
      .eq("enrollment_id", primary.enrollmentId)
      .in(
        "attendance_session_status_id",
        countedStatuses.map((s) => s.attendance_session_status_id)
      )

    let totalMinutes = 0
    const daysByMonth: Record<number, Set<number>> = {}
    const minutesByMonthDay: Record<number, Record<number, number>> = {}

    for (const s of sessions ?? []) {
      const dur = s.duration_minute ?? 0
      totalMinutes += dur

      const md = manilaMonthDay(s.started_at)
      if (!md) continue
      const { month, day } = md

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
        isLeader: primary.isStudentLeader,
        fullName,
        studentNumber,
        email,
        sectionName: primary.section.label,
        adviserName: primary.adviserName,
        adviserEmail: primary.adviserEmail,
        termEndDate: primary.termEndDate,
        requiredHours: primary.section.required_hour_total ?? 60,
        hoursRendered: Math.floor(totalMinutes / 60),
        renderedDaysByMonth,
        renderedTimeByMonth,
        classmateCount,
        classmateInitials,
        programName: primary.programName,
        classificationName: primary.classificationName,
        nstpType: extractNstpType(primary.section.course_code),
        siteLocation: primary.siteLocation,
      },
    }
  } catch (err) {
    console.error("[getStudentDashboard] failed", err)
    return { ok: false, error: "Failed to load dashboard. Please try again." }
  }
}
