"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconChevronDown, IconUsers,
  IconCircleCheck, IconClock, IconAlertTriangle,
  IconChartBar, IconTrendingUp, IconTrendingDown,
} from "@tabler/icons-react";
import { Sidebar, dashboardStyles, navRoutes, DonutChart } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions";

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
  atRisk: number;
  students: { name: string; hoursLogged: number; totalHours: number; status: "Completed" | "In Progress" | "Not Started" }[];
}

// ── Mock Data ──────────────────────────────────────────────────────────
const sections: SectionSummary[] = [
  {
    id: "s1", name: "NSTP-H", totalStudents: 10, completed: 3, inProgress: 5, notStarted: 2,
    completionPct: 62, avgHours: 84, atRisk: 2,
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
    completionPct: 78, avgHours: 101, atRisk: 1,
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

  .gs-root { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .gs-header-row { display: flex; align-items: center; gap: 16px; padding: 28px 28px 0; flex-shrink: 0; }
  .gs-title { font-size: 38px; font-weight: 800; color: var(--maroon); font-family: var(--font); flex: 1; }

  .gs-stat-cards { display: flex; gap: 12px; padding: 18px 28px 0; flex-shrink: 0; }
  .gs-stat-card {
    flex: 1; background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow);
    position: relative; overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .gs-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .gs-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
  .gs-stat-value { font-size: 30px; font-weight: 800; line-height: 1; margin-top: 6px; }
  .gs-stat-icon-deco { position: absolute; bottom: -6px; right: -4px; opacity: 0.07; }

  .gs-body { flex: 1; overflow: auto; padding: 20px 28px 28px; display: flex; flex-direction: column; gap: 16px; }

  /* Section cards */
  .gs-section-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .gs-section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;
    transition: background 0.12s;
  }
  .gs-section-header:hover { background: #FAFAFA; }
  .gs-section-name { font-size: 16px; font-weight: 700; color: var(--text); }
  .gs-section-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .gs-section-right { display: flex; align-items: center; gap: 20px; }
  .gs-section-stat { text-align: center; }
  .gs-section-stat-val { font-size: 20px; font-weight: 800; color: var(--text); }
  .gs-section-stat-lbl { font-size: 10.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 1px; }
  .gs-chevron { color: var(--muted); transition: transform 0.2s ease; }
  .gs-chevron.open { transform: rotate(180deg); }

  .gs-section-body { padding: 16px 20px; display: flex; gap: 20px; }

  /* Donut + legend */
  .gs-donut-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0; }
  .gs-legend { display: flex; flex-direction: column; gap: 6px; }
  .gs-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .gs-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  /* Student table inside section */
  .gs-student-table { flex: 1; min-width: 0; }
  .gs-student-table table { width: 100%; border-collapse: collapse; }
  .gs-student-table th { font-size: 10.5px; font-weight: 700; color: var(--maroon); text-transform: uppercase; letter-spacing: 0.6px; padding: 0 0 8px; text-align: left; border-bottom: 1px solid var(--border); }
  .gs-student-table th:last-child { text-align: right; }
  .gs-student-table td { padding: 10px 0; border-bottom: 1px solid #F9FAFB; vertical-align: middle; font-size: 12.5px; }
  .gs-student-table tr:last-child td { border-bottom: none; }
  .gs-student-name { font-weight: 600; color: var(--text); }
  .gs-hours-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .gs-hours-bar-track { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; min-width: 80px; }
  .gs-hours-bar-fill  { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
  .gs-hours-txt { font-size: 11px; color: var(--muted); white-space: nowrap; }
  .gs-status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-align: right; float: right; }
`;

export default function GroupSummaryPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch]           = useState("");
  const [expanded, setExpanded]       = useState<string | null>("s1");

  async function handleSignOut() {
    await signOutWithAudit();
    router.push("/");
    router.refresh();
  }

  const totalStudents = sections.reduce((a, s) => a + s.totalStudents, 0);
  const totalCompleted = sections.reduce((a, s) => a + s.completed, 0);
  const totalAtRisk    = sections.reduce((a, s) => a + s.atRisk, 0);
  const overallPct     = Math.round(sections.reduce((a, s) => a + s.completionPct, 0) / sections.length);

  const statCards = [
    { label: "Total Students",  value: totalStudents,  Icon: IconUsers,         color: "#7B1D1D" },
    { label: "Completed",       value: totalCompleted, Icon: IconCircleCheck,   color: "#065F46" },
    { label: "At Risk",         value: totalAtRisk,    Icon: IconAlertTriangle, color: "#92400E" },
    { label: "Overall Progress",value: `${overallPct}%`, Icon: IconChartBar,    color: "#1E40AF" },
  ];

  const filteredSections = sections.filter(s =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.students.some(st => st.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{summaryStyles}</style>
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
            <div className="gs-root">

              {/* Header */}
              <div className="gs-header-row">
                <h1 className="gs-title">Group Summary</h1>
                <div className="search-bar" style={{ minWidth: 200 }}>
                  <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                  <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search section or student..." />
                </div>
                <div className="profile-pill">
                  <div className="profile-avatar">KM</div>
                  <div>
                    <div className="profile-name">Kim, Mingyu</div>
                    <div className="profile-sec">NSTP – H</div>
                  </div>
                </div>
              </div>

              {/* Stat cards */}
              <div className="gs-stat-cards">
                {statCards.map(({ label, value, Icon, color }) => (
                  <div key={label} className="gs-stat-card">
                    <div className="gs-stat-label">{label}</div>
                    <div className="gs-stat-value" style={{ color }}>{value}</div>
                    <div className="gs-stat-icon-deco" style={{ color }}><Icon size={60} stroke={1.2} /></div>
                  </div>
                ))}
              </div>

              {/* Section accordion cards */}
              <div className="gs-body">
                {filteredSections.map((section) => {
                  const isOpen = expanded === section.id;
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
                            <div className="gs-section-stat-val" style={{ color: "#EF4444" }}>{section.notStarted}</div>
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
                        <div className="gs-section-body">
                          {/* Donut + legend */}
                          <div className="gs-donut-wrap">
                            <DonutChart pct={section.completionPct} />
                            <div className="gs-legend">
                              <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#059669" }} />{section.completed} Completed</div>
                              <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#D97706" }} />{section.inProgress} In Progress</div>
                              <div className="gs-legend-item"><div className="gs-legend-dot" style={{ background: "#EF4444" }} />{section.notStarted} Not Started</div>
                            </div>
                          </div>

                          {/* Student breakdown table */}
                          <div className="gs-student-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Hours Progress</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.students.map((st) => {
                                  const pct = Math.round((st.hoursLogged / st.totalHours) * 100);
                                  return (
                                    <tr key={st.name}>
                                      <td><div className="gs-student-name">{st.name}</div></td>
                                      <td>
                                        <div className="gs-hours-bar-wrap">
                                          <div className="gs-hours-bar-track">
                                            <div className="gs-hours-bar-fill" style={{ width: `${pct}%`, background: progressBarColor(st.status) }} />
                                          </div>
                                          <span className="gs-hours-txt">{st.hoursLogged}/{st.totalHours} hrs</span>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="gs-status-badge" style={{ background: statusColor[st.status].bg, color: statusColor[st.status].color }}>
                                          {st.status}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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