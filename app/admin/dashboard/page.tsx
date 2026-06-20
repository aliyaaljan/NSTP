import { Montserrat } from "next/font/google"
import { FONT_BODY, FONT_HEADING, TYPE } from "@/lib/admin-typography"

/**
 * ADMIN DASHBOARD
 * ──────────────────────────────────────────────────────────────────────────
 * Data is mocked in `MOCK_DASHBOARD_DATA` and returned by `getDashboardData`.
 * Everything below the data section is presentational only — it just reads
 * from the `DashboardData` shape, so wiring up the real backend later is a
 * matter of replacing the body of `getDashboardData()` with a real fetch /
 * DB call, e.g.:
 *
 *   async function getDashboardData(): Promise<DashboardData> {
 *     const res = await fetch(`${process.env.API_BASE_URL}/admin/dashboard`, {
 *       cache: "no-store",
 *     })
 *     if (!res.ok) throw new Error("Failed to load dashboard data")
 *     return res.json()
 *   }
 *
 * As long as the response matches `DashboardData`, no JSX changes are needed.
 * ──────────────────────────────────────────────────────────────────────────
 */

// Montserrat is loaded via next/font (self-hosted, no layout shift).
// Futura isn't available on Google Fonts, so it's referenced with system
// fallbacks — install/host a licensed Futura file via @font-face if pixel-exact
// Futura rendering is needed; "Century Gothic" is the closest common fallback.
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

// ── Data contract ────────────────────────────────────────────────────────

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

export interface DashboardData {
  meta: { academicYear: string; semester: string }
  currentUser: CurrentUser
  stats: DashboardStats
  sectionProgress: SectionProgress[]
  completionStatus: CompletionStatus
  atRiskStudents: AtRiskStudentRow[]
  adviserWorkload: AdviserWorkloadRow[]
  recentActivity: RecentActivityItem[]
}

// ── Mock data (swap out in getDashboardData once the API is ready) ────────

const MOCK_DASHBOARD_DATA: DashboardData = {
  meta: { academicYear: "2025-2026", semester: "2nd Semester" },
  currentUser: { name: "Kim, Mingyu", role: "NSTP Admin" },
  stats: {
    totalStudents: { value: 503, deltaPct: 4, deltaLabel: "v.s. last sem" },
    totalAdvisers: { value: 9, note: "avg 55 students each" },
    avgHoursRendered: { value: 312, target: 500, completionPct: 62 },
    avgAttendanceRate: { value: 87, note: "this week" },
    atRiskStudents: { value: 14, pctOfCohort: 9 },
    filesSubmitted: { value: 203, note: "throughout the semester" },
    editRequests: { value: 7, note: "pending review" },
    gpsCompliance: { value: 94, note: "Logged within radius" },
  },
  sectionProgress: [
    { section: "A", pct: 88 },
    { section: "B", pct: 74 },
    { section: "C", pct: 61 },
    { section: "D", pct: 45 },
    { section: "E", pct: 39 },
  ],
  completionStatus: { onTrackPct: 62, inProgressPct: 29, atRiskPct: 9 },
  atRiskStudents: [
    { name: "James L. Santos", sectionInfo: "Section A under Adviser Reyes", completionPct: 22 },
    { name: "Maria B. Cruz", sectionInfo: "Section C under Adviser Lim", completionPct: 28 },
    { name: "Karl J. Ramos", sectionInfo: "Section D under Adviser Torres", completionPct: 34 },
    { name: "Simon A. Santos", sectionInfo: "Section A under Adviser Reyes", completionPct: 35 },
    { name: "Hannah B. Simmons", sectionInfo: "Section D under Adviser Torres", completionPct: 35 },
  ],
  adviserWorkload: [
    { name: "Adviser Reyes", section: "Section A", studentCount: 56 },
    { name: "Adviser Bautista", section: "Section B", studentCount: 56 },
    { name: "Advisor Smith", section: "Section C", studentCount: 56 },
    { name: "Adviser Torres", section: "Section D", studentCount: 56 },
    { name: "Adviser Garcia", section: "Section D", studentCount: 56 },
  ],
  recentActivity: [
    { title: "File Submitted", actor: "Amia Mendoza", timeAgo: "3 mins ago" },
    { title: "Time Edit Approved", actor: "Adviser Reyes", timeAgo: "1 hr ago" },
    { title: "New Student Added", actor: "Admin", timeAgo: "2 hrs ago" },
    { title: "GPS radius updated", actor: "Adviser Lim", timeAgo: "4 hrs ago" },
    { title: "File Submitted", actor: "James Miller", timeAgo: "4 hrs ago" },
  ],
}

