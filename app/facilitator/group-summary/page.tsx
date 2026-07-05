"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconChevronDown, IconUsers,
  IconCircleCheck, IconAlertTriangle,
  IconChartBar, IconClock, IconFiles,
  IconClipboardCheck, IconEdit, IconMapPin,
} from "@tabler/icons-react";
import { Sidebar, dashboardStyles, navRoutes, DonutChart } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions";
import { ChartStyles } from "@/components/shared/ChartModule";
import { createClient } from "@/lib/client";

// ── Types ──────────────────────────────────────────────────────────────
interface SectionSummary {
  id: string;
  name: string;
  totalStudents: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionPct: number;
  avgHours: number;
  totalHours: number;
  atRisk: number;
  filesSubmitted: number;
  formsCompletionRate: number;
  editRequests: number;
  gpsCompliance: number;
  avgAttendanceRate: number;
  students: { name: string; hoursLogged: number; totalHours: number; status: "Completed" | "In Progress" | "Not Started" }[];
}

// ── Mock Data ──────────────────────────────────────────────────────────
const sections: SectionSummary[] = [
  {
    id: "s1", name: "NSTP-H", totalStudents: 10, completed: 3, inProgress: 5, notStarted: 2,
    completionPct: 62, avgHours: 84, totalHours: 120, atRisk: 2,
    filesSubmitted: 120, formsCompletionRate: 72, editRequests: 4, gpsCompliance: 94, avgAttendanceRate: 87,
    students: [
      { name: "Rhona Shayne Lopez",      hoursLogged: 105, totalHours: 120, status: "In Progress"  },
      { name: "Jaerish Kyle Rabang",     hoursLogged: 120, totalHours: 120, status: "Completed"    },
      { name: "Aliya Aljan Mendoza",     hoursLogged: 0,   totalHours: 120, status: "Not Started"  },
      { name: "Saffi Limbaro",           hoursLogged: 60,  totalHours: 120, status: "In Progress"  },
      { name: "Charles Ansbert Joaquin", hoursLogged: 120, totalHours: 120, status: "Completed"    },
      { name: "Axel Xandrei Valido",     hoursLogged: 55,  totalHours: 120, status: "In Progress"  },
      { name: "Janine Irish Tulic",      hoursLogged: 0,   totalHours: 120, status: "Not Started"  },
      { name: "Marco Dela Cruz",         hoursLogged: 98,  totalHours: 120, status: "In Progress"  },
      { name: "Patricia Santos",         hoursLogged: 72,  totalHours: 120, status: "In Progress"  },
      { name: "Luis Miguel Reyes",       hoursLogged: 120, totalHours: 120, status: "Completed"    },
    ],
  },
  {
    id: "s2", name: "NSTP-I", totalStudents: 8, completed: 5, inProgress: 2, notStarted: 1,
    completionPct: 78, avgHours: 101, totalHours: 120, atRisk: 1,
    filesSubmitted: 83, formsCompletionRate: 88, editRequests: 3, gpsCompliance: 97, avgAttendanceRate: 91,
    students: [
      { name: "Anna Marie Cruz",    hoursLogged: 120, totalHours: 120, status: "Completed"   },
      { name: "Brent Dela Torre",   hoursLogged: 90,  totalHours: 120, status: "In Progress" },
      { name: "Carl Joseph Tan",    hoursLogged: 120, totalHours: 120, status: "Completed"   },
      { name: "Diana Rose Flores",  hoursLogged: 0,   totalHours: 120, status: "Not Started" },
      { name: "Eduardo Santos",     hoursLogged: 120, totalHours: 120, status: "Completed"   },
      { name: "Faye Reyes",         hoursLogged: 110, totalHours: 120, status: "In Progress" },
      { name: "Glenn Aquino",       hoursLogged: 120, totalHours: 120, status: "Completed"   },
      { name: "Hannah Bautista",    hoursLogged: 120, totalHours: 120, status: "Completed"   },
    ],
  },
];

const statusColor: Record<string, { bg: string; color: string }> = {
  "Completed":   { bg: "#D1FAE5", color: "#065F46" },
  "In Progress": { bg: "#FEF3C7", color: "#92400E" },
  "Not Started": { bg: "#FEE2E2", color: "#991B1B" },
};

function progressBarColor(status: string) {
  if (status === "Completed")   return "#059669";
  if (status === "In Progress") return "#D97706";
  return "#EF4444";
}

