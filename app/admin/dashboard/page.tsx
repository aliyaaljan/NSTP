import {
  FONT_BODY,
  PAGE_TITLE,
  PROFILE_PILL,
  TYPE,
} from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import DashboardFilters from "@/components/shared/DashboardFilters"
import DashboardExportButton from "@/components/admin/DashboardExportButton"
import AdminCalendar from "@/components/admin/AdminCalendar"
import AdminAttendanceStrip from "@/components/admin/AdminAttendanceStrip"
import SectionProgressPanel from "@/components/admin/SectionProgressPanel"
import RemainingDaysChart from "@/components/admin/RemainingDaysChart"
import CompletionDonutChart from "@/components/admin/CompletionDonutChart"
import { lookupId } from "@/lib/lookups"
import {
  ChartStyles,
  KpiStatCard,
  KpiStatCardGrid,
  type KpiStatCardProps,
} from "@/components/shared/ChartModule"
import {
  AUDIT_LOG_SELECT,
  mapAuditLogDbRow,
  formatAuditLogTimestamp,
} from "@/lib/admin/audit-log"

export const revalidate = 0

// ── Data contracts ────────────────────────────────────────────────────────

interface DeltaStat {
  value: number
  deltaPct: number
  deltaLabel: string
}

interface CompletionStat {
  value: number
  target: number
  completionPct: number
}

interface SimpleStat {
  value: number
  note: string
}

interface PctStat {
  value: number
  pctOfCohort: number
}

export interface DashboardStats {
  totalStudents: DeltaStat
  totalAdvisers: SimpleStat
  avgHoursRendered: CompletionStat
  avgAttendanceRate: SimpleStat
  atRiskStudents: PctStat
  filesSubmitted: SimpleStat
  editRequests: SimpleStat
  gpsCompliance: SimpleStat
}

export interface SectionProgress {
  id: string
  section: string
  pct: number
}

export interface CompletionStatus {
  onTrackPct: number
  inProgressPct: number
  atRiskPct: number
}

export interface AtRiskStudentRow {
  name: string
  sectionInfo: string
  completionPct: number
}

export interface AdviserWorkloadRow {
  name: string
  section: string
  studentCount: number
}

export interface RecentActivityItem {
  title: string
  actor: string
  timeAgo: string
}

export interface CurrentUser {
  name: string
  role: string
  avatarUrl?: string
}

// ── Small presentational components ───────────────────────────────────────────

