import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
import DashboardToolbar from "@/components/admin/DashboardToolbar"
import SectionProgressPanel from "@/components/admin/SectionProgressPanel"
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
import { formatClassLabel, extractNstpType } from "@/lib/shared/class-label"
import { progressStatusFromPct } from "@/lib/admin/student-progress"
import { SEMESTER_LABELS, type TermSemesterCode } from "@/lib/admin/settings"
import { getFacilitatorPool } from "@/lib/admin/facilitator-pool"

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
        {colRight ? (
          <span style={{ minWidth: 72, textAlign: "center", flexShrink: 0 }}>
            {colRight}
          </span>
        ) : null}
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
      {rightSlot && (
        <div style={{ flexShrink: 0, minWidth: 72, textAlign: "center" }}>
          {rightSlot}
        </div>
      )}
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string
    nstp?: string
    adviser?: string
    year?: string
  }>
}) {
  const resolvedParams = await searchParams

  // Independent dimension params (can be combined). Legacy `filter=` still supported.
  let selectedSection = ""
  let selectedAdviser = ""
  let selectedAdviserId = resolvedParams.adviser?.trim() || ""
  let selectedNstpType = resolvedParams.nstp?.trim() || ""
  let selectedSchoolYear = resolvedParams.year?.trim() || ""

  const legacyFilter = resolvedParams.filter || ""
  const hasDimensionParams = Boolean(
    selectedAdviserId || selectedNstpType || selectedSchoolYear
  )
  if (!hasDimensionParams && legacyFilter) {
    if (legacyFilter.startsWith("section:")) {
      selectedSection = legacyFilter.replace("section:", "")
    } else if (legacyFilter.startsWith("adviser:")) {
      selectedAdviser = legacyFilter.replace("adviser:", "")
    } else if (legacyFilter.startsWith("nstp:")) {
      selectedNstpType = legacyFilter.replace("nstp:", "")
    } else if (legacyFilter.startsWith("year:")) {
      selectedSchoolYear = legacyFilter.replace("year:", "")
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    activeStatusId,
    completedStatusId,
    openStatusId,
    underReviewStatusId,
    timeInTypeId,
    facilitatorPool,
  ] = await Promise.all([
    lookupId("role", "student"),
    lookupId("enrollment_status", "active"),
    lookupId("enrollment_status", "completed"),
    lookupId("appeal_status", "pending"),
    lookupId("appeal_status", "under_review"),
    lookupId("attendance_event_type", "time_in"),
    getFacilitatorPool(supabase),
  ])
  const poolIds = facilitatorPool.length
    ? facilitatorPool.map((m) => m.userId)
    : ["00000000-0000-0000-0000-000000000000"]
  const adminFacilitatorIds = new Set(
    facilitatorPool.filter((m) => m.roleCode === "admin").map((m) => m.userId)
  )

  // Resolve Class / Adviser / School Year to ALL matching section IDs (AND across dimensions).
  let selectedSectionIds: string[] = []
  if (
    !selectedSection &&
    (selectedNstpType || selectedSchoolYear || selectedAdviserId)
  ) {
    const { data: earlySections } = await supabase
      .from("section")
      .select(
        "section_id, course_code, adviser_user_id, term:term_id(school_year)"
      )
    const matched =
      (
        earlySections as unknown as
          | {
              section_id: string
              course_code: string
              adviser_user_id: string | null
              term: { school_year: string } | null
            }[]
          | null
      )?.filter((s) => {
        if (
          selectedNstpType &&
          extractNstpType(s.course_code) !== selectedNstpType
        ) {
          return false
        }
        if (selectedSchoolYear && s.term?.school_year !== selectedSchoolYear) {
          return false
        }
        if (selectedAdviserId && s.adviser_user_id !== selectedAdviserId) {
          return false
        }
        return true
      }) ?? []
    selectedSectionIds = matched.map((s) => s.section_id)
  }

  // Dimensions selected but no matching sections → force empty result set.
  if (
    !selectedSection &&
    (selectedNstpType || selectedSchoolYear || selectedAdviserId) &&
    selectedSectionIds.length === 0
  ) {
    selectedSectionIds = ["__none__"]
  }

  // Legacy adviser-by-name lookup when `filter=adviser:Name` is used.
  const filteredAdviserRes =
    !selectedAdviserId && selectedAdviser
      ? await supabase
          .from("app_user")
          .select("app_user_id")
          .eq("full_name", selectedAdviser)
          .maybeSingle()
      : null
  const filteredAdviserId =
    selectedAdviserId || filteredAdviserRes?.data?.app_user_id || ""

  const hasSectionScope = Boolean(
    selectedSection || selectedSectionIds.length > 0
  )
  const hasAdviserScope = Boolean(filteredAdviserId)
  const hasClassScope = hasSectionScope || hasAdviserScope
  // Year / section / combined filters may include closed-out (completed) enrollments.
  const includeCompletedEnrollments = Boolean(
    selectedSchoolYear ||
      selectedSection ||
      selectedSectionIds.length > 0 ||
      selectedNstpType
  )
  const enrollmentStatusIds = includeCompletedEnrollments
    ? [activeStatusId, completedStatusId]
    : [activeStatusId]

  // --- dynamic select strings for inner join ---
  const studentCountSelect = hasClassScope
    ? "app_user_id, enrollment!inner(section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name)))"
    : "app_user_id, enrollment(enrollment_status_id)"

  const adviserCountSelect = hasSectionScope
    ? "app_user_id, section!inner(section_id)"
    : "app_user_id"

  const activeCountSelect = hasClassScope
    ? "student_user_id, section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name))"
    : "student_user_id"

  const timeInLogsSelect = hasClassScope
    ? "enrollment_id, enrollment!inner(enrollment_status_id, section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name)))"
    : "enrollment_id, enrollment!inner(section_id, enrollment_status_id)"

  const filesSelect = hasClassScope
    ? "form_id, section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name))"
    : "form_id"

  const appealsSelect = hasClassScope
    ? "appeal_id, enrollment!inner(section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name)))"
    : "appeal_id, enrollment!inner(section_id)"

  const workloadSelect = hasSectionScope
    ? `
          app_user_id,
          full_name,
          section!section_adviser_user_id_fkey!inner(
            section_id,
            course_code,
            term:term_id(school_year),
            enrollment(
              enrollment_id,
              enrollment_status_id
            )
          )
        `
    : `
          app_user_id,
          full_name,
          section!section_adviser_user_id_fkey(
            section_id,
            course_code,
            term:term_id(school_year),
            enrollment(
              enrollment_id,
              enrollment_status_id
            )
          )
        `

  const enrollmentSelect = hasClassScope
    ? `student_user_id, app_user(full_name, student_number), section!inner(section_id, course_code, required_hour_total, term:term_id(school_year, semester), app_user!inner(full_name)), attendance_session(duration_minute)`
    : `student_user_id, app_user(full_name, student_number), section(section_id, course_code, required_hour_total, term:term_id(school_year, semester), app_user(full_name)),attendance_session!attendance_session_enrollment_id_fkey(duration_minute)`

  const gpsComplianceSelect = hasClassScope
    ? "attendance_session_id, is_flagged, enrollment!inner(enrollment_status_id, section!inner(section_id, app_user!section_adviser_user_id_fkey!inner(full_name)))"
    : "attendance_session_id, is_flagged, enrollment!inner(enrollment_status_id)"

  // ---  Base Queries ---
  let studentsQuery = supabase
    .from("app_user")
    .select(studentCountSelect, { count: "exact", head: true })
    .eq("role_id", studentRoleId)
    .in("enrollment.enrollment_status_id", enrollmentStatusIds)

  let advisersQuery = supabase
    .from("app_user")
    .select(adviserCountSelect, { count: "exact", head: true })
    .in("app_user_id", poolIds)

  let weeklyActiveCountQuery = supabase
    .from("enrollment")
    .select(activeCountSelect, { count: "exact", head: true })
    .in("enrollment_status_id", enrollmentStatusIds)

  let weeklyTimeInLogsQuery = supabase
    .from("attendance_event")
    .select(timeInLogsSelect)
    .eq("attendance_event_type_id", timeInTypeId)
    .in("enrollment.enrollment_status_id", enrollmentStatusIds)
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
    .in("app_user_id", poolIds)

  let enrollmentQuery = supabase
    .from("enrollment")
    .select(enrollmentSelect)
    .in("enrollment_status_id", enrollmentStatusIds)

  let gpsComplianceQuery = supabase
    .from("attendance_session")
    .select(gpsComplianceSelect)
    .in("enrollment.enrollment_status_id", enrollmentStatusIds)
    .gte("started_at", mondayISO)

  // ---  Conditional Filters ---
  if (selectedSection) {
    gpsComplianceQuery = gpsComplianceQuery.eq(
      "enrollment.section.section_id",
      selectedSection
    )
  } else if (selectedSectionIds.length > 0) {
    gpsComplianceQuery = gpsComplianceQuery.in(
      "enrollment.section.section_id",
      selectedSectionIds
    )
  }

  if (filteredAdviserId) {
    gpsComplianceQuery = gpsComplianceQuery.eq(
      "enrollment.section.adviser_user_id",
      filteredAdviserId
    )
  }

  if (selectedSection) {
    studentsQuery = studentsQuery.eq(
      "enrollment.section.section_id",
      selectedSection
    )
    advisersQuery = advisersQuery.eq("section.section_id", selectedSection)
    weeklyActiveCountQuery = weeklyActiveCountQuery.eq(
      "section.section_id",
      selectedSection
    )
    weeklyTimeInLogsQuery = weeklyTimeInLogsQuery.eq(
      "enrollment.section.section_id",
      selectedSection
    )
    filesQuery = filesQuery.eq("section.section_id", selectedSection)
    appealsQuery = appealsQuery.eq(
      "enrollment.section.section_id",
      selectedSection
    )
    adviserWorkloadQuery = adviserWorkloadQuery.eq(
      "section.section_id",
      selectedSection
    )
    enrollmentQuery = enrollmentQuery.eq("section.section_id", selectedSection)
  } else if (selectedSectionIds.length > 0) {
    studentsQuery = studentsQuery.in(
      "enrollment.section.section_id",
      selectedSectionIds
    )
    advisersQuery = advisersQuery.in("section.section_id", selectedSectionIds)
    weeklyActiveCountQuery = weeklyActiveCountQuery.in(
      "section.section_id",
      selectedSectionIds
    )
    weeklyTimeInLogsQuery = weeklyTimeInLogsQuery.in(
      "enrollment.section.section_id",
      selectedSectionIds
    )
    filesQuery = filesQuery.in("section.section_id", selectedSectionIds)
    appealsQuery = appealsQuery.in(
      "enrollment.section.section_id",
      selectedSectionIds
    )
    adviserWorkloadQuery = adviserWorkloadQuery.in(
      "section.section_id",
      selectedSectionIds
    )
    enrollmentQuery = enrollmentQuery.in(
      "section.section_id",
      selectedSectionIds
    )
  }

  if (filteredAdviserId) {
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
    recentActivityRes,
    appealStatusesRes,
    enrollmentStatusesRes,
    attendanceSessionStatusesRes,
    termsRes,
    currentUserRes,
    gpsComplianceRes,
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
    // Filter Dropdown for section list lookup
    supabase
      .from("section")
      .select(
        "section_id, course_code, adviser_user_id, term:term_id(school_year, semester), app_user:adviser_user_id(full_name)"
      ),
    // recent activity for audit log
    supabase
      .from("audit_log_readable")
      .select(AUDIT_LOG_SELECT)
      .order("created_at", { ascending: false })
      .limit(10),

    // FETCH LOOKUP KEYS DYNAMICALLY
    supabase.from("appeal_status").select("appeal_status_id, name"),
    supabase.from("enrollment_status").select("enrollment_status_id, name"),
    supabase
      .from("attendance_session_status")
      .select("attendance_session_status_id, name"),

    // Fetch terms for deadline and semester display (active + all for filter subtitle)
    supabase
      .from("term")
      .select("term_id, school_year, semester, end_date, is_active")
      .order("school_year", { ascending: false }),
    // Fetch user details mapped from active auth session
    user
      ? supabase
          .from("app_user")
          .select("full_name, avatar_url, role(name)")
          .eq("app_user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    gpsComplianceQuery,
  ])

  const sectionFilterOptions: {
    sectionId: string
    label: string
    courseCode: string
    adviserUserId: string | null
    adviserName: string
    schoolYear: string | null
    semester: string | null
  }[] = (
    (sectionsFilterRes.data ?? []) as unknown as {
      section_id: string
      course_code: string
      adviser_user_id?: string | null
      term: { school_year: string; semester: string } | null
      app_user: { full_name: string } | null
    }[]
  )
    .map((s) => ({
      sectionId: s.section_id,
      label: formatClassLabel({
        courseCode: s.course_code,
        facilitatorName: s.app_user?.full_name,
        schoolYear: s.term?.school_year,
      }),
      courseCode: s.course_code,
      adviserUserId: s.adviser_user_id ?? null,
      adviserName: s.app_user?.full_name ?? "Unassigned",
      schoolYear: s.term?.school_year ?? null,
      semester: s.term?.semester ?? null,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const availableSections = sectionFilterOptions
  const selectedSectionLabel =
    sectionFilterOptions.find((s) => s.sectionId === selectedSection)?.label ??
    selectedSection

  const selectedAdviserName =
    selectedAdviser ||
    sectionFilterOptions.find((s) => s.adviserUserId === filteredAdviserId)
      ?.adviserName ||
    ""

  // Student bars for a pinned section or adviser-only; combined Class/Year keep section summaries.
  const showStudentBars = Boolean(
    selectedSection ||
      (filteredAdviserId && !selectedNstpType && !selectedSchoolYear)
  )

  const exportSections = sectionFilterOptions

  // ── SERVER-SIDE CALCULATIONS & PROCESSING ───────────────────────────────
  const rawGpsSessions = gpsComplianceRes?.data || []
  const gpsComplianceError = gpsComplianceRes?.error as
    | { message?: string; details?: string; hint?: string; code?: string }
    | null
    | undefined
  if (gpsComplianceError?.message) {
    console.warn("GPS compliance query warning:", {
      message: gpsComplianceError.message,
      details: gpsComplianceError.details,
      hint: gpsComplianceError.hint,
      code: gpsComplianceError.code,
    })
  }
  const totalGpsSessions = rawGpsSessions.length
  const flaggedGpsSessions = rawGpsSessions.filter(
    (s: any) => s.is_flagged
  ).length
  const computedGpsCompliance =
    totalGpsSessions > 0
      ? Math.round(
          ((totalGpsSessions - flaggedGpsSessions) / totalGpsSessions) * 100
        )
      : 100

  // calculating weekly attendance rate
  const totalActiveEnrollments = attendanceRateRes[0]?.count || 0
  const uniqueScansThisWeek = new Set(
    attendanceRateRes[1]?.data?.map((e: any) => e.enrollment_id)
  ).size
  const computedAttendanceRate =
    totalActiveEnrollments > 0
      ? Math.round((uniqueScansThisWeek / totalActiveEnrollments) * 100)
      : 0

  const activeTerm = (termsRes?.data ?? []).find((t) => t.is_active) ?? null

  // Prefer filter selection for the header year/semester; fall back to active term.
  const selectedSectionMeta = selectedSection
    ? sectionFilterOptions.find((s) => s.sectionId === selectedSection)
    : null
  const displaySchoolYear =
    selectedSchoolYear ||
    selectedSectionMeta?.schoolYear ||
    (selectedSectionIds.length > 0
      ? sectionFilterOptions.find((s) =>
          selectedSectionIds.includes(s.sectionId)
        )?.schoolYear
      : null) ||
    activeTerm?.school_year ||
    null

  const termsForDisplayYear = displaySchoolYear
    ? (termsRes?.data ?? []).filter((t) => t.school_year === displaySchoolYear)
    : []
  const displayTerm =
    termsForDisplayYear.find((t) => t.is_active) ??
    (selectedSectionMeta?.semester
      ? termsForDisplayYear.find(
          (t) => t.semester === selectedSectionMeta.semester
        )
      : null) ??
    termsForDisplayYear[0] ??
    activeTerm

  // When a year spans multiple semesters and none is pinned, prefer active match then first term.
  const pinnedSemester =
    selectedSectionMeta?.semester ??
    (termsForDisplayYear.length === 1
      ? termsForDisplayYear[0]?.semester
      : null) ??
    (displaySchoolYear === activeTerm?.school_year
      ? activeTerm?.semester
      : null) ??
    displayTerm?.semester ??
    null

  function formatSemesterLabel(semester: string | null | undefined): string {
    if (!semester) return "N/A"
    const code = semester as TermSemesterCode
    return SEMESTER_LABELS[code] ?? `${semester} semester`
  }

  const currentSemesterMeta = {
    academicYear: displaySchoolYear ?? "N/A",
    semester: formatSemesterLabel(pinnedSemester),
  }

  let daysLeft: number | null = null
  const deadlineTerm = displayTerm ?? activeTerm
  if (deadlineTerm?.end_date) {
    const endDate = new Date(deadlineTerm.end_date)
    const diffMs = endDate.getTime() - today.getTime()
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const roleData = currentUserRes?.data?.role as any
  const currentUserMeta: CurrentUser = {
    name: currentUserRes?.data?.full_name || "Admin",
    role: roleData?.name || "Administrator",
    avatarUrl: (currentUserRes?.data as any)?.avatar_url ?? undefined,
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
    const sectionLabel = formatClassLabel({
      courseCode: sectionData.course_code,
      facilitatorName: sectionData.app_user?.full_name,
      schoolYear: sectionData.term?.school_year,
    })
    const targetHours = sectionData.required_hour_total || 60
    const studentMinutes =
      en.attendance_session?.reduce(
        (sum: number, s: any) => sum + (s.duration_minute || 0),
        0
      ) || 0

    const studentHours = studentMinutes / 60

    totalMinutesRendered += studentMinutes

    const studentCompletionPct = Math.round((studentHours / targetHours) * 100)

    // applying time-aware logic

    const status = progressStatusFromPct(studentCompletionPct, daysLeft)

    if (status === "on_track") onTrackCount++
    else if (status === "in_progress") inProgressCount++
    else {
      atRiskCount++

      let refinedSubtitle = `${sectionLabel} under ${
        sectionData.app_user?.full_name || "No Adviser"
      }`
      if (selectedAdviserName) {
        refinedSubtitle = sectionLabel
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
        name: sectionLabel,
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
  // Student-level bars for a single section or adviser-only; Class/Year keep section summaries.
  let processedSectionProgress: SectionProgress[] = []
  if (showStudentBars) {
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
    processedSectionProgress = Object.entries(sectionAggregationMap)
      .map(([sectionId, sect]) => ({
        id: sectionId,
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
      const primarySectionLabel = sectionRosters[0]?.course_code
        ? formatClassLabel({
            courseCode: sectionRosters[0].course_code,
            facilitatorName: adv.full_name,
            schoolYear: sectionRosters[0]?.term?.school_year,
          })
        : "Floating"
      return {
        name: adminFacilitatorIds.has(adv.app_user_id)
          ? `${adv.full_name} (Admin)`
          : adv.full_name,
        section: primarySectionLabel,
        studentCount: totalStudentsCount,
      }
    })
    // remove inactive advisers (0 students)
    .filter((adviser) =>
      selectedSection || filteredAdviserId ? adviser.studentCount > 0 : true
    )
    .sort((a, b) => b.studentCount - a.studentCount)

  // dunamic layout key dictionary
  const dashboardUuidMap: Record<string, string> = {}
  appealStatusesRes.data?.forEach((s) => {
    dashboardUuidMap[s.appeal_status_id] = s.name.replace(/_/g, " ")
  })
  enrollmentStatusesRes.data?.forEach((s) => {
    dashboardUuidMap[s.enrollment_status_id] = s.name
  })
  attendanceSessionStatusesRes.data?.forEach((s) => {
    dashboardUuidMap[s.attendance_session_status_id] = s.name.replace(/_/g, " ")
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

  // --- Active Students term-over-term delta (computed, previously hardcoded "↑ 4%") ---
  // Compares this term's active roster with the previous term's roster. Only
  // shown on the unscoped, current-term view — a "v.s. last sem" figure is
  // meaningless next to a section/year-filtered count, so we omit the badge then.
  let activeStudentsBadge: KpiStatCardProps["badge"] | undefined
  let activeStudentsNote: string | undefined
  if (activeTerm?.term_id && !hasClassScope && !includeCompletedEnrollments) {
    const allTerms = (termsRes?.data ?? []) as {
      term_id: string
      end_date: string | null
    }[]
    const activeEnd = activeTerm.end_date
    const previousTerm =
      allTerms
        .filter(
          (t) =>
            t.term_id !== activeTerm.term_id &&
            t.end_date != null &&
            (activeEnd == null || t.end_date < activeEnd)
        )
        .sort((a, b) => (a.end_date! < b.end_date! ? 1 : -1))[0] ?? null

    if (previousTerm) {
      const [currentCountRes, previousCountRes] = await Promise.all([
        supabase
          .from("enrollment")
          .select("enrollment_id, section!inner(term_id)", {
            count: "exact",
            head: true,
          })
          .eq("section.term_id", activeTerm.term_id)
          .eq("enrollment_status_id", activeStatusId),
        supabase
          .from("enrollment")
          .select("enrollment_id, section!inner(term_id)", {
            count: "exact",
            head: true,
          })
          .eq("section.term_id", previousTerm.term_id)
          .in("enrollment_status_id", [activeStatusId, completedStatusId]),
      ])
      const currentCount = currentCountRes.count ?? 0
      const previousCount = previousCountRes.count ?? 0
      if (previousCount > 0) {
        const deltaPct = Math.round(
          ((currentCount - previousCount) / previousCount) * 100
        )
        const up = deltaPct >= 0
        activeStudentsBadge = {
          text: `${up ? "↑" : "↓"} ${Math.abs(deltaPct)}%`,
          bg: up ? COLORS.greenBgLight : COLORS.maroonDarkBgLight,
          color: up ? COLORS.green : COLORS.maroonDark,
        }
        activeStudentsNote = "v.s. last sem"
      }
    }
  }

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-users",
      label: "Active Students",
      value: rawEnrollments.length,
      badge: activeStudentsBadge,
      note: activeStudentsNote,
      href: "/admin/students",
    },
    {
      icon: "ti-user-check",
      label: "Total Advisers",
      value: advisersRes.count || 0,
      note: `avg ${(totalStudentsCount / (advisersRes.count || 1)).toFixed(
        0
      )} students each`,
      href: "/admin/advisers",
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
      scrollTarget: "dashboard-hours-by-section",
    },
    {
      icon: "ti-calendar",
      label: "Average attendance rate",
      value: `${computedAttendanceRate}%`,
      note: "this week",
    },
    {
      icon: "ti-alert-triangle",
      label: "At-risk Students",
      value: atRiskCount,
      badge: {
        text: `${processedCompletionStatus.atRiskPct}%`,
        bg: COLORS.maroonDarkBgLight,
        color: COLORS.maroonDark,
      },
      note: "of total active students",
      href: "/admin/students?status=at_risk",
    },
    {
      icon: "ti-clipboard-list",
      label: "Files submitted",
      value: filesRes.count || 0,
      note: "throughout the semester",
      href: "/admin/forms",
    },
    {
      icon: "ti-pencil",
      label: "Pending Requests",
      value: appealsRes.count || 0,
      note: "pending review",
      href: "/admin/advisers?status=pending",
    },
    {
      icon: "ti-map-pin",
      label: "GPS & Network Compliance",
      value: `${computedGpsCompliance}%`,
      note: "Clear of location or network anomalies this week",
      href: "/admin/sites?status=active",
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

        <AdminProfilePill user={currentUserMeta} />
      </div>

      <DashboardToolbar
        filterParams={{
          nstpType: selectedNstpType || undefined,
          adviserUserId: filteredAdviserId || undefined,
          schoolYear: selectedSchoolYear || undefined,
          legacyFilter: hasDimensionParams
            ? undefined
            : legacyFilter || undefined,
        }}
        sections={availableSections}
        exportSections={exportSections}
      />

      <ChartStyles />
      <KpiStatCardGrid columns={4}>
        {statCards.map((card, i) => (
          <KpiStatCard key={i} {...card} />
        ))}
      </KpiStatCardGrid>

      {/* Hours completion by section — full width */}
      <div
        id="dashboard-hours-by-section"
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: COLORS.radius,
          padding: "18px 20px",
          boxShadow: COLORS.cardShadow,
          scrollMarginTop: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ ...TYPE.h2, color: COLORS.textDark, marginBottom: 20 }}>
          {selectedSection
            ? `Student progress within ${selectedSectionLabel}`
            : showStudentBars && selectedAdviserName
            ? `Student progress under ${selectedAdviserName}`
            : selectedSchoolYear || selectedNstpType || selectedAdviserName
            ? [
                "Hours completion by section",
                selectedNstpType,
                selectedAdviserName ? selectedAdviserName : null,
                selectedSchoolYear ? `AY ${selectedSchoolYear}` : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Hours completion by section"}
        </div>
        <SectionProgressPanel
          rows={processedSectionProgress}
          rowLabel={showStudentBars ? "students" : "sections"}
        />
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
                  <span
                    style={{
                      ...TYPE.body,
                      fontWeight: 500,
                      color: COLORS.textGray,
                    }}
                  >
                    {a.studentCount}
                  </span>
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
