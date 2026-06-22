import { Montserrat } from "next/font/google"
import { FONT_BODY, FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import DashboardFilters from "@/components/shared/DashboardFilters"
import { DATABASE_IDS } from "@/lib/constants"

export const revalidate = 0

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  cardBg: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  border: "#ECECEA",
  track: "#E3E3E1",

  green: "#2D6A4F",
  greenBgLight: "#DFEEE6",

  maroon: "#7B1113",
  maroonBgLight: "#F6DEE1",

  maroonDark: "#5C0B18",
  maroonDarkBgLight: "#EAD9DB",

  amber: "#B5451B",
  amberBgLight: "#FBEFDA",

  iconBg: "#F8DCDD",
}

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

function StatCard({
  icon,
  label,
  value,
  valueSuffix,
  valueColor,
  badge,
  note,
}: {
  icon: string
  label: string
  value: string | number
  valueSuffix?: string
  valueColor?: string
  badge?: { text: string; bg: string; color: string }
  note: string
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        borderRadius: 14,
        padding: "20px 22px",
        boxShadow: COLORS.cardShadow,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: COLORS.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i
          className={`ti ${icon}`}
          style={{ fontSize: 19, color: COLORS.maroon }}
        />
      </div>

      <div style={{ ...TYPE.body, color: COLORS.textGray }}>{label}</div>

      <div
        style={{
          ...TYPE.bodyBold,
          color: valueColor ?? COLORS.textDark,
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        {value}
        {valueSuffix && (
          <span style={{ ...TYPE.body, color: COLORS.textGray }}>
            {valueSuffix}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {badge && (
          <span
            style={{
              ...TYPE.bodyBold,
              color: badge.color,
              background: badge.bg,
              borderRadius: 12,
              padding: "3px 10px",
            }}
          >
            {badge.text}
          </span>
        )}
        <span style={{ ...TYPE.caption, color: COLORS.textGray }}>{note}</span>
      </div>
    </div>
  )
}

function progressColor(pct: number) {
  if (pct >= 70) return COLORS.green
  if (pct >= 50) return COLORS.maroon
  return COLORS.maroonDark
}

const SECTION_PROGRESS_GRID = {
  display: "grid",
  gridTemplateColumns: "150px 1fr auto",
  columnGap: 14,
  alignItems: "center",
} as const

function SectionProgressHeader() {
  return (
    <div style={{ ...SECTION_PROGRESS_GRID, marginBottom: 10 }}>
      <span style={{ ...TYPE.body, color: COLORS.textDark }}>Section</span>
      <span />
      <span
        style={{ ...TYPE.body, color: COLORS.textDark, textAlign: "right" }}
      >
        Progress
      </span>
    </div>
  )
}

function SectionProgressRow({ section, pct }: SectionProgress) {
  return (
    <div style={SECTION_PROGRESS_GRID}>
      <div style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>{section}</div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: COLORS.track,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: progressColor(pct),
          }}
        />
      </div>
      <div
        style={{
          ...TYPE.bodyBold,
          color: COLORS.textGray,
          textAlign: "right",
          paddingLeft: 12,
        }}
      >
        {pct}%
      </div>
    </div>
  )
}

function CompletionDonut({ data }: { data: CompletionStatus }) {
  const size = 160
  const strokeWidth = 24
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r

  const segments = [
    { pct: data.onTrackPct, color: COLORS.green },
    { pct: data.inProgressPct, color: COLORS.maroon },
    { pct: data.atRiskPct, color: COLORS.maroonDark },
  ]

  let offsetAcc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={COLORS.track}
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offsetAcc}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        )
        offsetAcc += dash
        return el
      })}
    </svg>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ ...TYPE.body, color: COLORS.textDark }}>{label}</span>
    </div>
  )
}

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
        ...TYPE.bodyBold,
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
        borderRadius: 14,
        padding: "20px 22px",
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
        gap: 12,
        background: COLORS.maroon,
        borderRadius: 40,
        padding: "8px 22px 8px 10px",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : "#D8D8D5",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...TYPE.bodyBold, color: "#fff" }}>{user.name}</div>
        <div
          style={{
            ...TYPE.caption,
            color: "rgba(255,255,255,0.75)",
            fontStyle: "normal",
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

  const today = new Date()
  const dayOfWeek = today.getDay()
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayThisWeek = new Date(
    today.setDate(today.getDate() + distanceToMonday)
  )
  mondayThisWeek.setHours(0, 0, 0, 0)
  const mondayISO = mondayThisWeek.toISOString()

  // fetch lookup IDs from constants.ts
  const studentRoleId = DATABASE_IDS.roles.student
  const adviserRoleId = DATABASE_IDS.roles.adviser
  const activeStatusId = DATABASE_IDS.enrollmentStatuses.active
  const openStatusId = DATABASE_IDS.appealStatuses.open
  const underReviewStatusId = DATABASE_IDS.appealStatuses.underReview
  const timeInTypeId = DATABASE_IDS.attendanceEventTypes.timeIn

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
    //  recentActivityRes,
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
    Promise.all([weeklyActiveCountQuery, weeklyTimeInLogsQuery]),
    //enrollment query call
    enrollmentQuery,
    // adviser workload query call
    adviserWorkloadQuery,
    //Filter Dropdown for section list lookup
    supabase.from("section").select("name").order("name"),
    // Filter dropdown for advisers list lookup
    supabase
      .from("app_user")
      .select("full_name")
      .eq("role_id", adviserRoleId)
      .order("full_name"),
    // recent activity
    supabase
      .from("audit_log")
      .select(
        "activity_type, description, created_at, app_user:user_id(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const availableSections = sectionsFilterRes.data?.map((s) => s.name) || []

  const availableAdvisers =
    advisersFilterRes.data?.map((a) => a.full_name) || []

  // ── SERVER-SIDE CALCULATIONS & PROCESSING ───────────────────────────────

  // calculating weekly attendance rate
  const totalActiveEnrollments = attendanceRateRes[0]?.count || 0
  const uniqueScansThisWeek = new Set(
    attendanceRateRes[1]?.data?.map((e: any) => e.enrollment_id)
  ).size
  const computedAttendanceRate =
    totalActiveEnrollments > 0
      ? Math.round((uniqueScansThisWeek / totalActiveEnrollments) * 100)
      : 0

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

  // FORMAT FOR LOGGED RECENT ACTIVITIES
  const rawActivities = recentActivityRes.data || []
  const processedRecentActivity: RecentActivityItem[] = rawActivities.map(
    (act: any) => {
      const actorName = act.app_user?.full_name || "System Automated"
      const recordTime = new Date(act.created_at)
      const minutesDelta = Math.floor(
        (new Date().getTime() - recordTime.getTime()) / 60000 // convert to minutes
      )

      // compute relative time badges
      let timeLabel = "Just now"
      if (minutesDelta >= 1440) {
        timeLabel = recordTime.toLocaleDateString()
      } else if (minutesDelta >= 60) {
        timeLabel = `${Math.floor(minutesDelta / 60)} hrs ago`
      } else if (minutesDelta > 0) {
        timeLabel = `${minutesDelta} mins. ago`
      }
      // formatting actions
      let actionLabel = "Modified"
      if (act.action === "INSERT") actionLabel = "Created new"
      if (act.action === "DELETE") actionLabel = "Removed a"
      // format table contexts
      let contextLabel = act.table_name
      if (act.table_name === "attendance_session")
        contextLabel = "attendance record"
      if (act.table_name === "appeal") contextLabel = "edit request/appeal"
      if (act.table_name === "form") contextLabel = "document file submission"
      if (act.table_name === "enrollment") contextLabel = "student entry"

      return {
        title: `${actionLabel} ${contextLabel}`,
        actor: `Executed by: ${actorName}`,
        timeAgo: timeLabel,
      }
    }
  )

  const currentSemesterMeta = {
    academicYear: "2025-2026",
    semester: "2nd Semester",
  }
  const currentUserMeta: CurrentUser = {
    name: "Admin Manager",
    role: "NSTP Admin",
  }

  const statCards: Array<React.ComponentProps<typeof StatCard>> = [
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
    <div className={montserrat.variable} style={{ fontFamily: FONT_BODY }}>
      <style>{`
        .nstp-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .nstp-scroll::-webkit-scrollbar { width: 5px; }
        .nstp-scroll::-webkit-scrollbar-track { background: transparent; margin: 2px 0; }
        .nstp-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; min-height: 32px; }
        .nstp-scroll::-webkit-scrollbar-thumb:hover { background: #BDBDB8; }
      `}</style>

      {/* Profile pill */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 22,
        }}
      >
        <ProfilePill user={currentUserMeta} />
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ ...TYPE.h1, color: COLORS.textDark, margin: 0 }}>
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

        <div style={{ display: "flex", gap: 12 }}>
          <DashboardFilters
            currentFilter={currentFilter}
            sections={availableSections}
            advisers={availableAdvisers}
          />
          <button
            style={{
              ...TYPE.bodyBold,
              fontFamily: FONT_HEADING,
              color: "#fff",
              background: COLORS.maroon,
              border: "none",
              borderRadius: 24,
              padding: "11px 22px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <i className="ti ti-upload" style={{ fontSize: 14 }} />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards grid layout mapping */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

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
            borderRadius: 16,
            padding: "24px 28px",
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
          <SectionProgressHeader />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {processedSectionProgress.map((row, i) => (
              <SectionProgressRow key={i} {...row} />
            ))}
          </div>
        </div>

        <div
          style={{
            background: COLORS.cardBg,
            borderRadius: 14,
            padding: "22px 24px",
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ ...TYPE.h2, color: COLORS.textDark, marginBottom: 18 }}>
            Completion Status
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <CompletionDonut data={processedCompletionStatus} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <LegendDot
              color={COLORS.green}
              label={`On track - ${processedCompletionStatus.onTrackPct}%`}
            />
            <LegendDot
              color={COLORS.maroon}
              label={`In progress - ${processedCompletionStatus.inProgressPct}%`}
            />
            <LegendDot
              color={COLORS.maroonDark}
              label={`At risk - ${processedCompletionStatus.atRiskPct}%`}
            />
          </div>
        </div>
      </div>

      {/* Roster list elements container widgets rows split blocks */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}
      >
        {/* At risk list panels */}
        <ListCard
          title="At risk students"
          rightLabel="Below 45%"
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

        {/* Adviser workload panel */}
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
                    bg={
                      i % 2 === 0 ? COLORS.greenBgLight : COLORS.maroonBgLight
                    }
                    color={i % 2 === 0 ? COLORS.green : COLORS.maroon}
                  />
                }
              />
            ))
          )}
        </ListCard>

        {/* Recent activity trace timeline panel ------------------------*/}

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
  )
}