const summaryStyles = `
  ${dashboardStyles}

  .gs-body { flex: 1; overflow: auto; padding-top: 16px; display: flex; flex-direction: column; gap: 16px; }

  /* Section cards */
  .gs-section-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
  .gs-section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; cursor: pointer; transition: background 0.12s;
  }
  .gs-section-header:hover { background: #FAFAFA; }
  .gs-section-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .gs-section-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .gs-section-right { display: flex; align-items: center; gap: 20px; }
  .gs-section-stat { text-align: center; }
  .gs-section-stat-val { font-size: 20px; font-weight: 800; }
  .gs-section-stat-lbl { font-size: 10.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
  .gs-chevron { color: var(--muted); transition: transform 0.2s ease; }
  .gs-chevron.open { transform: rotate(180deg); }

  .gs-mini-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .gs-mini-card {
    background: #F9FAFB; border: 1px solid var(--border); border-radius: 12px;
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
  }
  .gs-mini-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .gs-mini-label { font-size: 10.5px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .gs-mini-value { font-size: 20px; font-weight: 800; color: var(--text); line-height: 1.2; margin-top: 2px; }
  .gs-mini-sub { font-size: 10.5px; color: var(--light); margin-top: 1px; }

  /* Bottom layout: donut left, table right */
  .gs-bottom-row { display: flex; gap: 16px; align-items: stretch; }
  .gs-donut-panel {
    flex-shrink: 0; width: 190px;
    background: #F9FAFB; border: 1px solid var(--border); border-radius: 14px;
    padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .gs-legend { display: flex; flex-direction: column; gap: 7px; width: 100%; }
  .gs-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text); }
  .gs-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  .gs-student-table { flex: 1; min-width: 0; background: #F9FAFB; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
  .gs-student-table table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .gs-student-table thead th {
    position: sticky; top: 0; z-index: 2; background: #F9FAFB;
    font-size: 11px; font-weight: 700; color: var(--maroon);
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 10px 20px; text-align: left; border-bottom: 1px solid var(--border);
  }
  .gs-student-table tbody { display: block; max-height: 260px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
  .gs-student-table tbody::-webkit-scrollbar { width: 5px; }
  .gs-student-table tbody::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  .gs-student-table thead, .gs-student-table tbody tr { display: table; width: 100%; table-layout: fixed; }
  .gs-student-table thead th:nth-child(1),
  .gs-student-table tbody td:nth-child(1) { width: 40%; }
  .gs-student-table thead th:nth-child(2),
  .gs-student-table tbody td:nth-child(2) { width: 35%; }
  .gs-student-table thead th:nth-child(3),
  .gs-student-table tbody td:nth-child(3) { width: 25%; }
  .gs-student-table td { padding: 14px 20px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; font-size: 13px; }
  .gs-student-table tr:last-child td { border-bottom: none; }
  .gs-student-table tbody tr:hover td { background: #FAFAFA; }
  .gs-student-name { font-weight: 600; color: var(--text); }
  .gs-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; float: right; }
  .gs-donut-label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; align-self: flex-start; }
`;

type SummaryFilter = "all" | "completed" | "atRisk" | "progress";