function Badge({
  text,
  bg,
  color,
}: {
  text: string
  bg: string
  color: string
}) {
  return (
    <span
      style={{
        ...TYPE.body,
        fontWeight: 500,
        color,
        background: bg,
        borderRadius: 8,
        padding: "4px 13px",
        minWidth: 44,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  )
}

function ListCard({
  title,
  rightLabel,
  colLeft,
  colRight,
  children,
}: {
  title: string
  rightLabel?: string
  colLeft: string
  colRight: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        padding: "18px 20px",
        boxShadow: COLORS.cardShadow,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <div style={{ ...TYPE.h2, color: COLORS.textDark }}>{title}</div>
        {rightLabel && (
          <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
            {rightLabel}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...TYPE.body,
          color: COLORS.textDark,
          padding: "0 12px 8px",
          borderBottom: `1px solid ${COLORS.border}`,
          marginBottom: 4,
        }}
      >
        <span>{colLeft}</span>
        <span>{colRight}</span>
      </div>

      <div
        className="nstp-scroll"
        style={{
          overflowY: "auto",
          maxHeight: 270,
          marginRight: -10,
          paddingRight: 12,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ListRow({
  title,
  subtitle,
  isLast,
  leftSlot,
  rightSlot,
}: {
  title: string
  subtitle: string
  isLast: boolean
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "13px 10px 13px 12px",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.border}`,
        gap: 12,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}
      >
        {leftSlot && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            {leftSlot}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
            {title}
          </div>
          <div
            style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}
          >
            {subtitle}
          </div>
        </div>
      </div>
      {rightSlot && <div style={{ flexShrink: 0 }}>{rightSlot}</div>}
    </div>
  )
}

function ProfilePill({ user }: { user: CurrentUser }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: PROFILE_PILL.gap,
        background: COLORS.maroon,
        borderRadius: PROFILE_PILL.borderRadius,
        padding: PROFILE_PILL.padding,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: PROFILE_PILL.avatarSize,
          height: PROFILE_PILL.avatarSize,
          borderRadius: "50%",
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : "rgba(255,255,255,0.2)",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div
          style={{ ...PROFILE_PILL.name, fontFamily: FONT_BODY, color: "#fff" }}
        >
          {user.name}
        </div>
        <div
          style={{
            ...PROFILE_PILL.role,
            fontFamily: FONT_BODY,
            color: "#fff",
            marginTop: 1,
          }}
        >
          {user.role}
        </div>
      </div>
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const resolvedParams = await searchParams
  const currentFilter = resolvedParams.filter || ""

  // for filtering either by section or by adviser
  let selectedSection = ""
  let selectedAdviser = ""

  if (currentFilter.startsWith("section:")) {
    selectedSection = currentFilter.replace("section:", "")
  } else if (currentFilter.startsWith("adviser:")) {
    selectedAdviser = currentFilter.replace("adviser:", "")
  }
  const supabase = await createSupabaseServerClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStartISO = todayStart.toISOString()
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowStartISO = tomorrowStart.toISOString()

  const today = new Date()
  const dayOfWeek = today.getDay()
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayThisWeek = new Date(
    today.setDate(today.getDate() + distanceToMonday)
  )
  mondayThisWeek.setHours(0, 0, 0, 0)
  const mondayISO = mondayThisWeek.toISOString()

  // Resolve lookup IDs concurrently (distinct tables → parallel on a cold cache)
  const [
    studentRoleId,
    adviserRoleId,
    activeStatusId,
    openStatusId,
    underReviewStatusId,
    timeInTypeId,
  ] = await Promise.all([
    lookupId("role", "student"),
    lookupId("role", "adviser"),
    lookupId("enrollment_status", "active"),
    lookupId("appeal_status", "open"),
    lookupId("appeal_status", "under_review"),
    lookupId("attendance_event_type", "time_in"),
  ])

  const filteredAdviserRes = selectedAdviser
    ? await supabase
        .from("app_user")
        .select("app_user_id")
        .eq("full_name", selectedAdviser)
        .maybeSingle()
    : null
  const filteredAdviserId = filteredAdviserRes?.data?.app_user_id

  // --- dynamic select strings for inner join ---
  const studentCountSelect =
    selectedSection || selectedAdviser
      ? "app_user_id, enrollment!inner(section!inner(name, app_user!section_adviser_user_id_fkey!inner(full_name)))"
      : "app_user_id, enrollment(enrollment_status_id)"

  const adviserCountSelect = selectedSection
    ? "app_user_id, section!inner(name)"
    : "app_user_id"

  const activeCountSelect =
    selectedSection || selectedAdviser
      ? "student_user_id, section!inner(name, app_user!section_adviser_user_id_fkey!inner(full_name))"
      : "student_user_id"

  const timeInLogsSelect =
    selectedSection || selectedAdviser
      ? "enrollment_id, enrollment!inner(enrollment_status_id, section!inner(name, app_user!section_adviser_user_id_fkey!inner(full_name)))"
      : "enrollment_id, enrollment!inner(section_id, enrollment_status_id)"

  const filesSelect =
    selectedSection || selectedAdviser
      ? "form_id, section!inner(name, app_user!section_adviser_user_id_fkey!inner(full_name))"
      : "form_id"

  const appealsSelect =
    selectedSection || selectedAdviser
      ? "appeal_id, enrollment!inner(section!inner(name, app_user!section_adviser_user_id_fkey!inner(full_name)))"
      : "appeal_id, enrollment!inner(section_id)"

  const workloadSelect = selectedSection
    ? `
          full_name,
          section!section_adviser_user_id_fkey!inner(
            name,
            enrollment(
              enrollment_id,
              enrollment_status_id
            )
          )
        `
    : `
          full_name,
          section!section_adviser_user_id_fkey(
            name,
            enrollment(
              enrollment_id,
              enrollment_status_id
            )
          )
        `

  const enrollmentSelect =
    selectedSection || selectedAdviser
      ? `student_user_id, app_user(full_name, student_number), section!inner(section_id, name, required_hour_total, app_user!inner(full_name)), attendance_session(duration_minute)`
      : `student_user_id, app_user(full_name, student_number), section(section_id, name, required_hour_total, app_user(full_name)),attendance_session!attendance_session_enrollment_id_fkey(duration_minute)`

  // ---  Base Queries ---
  let studentsQuery = supabase
    .from("app_user")
    .select(studentCountSelect, { count: "exact", head: true })
    .eq("role_id", studentRoleId)
    .eq("enrollment.enrollment_status_id", activeStatusId)

  let advisersQuery = supabase
    .from("app_user")
    .select(adviserCountSelect, { count: "exact", head: true })
    .eq("role_id", adviserRoleId)

  let weeklyActiveCountQuery = supabase
    .from("enrollment")
    .select(activeCountSelect, { count: "exact", head: true })
    .eq("enrollment_status_id", activeStatusId)

  let weeklyTimeInLogsQuery = supabase
    .from("attendance_event")
    .select(timeInLogsSelect)
    .eq("attendance_event_type_id", timeInTypeId)
    .eq("enrollment.enrollment_status_id", activeStatusId)
    .gte("effective_at", mondayISO)

  let todayTimeInLogsQuery = supabase
    .from("attendance_event")
    .select(timeInLogsSelect)
    .eq("attendance_event_type_id", timeInTypeId)
    .eq("enrollment.enrollment_status_id", activeStatusId)
    .gte("effective_at", todayStartISO)
    .lt("effective_at", tomorrowStartISO)

  let filesQuery = supabase
    .from("form")
    .select(filesSelect, { count: "exact", head: true })
    .eq("is_active", true)
    .not("section_id", "is", null)

  let appealsQuery = supabase
    .from("appeal")
    .select(appealsSelect, { count: "exact", head: true })
    .in("appeal_status_id", [openStatusId, underReviewStatusId])

  let adviserWorkloadQuery = supabase
    .from("app_user")
    .select(workloadSelect)
    .eq("role_id", adviserRoleId)

  let enrollmentQuery = supabase
    .from("enrollment")
    .select(enrollmentSelect)
    .eq("enrollment_status_id", activeStatusId)

  // ---  Conditional Filters ---

  if (selectedSection) {
    studentsQuery = studentsQuery.eq("enrollment.section.name", selectedSection)
    advisersQuery = advisersQuery.eq("section.name", selectedSection)
    weeklyActiveCountQuery = weeklyActiveCountQuery.eq(
      "section.name",
      selectedSection
    )
    weeklyTimeInLogsQuery = weeklyTimeInLogsQuery.eq(
      "enrollment.section.name",
      selectedSection
    )
    todayTimeInLogsQuery = todayTimeInLogsQuery.eq(
      "enrollment.section.name",
      selectedSection
    )
    filesQuery = filesQuery.eq("section.name", selectedSection)
    appealsQuery = appealsQuery.eq("enrollment.section.name", selectedSection)
    adviserWorkloadQuery = adviserWorkloadQuery.eq(
      "section.name",
      selectedSection
    )
    enrollmentQuery = enrollmentQuery.eq("section.name", selectedSection)
  }

  if (selectedAdviser && filteredAdviserId) {
    studentsQuery = studentsQuery.eq(
      "enrollment.section.adviser_user_id",
      filteredAdviserId
    )
    advisersQuery = advisersQuery.eq("app_user_id", filteredAdviserId)
    weeklyActiveCountQuery = weeklyActiveCountQuery.eq(
      "section.adviser_user_id",
      filteredAdviserId
    )
    weeklyTimeInLogsQuery = weeklyTimeInLogsQuery.eq(
      "enrollment.section.adviser_user_id",
      filteredAdviserId
    )
    todayTimeInLogsQuery = todayTimeInLogsQuery.eq(
      "enrollment.section.adviser_user_id",
      filteredAdviserId
    )
    filesQuery = filesQuery.eq("section.adviser_user_id", filteredAdviserId)
    appealsQuery = appealsQuery.eq(
      "enrollment.section.adviser_user_id",
      filteredAdviserId
    )
    adviserWorkloadQuery = adviserWorkloadQuery.eq(
      "app_user_id",
      filteredAdviserId
    )
    enrollmentQuery = enrollmentQuery.eq(
      "section.adviser_user_id",
      filteredAdviserId
    )
  }

  // MAIN PARALLEL FETCHING QUERY BLOCK
  const [
    studentsRes,
    advisersRes,
    filesRes,
    appealsRes,
    attendanceRateRes,
    enrollmentsRes,
    adviserWorkloadRes,
    sectionsFilterRes,
    advisersFilterRes,
    recentActivityRes,
    activeTermRes,
    appealStatusesRes,
    enrollmentStatusesRes,
  ] = await Promise.all([
    // student counter call
    studentsQuery,
    // adviser/facilitator count call
    advisersQuery,
    // files submitted query call
    filesQuery,
    // appeals query call
    appealsQuery,
    //attendance rate query call
    Promise.all([
      weeklyActiveCountQuery,
      weeklyTimeInLogsQuery,
      todayTimeInLogsQuery,
    ]),
    //enrollment query call
    enrollmentQuery,
    // adviser workload query call
    adviserWorkloadQuery,
    //Filter Dropdown for section list lookup
    supabase.from("section").select("section_id, name").order("name"),
    // Filter dropdown for advisers list lookup
    supabase
      .from("app_user")
      .select("full_name")
      .eq("role_id", adviserRoleId)
      .order("full_name"),
    // recent activity for audit log
    supabase
      .from("audit_log_readable")
      .select(AUDIT_LOG_SELECT)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("term")
      .select("start_date, end_date")
      .eq("is_active", true)
      .maybeSingle(),
    // FETCH LOOKUP KEYS DYNAMICALLY
    supabase.from("appeal_status").select("appeal_status_id, name"),
    supabase.from("enrollment_status").select("enrollment_status_id, name"),
  ])

  const availableSections = sectionsFilterRes.data?.map((s) => s.name) || []

  const exportSections =
    sectionsFilterRes.data?.map((s) => ({
      sectionId: s.section_id,
      name: s.name,
    })) || []

  const availableAdvisers =
    advisersFilterRes.data?.map((a) => a.full_name) || []

  // ── SERVER-SIDE CALCULATIONS & PROCESSING ───────────────────────────────

  // calculating weekly attendance rate
  const totalActiveEnrollments = attendanceRateRes[0]?.count || 0
  const uniqueScansThisWeek = new Set(
    attendanceRateRes[1]?.data?.map((e: any) => e.enrollment_id)
  ).size
  const presentToday = new Set(
    attendanceRateRes[2]?.data?.map((e: any) => e.enrollment_id)
  ).size
  const computedAttendanceRate =
    totalActiveEnrollments > 0
      ? Math.round((uniqueScansThisWeek / totalActiveEnrollments) * 100)
      : 0

  const totalToday = totalActiveEnrollments
  const notYetToday = 0
  const absentToday = Math.max(0, totalToday - presentToday - notYetToday)
  const todayAttendance = {
    present: presentToday,
    absent: absentToday,
    notYet: notYetToday,
    total: totalToday,
    presentPct:
      totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0,
  }

  // processing enrollment data

  const rawEnrollments = enrollmentsRes.data || []
  const sectionAggregationMap: Record<
    string,
    {
      name: string
      totalHoursCompleted: number
      totalHoursRequired: number
      studentCount: number
    }
  > = {}

  let onTrackCount = 0
  let inProgressCount = 0
  let atRiskCount = 0

  let totalMinutesRendered = 0

  const processedAtRiskList: AtRiskStudentRow[] = []

  rawEnrollments.forEach((en: any) => {
    const sectionData = en.section
    if (!sectionData) return

    const sectionId = sectionData.section_id
    const targetHours = sectionData.required_hour_total || 60
    const studentMinutes =
      en.attendance_session?.reduce(
        (sum: number, s: any) => sum + (s.duration_minute || 0),
        0
      ) || 0

    const studentHours = studentMinutes / 60

    totalMinutesRendered += studentMinutes

    const studentCompletionPct = Math.round((studentHours / targetHours) * 100)

    if (studentCompletionPct >= 60) onTrackCount++
    else if (studentCompletionPct >= 45) inProgressCount++
    else {
      atRiskCount++

      let refinedSubtitle = `Section ${sectionData.name} under ${
        sectionData.app_user?.full_name || "No Adviser"
      }`
      if (selectedAdviser) {
        refinedSubtitle = `Section ${sectionData.name}`
      } else if (selectedSection) {
        refinedSubtitle = `Assigned to: ${
          sectionData.app_user?.full_name || "Unassigned"
        }`
      }

      processedAtRiskList.push({
        name: en.app_user?.full_name || "Unknown Identity",
        sectionInfo: refinedSubtitle,
        completionPct: Math.min(100, studentCompletionPct),
      })
    }

    // metrics for completion rows
    if (!sectionAggregationMap[sectionId]) {
      sectionAggregationMap[sectionId] = {
        name: sectionData.name,
        totalHoursCompleted: 0,
        totalHoursRequired: 0,
        studentCount: 0,
      }
    }
    sectionAggregationMap[sectionId].totalHoursCompleted += studentHours
    sectionAggregationMap[sectionId].totalHoursRequired += targetHours
    sectionAggregationMap[sectionId].studentCount++
  })

  const totalStudentsCount = studentsRes.count || 0
  const activeStudentsDivisor = rawEnrollments.length || 1
  const calculatedAvgHours = Math.round(
    totalMinutesRendered / 60 / activeStudentsDivisor
  )

  //  section progress layout sorting (alphabetical)
  let processedSectionProgress: SectionProgress[] = []
  if (selectedSection || selectedAdviser) {
    // iff a filter is applied, convert rows to individual student bars instead of single section groupings
    processedSectionProgress = rawEnrollments
      .map((en: any) => {
        const targetHours = en.section?.required_hour_total || 60
        const studentMinutes =
          en.attendance_session?.reduce(
            (sum: number, s: any) => sum + (s.duration_minute || 0),
            0
          ) || 0
        const studentHours = studentMinutes / 60
        return {
          id: en.student_user_id,
          section: en.app_user?.full_name || "Unknown Student",
          pct: Math.min(100, Math.round((studentHours / targetHours) * 100)),
        }
      })
      .sort((a, b) => b.pct - a.pct)
  } else {
    processedSectionProgress = Object.values(sectionAggregationMap)
      .map((sect: any) => ({
        id: sect.name,
        section: sect.name,
        pct:
          sect.studentCount > 0
            ? Math.min(
                100,
                Math.round(
                  (sect.totalHoursCompleted / sect.totalHoursRequired) * 100
                )
              )
            : 0,
      }))
      .sort((a, b) => a.section.localeCompare(b.section))
  }
  //
  const absoluteCohortCount = rawEnrollments.length || 1
  const processedCompletionStatus: CompletionStatus = {
    onTrackPct: Math.round((onTrackCount / absoluteCohortCount) * 100),
    inProgressPct: Math.round((inProgressCount / absoluteCohortCount) * 100),
    atRiskPct: Math.round((atRiskCount / absoluteCohortCount) * 100),
  }

  // adviser workload list (descending)
  const rawAdvisers = adviserWorkloadRes.data || []
  const processedAdviserWorkload: AdviserWorkloadRow[] = rawAdvisers
    .map((adv: any) => {
      const sectionRosters = adv.section || []
      const totalStudentsCount = sectionRosters.reduce(
        (sum: number, section: any) => {
          const activeStudents =
            section.enrollment?.filter(
              (e: any) => e.enrollment_status_id === activeStatusId
            ) || []
          return sum + activeStudents.length
        },
        0
      )
      const primarySectionLabel = sectionRosters[0]?.name
        ? `Section ${sectionRosters[0].name}`
        : "Floating"
      return {
        name: adv.full_name,
        section: primarySectionLabel,
        studentCount: totalStudentsCount,
      }
    })
    // remove inactive advisers (0 students)
    .filter((adviser) =>
      selectedSection || selectedAdviser ? adviser.studentCount > 0 : true
    )
    .sort((a, b) => b.studentCount - a.studentCount)

  // dunamic layout key dictionary
  const dashboardUuidMap: Record<string, string> = {}
  appealStatusesRes.data?.forEach((status) => {
    dashboardUuidMap[status.appeal_status_id] = status.name.replace(/_/g, " ")
  })
  enrollmentStatusesRes.data?.forEach((status) => {
    dashboardUuidMap[status.enrollment_status_id] = status.name
  })
  // FORMAT FOR LOGGED RECENT ACTIVITIES
  const rawActivities = recentActivityRes.data || []

  const processedRecentActivity: RecentActivityItem[] = rawActivities

    .map((dbRow: any) => mapAuditLogDbRow(dbRow, dashboardUuidMap))
    .filter((mapped): mapped is NonNullable<typeof mapped> => mapped !== null)
    .map((activity) => {
      return {
        title: activity.summary,
        actor: `Executed by: ${activity.actorName}`,
        timeAgo: formatAuditLogTimestamp(activity.createdAt),
      }
    })

  const nstpTermStart = activeTermRes.data?.start_date ?? "2025-08-11"
  const nstpCompletionDeadline = "2026-07-17"

  const currentSemesterMeta = {
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }
  const currentUserMeta: CurrentUser = {
    name: "Admin Test Account",
    role: "NSTP Admin",
  }

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-users",
      label: "Active Students",
      value: rawEnrollments.length,
      badge: { text: `↑ 4%`, bg: COLORS.greenBgLight, color: COLORS.green },
      note: "v.s. last sem",
    },
    {
      icon: "ti-user-check",
      label: "Total Advisers",
      value: advisersRes.count || 0,
      note: `avg ${(totalStudentsCount / (advisersRes.count || 1)).toFixed(
        0
      )} students each`,
    },
    {
      icon: "ti-clock",
      label: "Average hours rendered",
      value: calculatedAvgHours,
      valueSuffix: `/60`,
      badge: {
        text: `${Math.min(100, Math.round((calculatedAvgHours / 60) * 100))}%`,
        bg: COLORS.amberBgLight,
        color: COLORS.amber,
      },
      note: "completion",
    },
    {
      icon: "ti-clock-check",
      label: "Average attendance rate",
      value: `${computedAttendanceRate}%`,
      note: "this week",
    },
    {
      icon: "ti-alert-triangle",
      label: "At-risk Students",
      value: atRiskCount,
      valueColor: COLORS.maroonDark,
      badge: {
        text: `${processedCompletionStatus.atRiskPct}%`,
        bg: COLORS.maroonDarkBgLight,
        color: COLORS.maroonDark,
      },
      note: "of total active students",
    },
    {
      icon: "ti-clipboard-list",
      label: "Files submitted",
      value: filesRes.count || 0,
      note: "throughout the semester",
    },
    {
      icon: "ti-pencil",
      label: "Edit Requests",
      value: appealsRes.count || 0,
      note: "pending review",
    },
    {
      icon: "ti-map-pin",
      label: "GPS compliance",
      value: `94%`,
      note: "Logged within radius",
    },
  ]

  return (
    <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: COLORS.text }}>
      <style>{`
        .nstp-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .nstp-scroll::-webkit-scrollbar { width: 5px; }
        .nstp-scroll::-webkit-scrollbar-track { background: transparent; margin: 2px 0; }
        .nstp-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; min-height: 32px; }
        .nstp-scroll::-webkit-scrollbar-thumb:hover { background: #BDBDB8; }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <div>
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>
            Dashboard
          </h1>
          <p
            style={{
              ...TYPE.caption,
              color: COLORS.textGray,
              margin: "6px 0 0",
            }}
          >
            Academic Year {currentSemesterMeta.academicYear} |{" "}
            {currentSemesterMeta.semester}
          </p>
        </div>

        <ProfilePill user={currentUserMeta} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <DashboardFilters
          currentFilter={currentFilter}
          sections={availableSections}
          advisers={availableAdvisers}
        />
        <DashboardExportButton sections={exportSections} />
      </div>

      <ChartStyles />
      <KpiStatCardGrid columns={4}>
        {statCards.map((card, i) => (
          <KpiStatCard key={i} {...card} />
        ))}
      </KpiStatCardGrid>

      {/* Section progress progressbars bars panel + Completion donut */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: COLORS.radius,
            padding: "18px 20px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          <div style={{ ...TYPE.h2, color: COLORS.textDark, marginBottom: 20 }}>
            {selectedSection
              ? `Student progress within Section ${selectedSection}`
              : selectedAdviser
              ? `Student progress under ${selectedAdviser}`
              : "Hours completion by section"}
          </div>
          <SectionProgressPanel
            rows={processedSectionProgress}
            rowLabel={
              selectedSection || selectedAdviser ? "students" : "sections"
            }
          />
        </div>

        <div
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: COLORS.radius,
            padding: "18px 20px",
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ ...TYPE.h2, color: COLORS.textDark }}>Calendar</div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.8px",
                color: COLORS.textGray,
                whiteSpace: "nowrap",
              }}
            >
              TODAY ·{" "}
              {new Date()
                .toLocaleDateString("en-US", { month: "short", day: "numeric" })
                .toUpperCase()}
            </div>
          </div>
          <RemainingDaysChart
            endDate={nstpCompletionDeadline}
            startDate={nstpTermStart}
          />
          <AdminCalendar />
          <AdminAttendanceStrip data={todayAttendance} />
        </div>
      </div>

      {/* Completion status, at-risk, and adviser workload — 3 columns; recent activity full width below */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: COLORS.radius,
            padding: "18px 20px",
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            minHeight: "100%",
          }}
        >
          <div style={{ ...TYPE.h2, color: COLORS.textDark, marginBottom: 18 }}>
            Completion Status
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 0",
            }}
          >
            <CompletionDonutChart data={processedCompletionStatus} />
          </div>
        </div>

        <ListCard
          title="At risk students"
          colLeft="Student"
          colRight="Completion"
        >
          {processedAtRiskList.length === 0 ? (
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No students are currently flagged as at-risk
            </div>
          ) : (
            processedAtRiskList.map((s, i) => (
              <ListRow
                key={i}
                title={s.name}
                subtitle={s.sectionInfo}
                isLast={i === processedAtRiskList.length - 1}
                rightSlot={
                  <Badge
                    text={`${s.completionPct}%`}
                    bg={COLORS.maroonDarkBgLight}
                    color={COLORS.maroonDark}
                  />
                }
              />
            ))
          )}
        </ListCard>

        <ListCard
          title="Adviser Workload"
          colLeft="Adviser"
          colRight="Students"
        >
          {processedAdviserWorkload.length === 0 ? (
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No adviser workload records mapped
            </div>
          ) : (
            processedAdviserWorkload.map((a, i) => (
              <ListRow
                key={i}
                title={a.name}
                subtitle={a.section}
                isLast={i === processedAdviserWorkload.length - 1}
                rightSlot={
                  <Badge
                    text={`${a.studentCount} students`}
                    bg={COLORS.border}
                    color={COLORS.textGray}
                  />
                }
              />
            ))
          )}
        </ListCard>

        <div style={{ gridColumn: "1 / -1" }}>
          <ListCard title="Recent Activity" colLeft="Activity" colRight="">
            {processedRecentActivity.length === 0 ? (
              <div
                style={{
                  ...TYPE.caption,
                  color: COLORS.textGray,
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                No recent audit activity found
              </div>
            ) : (
              processedRecentActivity.map((a, i) => (
                <ListRow
                  key={i}
                  title={a.title}
                  subtitle={`${a.actor} | ${a.timeAgo}`}
                  isLast={i === processedRecentActivity.length - 1}
                  leftSlot={
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: `2px solid ${COLORS.maroon}`,
                        background: "#fff",
                        display: "block",
                      }}
                    />
                  }
                />
              ))
            )}
          </ListCard>
        </div>
      </div>
    </div>
  )
}