async function getDashboardData(): Promise<DashboardData> {
  // TODO(backend): replace with a real fetch / server action / DB call.
  return MOCK_DASHBOARD_DATA
}

// ── Small presentational helpers ───────────────────────────────────────────

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
        <i className={`ti ${icon}`} style={{ fontSize: 19, color: COLORS.maroon }} />
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
          <span style={{ ...TYPE.body, color: COLORS.textGray }}>{valueSuffix}</span>
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
  gridTemplateColumns: "20px 1fr auto",
  columnGap: 14,
  alignItems: "center",
} as const

function SectionProgressHeader() {
  return (
    <div style={{ ...SECTION_PROGRESS_GRID, marginBottom: 10 }}>
      <span style={{ ...TYPE.body, color: COLORS.textDark }}>Section</span>
      <span />
      <span style={{ ...TYPE.body, color: COLORS.textDark, textAlign: "right" }}>Progress</span>
    </div>
  )
}

function SectionProgressRow({ section, pct }: SectionProgress) {
  return (
    <div style={SECTION_PROGRESS_GRID}>
      <div style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>{section}</div>
      <div style={{ height: 8, borderRadius: 999, background: COLORS.track, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: progressColor(pct),
          }}
        />
      </div>
      <div style={{ ...TYPE.bodyBold, color: COLORS.textGray, textAlign: "right", paddingLeft: 12 }}>
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.track} strokeWidth={strokeWidth} />
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
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ ...TYPE.body, color: COLORS.textDark }}>{label}</span>
    </div>
  )
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ ...TYPE.h2, color: COLORS.textDark }}>{title}</div>
        {rightLabel && (
          <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{rightLabel}</div>
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
        style={{ overflowY: "auto", maxHeight: 270, marginRight: -10, paddingRight: 12 }}
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {leftSlot && <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{leftSlot}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
            {title}
          </div>
          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
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
          background: user.avatarUrl ? `center/cover no-repeat url(${user.avatarUrl})` : "#D8D8D5",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...TYPE.bodyBold, color: "#fff" }}>{user.name}</div>
        <div style={{ ...TYPE.caption, color: "rgba(255,255,255,0.75)", fontStyle: "normal" }}>{user.role}</div>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const data = await getDashboardData()
  const { stats } = data

  const statCards: Array<React.ComponentProps<typeof StatCard>> = [
    {
      icon: "ti-users",
      label: "Total Students",
      value: stats.totalStudents.value,
      badge: { text: `↑ ${stats.totalStudents.deltaPct}%`, bg: COLORS.greenBgLight, color: COLORS.green },
      note: stats.totalStudents.deltaLabel,
    },
    {
      icon: "ti-user-check",
      label: "Total Advisers",
      value: stats.totalAdvisers.value,
      note: stats.totalAdvisers.note,
    },
    {
      icon: "ti-clock",
      label: "Average hours rendered",
      value: stats.avgHoursRendered.value,
      valueSuffix: `/${stats.avgHoursRendered.target}`,
      badge: {
        text: `${stats.avgHoursRendered.completionPct}%`,
        bg: COLORS.amberBgLight,
        color: COLORS.amber,
      },
      note: "completion",
    },
    {
      icon: "ti-clock-check",
      label: "Average attendance rate",
      value: `${stats.avgAttendanceRate.value}%`,
      note: stats.avgAttendanceRate.note,
    },
    {
      icon: "ti-alert-triangle",
      label: "At-risk Students",
      value: stats.atRiskStudents.value,
      valueColor: COLORS.maroonDark,
      badge: {
        text: `${stats.atRiskStudents.pctOfCohort}%`,
        bg: COLORS.maroonDarkBgLight,
        color: COLORS.maroonDark,
      },
      note: "of cohort",
    },
    {
      icon: "ti-clipboard-list",
      label: "Files submitted",
      value: stats.filesSubmitted.value,
      note: stats.filesSubmitted.note,
    },
    {
      icon: "ti-pencil",
      label: "Edit Requests",
      value: stats.editRequests.value,
      note: stats.editRequests.note,
    },
    {
      icon: "ti-map-pin",
      label: "GPS compliance",
      value: `${stats.gpsCompliance.value}%`,
      note: stats.gpsCompliance.note,
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <ProfilePill user={data.currentUser} />
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
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {data.meta.academicYear} | {data.meta.semester}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
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
            All Sections
            <i className="ti ti-chevron-down" style={{ fontSize: 14 }} />
          </button>
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
            <i className="ti ti-download" style={{ fontSize: 14 }} />
            Export
          </button>
        </div>
      </div>

      {/* Stat cards */}
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

      {/* Section progress + Completion donut */}
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
          <div
            style={{
              ...TYPE.h2,
              color: COLORS.textDark,
              marginBottom: 20,
            }}
          >
            Hours completion by section
          </div>
          <SectionProgressHeader />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {data.sectionProgress.map((row) => (
              <SectionProgressRow key={row.section} {...row} />
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
          <div
            style={{
              ...TYPE.h2,
              color: COLORS.textDark,
              marginBottom: 18,
            }}
          >
            Completion Status
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <CompletionDonut data={data.completionStatus} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <LegendDot color={COLORS.green} label={`On track - ${data.completionStatus.onTrackPct}%`} />
            <LegendDot color={COLORS.maroon} label={`In progress - ${data.completionStatus.inProgressPct}%`} />
            <LegendDot color={COLORS.maroonDark} label={`At risk - ${data.completionStatus.atRiskPct}%`} />
          </div>
        </div>
      </div>

      {/* At-risk students / Adviser workload / Recent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        <ListCard title="At risk students" rightLabel="Below 45%" colLeft="Student" colRight="Completion">
          {data.atRiskStudents.map((s, i) => (
            <ListRow
              key={i}
              title={s.name}
              subtitle={s.sectionInfo}
              isLast={i === data.atRiskStudents.length - 1}
              rightSlot={
                <Badge
                  text={`${s.completionPct}%`}
                  bg={COLORS.maroonDarkBgLight}
                  color={COLORS.maroonDark}
                />
              }
            />
          ))}
        </ListCard>

        <ListCard title="Adviser Workload" colLeft="Adviser" colRight="Students">
          {data.adviserWorkload.map((a, i) => (
            <ListRow
              key={i}
              title={a.name}
              subtitle={a.section}
              isLast={i === data.adviserWorkload.length - 1}
              rightSlot={
                <Badge
                  text={`${a.studentCount} students`}
                  bg={i % 2 === 0 ? COLORS.greenBgLight : COLORS.maroonBgLight}
                  color={i % 2 === 0 ? COLORS.green : COLORS.maroon}
                />
              }
            />
          ))}
        </ListCard>

        <ListCard title="Recent Activity" colLeft="Activity" colRight="">
          {data.recentActivity.map((a, i) => (
            <ListRow
              key={i}
              title={a.title}
              subtitle={`${a.actor} | ${a.timeAgo}`}
              isLast={i === data.recentActivity.length - 1}
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
          ))}
        </ListCard>
      </div>
    </div>
  )
}