export default function GroupSummaryPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch]           = useState("");
  const [expanded, setExpanded]       = useState<string | null>("s1");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("all");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const full: string = user?.user_metadata?.full_name ?? "";
      const parts = full.trim().split(" ");
      const fName = parts[0] ?? "";
      const lName = parts.at(-1) ?? "";
      setFirstName(fName);
      setLastName(lName);
      setInitials((fName[0] ?? "") + (lName[0] ?? ""));
    });
  }, []);

  async function handleSignOut() {
    await signOutWithAudit();
    router.push("/");
    router.refresh();
  }

  const totalStudents   = sections.reduce((a, s) => a + s.totalStudents, 0);
  const totalCompleted  = sections.reduce((a, s) => a + s.completed, 0);
  const totalAtRisk     = sections.reduce((a, s) => a + s.atRisk, 0);
  const overallPct      = Math.round(sections.reduce((a, s) => a + s.completionPct, 0) / sections.length);

  const statCards = [
    { label: "Total Students",   value: totalStudents,    Icon: IconUsers,         filter: "all" as const },
    { label: "Completed",        value: totalCompleted,   Icon: IconCircleCheck,   filter: "completed" as const },
    { label: "At Risk",          value: totalAtRisk,      Icon: IconAlertTriangle, filter: "atRisk" as const },
    { label: "Overall Progress", value: `${overallPct}%`, Icon: IconChartBar,      filter: "progress" as const },
  ];

  const filteredSections = sections.filter(s => {
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.students.some(st => st.name.toLowerCase().includes(search.toLowerCase()));
    if (!matchSearch) return false;
    if (summaryFilter === "completed") return s.completed > 0;
    if (summaryFilter === "atRisk") return s.atRisk > 0;
    if (summaryFilter === "progress") return s.completionPct > 0;
    return true;
  });

  return (
    <>
      <style>{summaryStyles}</style>
      <ChartStyles />
      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="Group Summary"
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={(label) => { setSidebarOpen(false); router.push(navRoutes[label]); }}
          onSignOut={handleSignOut}
        />
        {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

        <div className="main-wrapper">
          <main className="main">
            <header className="header">
              <h1 className="header-greeting">Group Summary</h1>
              <div className="search-bar">
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search section or student..."
                  aria-label="Search section or student"
                />
              </div>
              <div className="profile-pill">
                <div className="profile-avatar">{initials || "A"}</div>
                <div>
                  <div className="profile-name">{lastName ? `${lastName}, ${firstName}` : "Adviser"}</div>
                </div>
              </div>
            </header>

            <div className="body">
              <div className="overview-header">
                <div className="overview-label">Class Overview</div>
              </div>

              <div className="stat-cards">
                {statCards.map(({ label, value, Icon, filter }) => (
                  <button
                    key={label}
                    className="db-kpi-card db-kpi-card--interactive"
                    onClick={() => setSummaryFilter(filter)}
                    aria-label={`${label}: ${value}`}
                    aria-pressed={summaryFilter === filter}
                  >
                    <div className="db-kpi-header">
                      <span className="db-kpi-label">{label}</span>
                    </div>
                    <div className="db-kpi-value">{value}</div>
                    <div className="db-kpi-deco"><Icon size={110} stroke={1.2} /></div>
                  </button>
                ))}
              </div>

              <div className="gs-body">
                {filteredSections.map((section) => {
                  const isOpen = expanded === section.id;
                  const miniCards = [
                    { label: "Avg Hours Rendered", value: `${section.avgHours} / ${section.totalHours}`, sub: "hrs per student", Icon: IconClock,         bg: "#FEF3C7", color: "#92400E" },
                    { label: "Avg Attendance Rate", value: `${section.avgAttendanceRate}%`,              sub: "of sessions",     Icon: IconUsers,         bg: "#DBEAFE", color: "#1E40AF" },
                    { label: "Files Submitted",      value: section.filesSubmitted,                      sub: "total uploads",   Icon: IconFiles,         bg: "#F3E8FF", color: "#6B21A8" },
                    { label: "Forms Completion",     value: `${section.formsCompletionRate}%`,           sub: "completed",       Icon: IconClipboardCheck,bg: "#D1FAE5", color: "#065F46" },
                    { label: "Edit Requests",        value: section.editRequests,                        sub: "pending review",  Icon: IconEdit,          bg: "#FEE2E2", color: "#991B1B" },
                    { label: "GPS Compliance",       value: `${section.gpsCompliance}%`,                sub: "logged in radius", Icon: IconMapPin,       bg: "#D1FAE5", color: "#065F46" },
                  ];

                  return (
                    <div key={section.id} className="gs-section-card">
                      {/* Section header */}
                      <div className="gs-section-header" onClick={() => setExpanded(isOpen ? null : section.id)}>
                        <div>
                          <div className="gs-section-name">{section.name}</div>
                          <div className="gs-section-meta">{section.totalStudents} students · Avg {section.avgHours} hrs logged</div>
                        </div>
                        <div className="gs-section-right">
                          <div className="gs-section-stat">
                            <div className="gs-section-stat-val" style={{ color: "#065F46" }}>{section.completed}</div>
                            <div className="gs-section-stat-lbl">Completed</div>
                          </div>
                          <div className="gs-section-stat">
                            <div className="gs-section-stat-val" style={{ color: "#D97706" }}>{section.inProgress}</div>
                            <div className="gs-section-stat-lbl">In Progress</div>
                          </div>
                          <div className="gs-section-stat">
                            <div className="gs-section-stat-val" style={{ color: "#7B1D1D" }}>{section.notStarted}</div>
                            <div className="gs-section-stat-lbl">Not Started</div>
                          </div>
                          <div className="gs-section-stat" style={{ minWidth: 60 }}>
                            <div className="gs-section-stat-val" style={{ color: "#1E40AF" }}>{section.completionPct}%</div>
                            <div className="gs-section-stat-lbl">Completion</div>
                          </div>
                          <IconChevronDown size={18} stroke={2} className={`gs-chevron${isOpen ? " open" : ""}`} />
                        </div>
                      </div>

                      {/* Expanded body */}
                      {isOpen && (
                        <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>

                          {/* 3-column mini metric cards */}
                          <div className="gs-mini-cards">
                            {miniCards.map(({ label, value, sub, Icon, bg, color }) => (
                              <div key={label} className="gs-mini-card">
                                <div className="gs-mini-icon" style={{ background: bg }}>
                                  <Icon size={18} stroke={1.75} color={color} />
                                </div>
                                <div>
                                  <div className="gs-mini-label">{label}</div>
                                  <div className="gs-mini-value">{value}</div>
                                  <div className="gs-mini-sub">{sub}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Bottom: donut panel left, student table right */}
                          <div className="gs-bottom-row">
                            <div className="gs-donut-panel">
                              <div className="gs-donut-label">Progress Tracker</div>
                              <DonutChart pct={section.completionPct} />
                              <div className="gs-legend">
                                <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#059669" }} />{section.completed} Completed</div>
                                <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#D97706" }} />{section.inProgress} In Progress</div>
                                <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#EF4444" }} />{section.notStarted} Not Started</div>
                              </div>
                            </div>

                            <div className="gs-student-table">
                              <table>
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    <th>Hours</th>
                                    <th style={{ textAlign: "right" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.students.map((st) => (
                                    <tr key={st.name}>
                                      <td><div className="gs-student-name">{st.name}</div></td>
                                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{st.hoursLogged}/{st.totalHours} hrs</td>
                                      <td>
                                        <span className="gs-status-badge" style={{ background: statusColor[st.status].bg, color: statusColor[st.status].color }}>
                                          {st.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}