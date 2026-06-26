"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconChevronDown, IconClipboardText,
  IconCircleCheck, IconClock, IconX, IconDownload,
  IconEye, IconFilter, IconFileDescription,
} from "@tabler/icons-react";
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions";

// ── Types ──────────────────────────────────────────────────────────────
type FormStatus = "Submitted" | "Pending" | "Approved" | "Rejected";
type FormType   = "Daily Time Record" | "Accomplishment Report" | "Attendance Sheet" | "Incident Report";

interface FormEntry {
  id: string;
  studentName: string;
  studentNo: string;
  section: string;
  type: FormType;
  submittedDate: string;
  status: FormStatus;
  week?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────
const formEntries: FormEntry[] = [
  { id: "f1",  studentName: "Rhona Shayne Lopez",      studentNo: "20201234", section: "NSTP-H", type: "Daily Time Record",       submittedDate: "Jun 18, 2025", status: "Submitted",  week: "Week 5" },
  { id: "f2",  studentName: "Jaerish Kyle Rabang",     studentNo: "20123421", section: "NSTP-H", type: "Accomplishment Report",   submittedDate: "Jun 17, 2025", status: "Approved",   week: "Week 5" },
  { id: "f3",  studentName: "Saffi Limbaro",           studentNo: "20198765", section: "NSTP-H", type: "Attendance Sheet",        submittedDate: "Jun 16, 2025", status: "Pending",    week: "Week 4" },
  { id: "f4",  studentName: "Aliya Aljan Mendoza",     studentNo: "20152314", section: "NSTP-H", type: "Daily Time Record",       submittedDate: "Jun 15, 2025", status: "Approved",   week: "Week 4" },
  { id: "f5",  studentName: "Charles Ansbert Joaquin", studentNo: "20201111", section: "NSTP-H", type: "Incident Report",         submittedDate: "Jun 14, 2025", status: "Rejected",   week: "Week 4" },
  { id: "f6",  studentName: "Axel Xandrei Valido",     studentNo: "20203333", section: "NSTP-H", type: "Accomplishment Report",   submittedDate: "Jun 13, 2025", status: "Submitted",  week: "Week 3" },
  { id: "f7",  studentName: "Janine Irish Tulic",      studentNo: "20204444", section: "NSTP-H", type: "Daily Time Record",       submittedDate: "Jun 12, 2025", status: "Pending",    week: "Week 3" },
  { id: "f8",  studentName: "Marco Dela Cruz",         studentNo: "20205555", section: "NSTP-H", type: "Attendance Sheet",        submittedDate: "Jun 11, 2025", status: "Approved",   week: "Week 3" },
  { id: "f9",  studentName: "Patricia Santos",         studentNo: "20206666", section: "NSTP-H", type: "Accomplishment Report",   submittedDate: "Jun 10, 2025", status: "Submitted",  week: "Week 2" },
  { id: "f10", studentName: "Luis Miguel Reyes",       studentNo: "20207777", section: "NSTP-H", type: "Daily Time Record",       submittedDate: "Jun 9,  2025", status: "Approved",   week: "Week 2" },
];

const statusConfig: Record<FormStatus, { bg: string; color: string }> = {
  "Submitted": { bg: "#DBEAFE", color: "#1E40AF" },
  "Pending":   { bg: "#FEF3C7", color: "#92400E" },
  "Approved":  { bg: "#D1FAE5", color: "#065F46" },
  "Rejected":  { bg: "#FEE2E2", color: "#991B1B" },
};

const typeConfig: Record<FormType, { bg: string; color: string }> = {
  "Daily Time Record":      { bg: "#F3E8FF", color: "#6B21A8" },
  "Accomplishment Report":  { bg: "#FEF3C7", color: "#92400E" },
  "Attendance Sheet":       { bg: "#DBEAFE", color: "#1E40AF" },
  "Incident Report":        { bg: "#FEE2E2", color: "#991B1B" },
};

const statCards = [
  { label: "Total Forms",  value: formEntries.length,                                        Icon: IconClipboardText, color: "#7B1D1D" },
  { label: "Approved",     value: formEntries.filter(f => f.status === "Approved").length,   Icon: IconCircleCheck,   color: "#065F46" },
  { label: "Pending",      value: formEntries.filter(f => f.status === "Pending").length,    Icon: IconClock,         color: "#92400E" },
  { label: "Submitted",    value: formEntries.filter(f => f.status === "Submitted").length,  Icon: IconFileDescription, color: "#1E40AF" },
];

const formsStyles = `
  ${dashboardStyles}

  .fm-root { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .fm-header-row { display: flex; align-items: center; gap: 16px; padding: 28px 28px 0; flex-shrink: 0; }
  .fm-title { font-size: 38px; font-weight: 800; color: var(--maroon); font-family: var(--font); flex: 1; }

  .fm-stat-cards { display: flex; gap: 12px; padding: 18px 28px 0; flex-shrink: 0; }
  .fm-stat-card {
    flex: 1; background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow);
    position: relative; overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .fm-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .fm-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
  .fm-stat-value { font-size: 30px; font-weight: 800; color: var(--text); line-height: 1; margin-top: 6px; }
  .fm-stat-icon-deco { position: absolute; bottom: -6px; right: -4px; opacity: 0.07; }

  .fm-body { flex: 1; overflow: auto; padding: 20px 28px 28px; }
  .fm-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }

  .fm-toolbar { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); gap: 12px; }
  .fm-toolbar-title { font-weight: 700; font-size: 15px; }
  .fm-toolbar-count { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .fm-search-bar {
    display: flex; align-items: center; gap: 8px;
    border: 1.5px solid var(--border); border-radius: 20px;
    padding: 6px 14px; min-width: 200px; background: var(--white);
    transition: border-color 0.15s; margin-left: 16px;
  }
  .fm-search-bar:focus-within { border-color: var(--maroon); }
  .fm-search-input { border: none; outline: none; font-size: 13px; font-family: var(--font); color: var(--text); width: 100%; background: transparent; }
  .fm-search-input::placeholder { color: var(--light); }
  .fm-filter-btn {
    display: flex; align-items: center; gap: 6px;
    border: 1.5px solid var(--border); border-radius: 20px;
    padding: 6px 14px; background: var(--white); font-size: 13px;
    font-family: var(--font); font-weight: 500; cursor: pointer;
    color: var(--text); transition: border-color 0.13s;
  }
  .fm-filter-btn:hover { border-color: #9CA3AF; }

  .fm-table-wrapper { overflow-y: auto; max-height: calc(100vh - 380px); scrollbar-width: none; }
  .fm-table-wrapper::-webkit-scrollbar { display: none; }
  .fm-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .fm-table thead tr { background: #F9FAFB; border-bottom: 1px solid var(--border); }
  .fm-table thead th { position: sticky; top: 0; z-index: 2; background: #F9FAFB; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--maroon); letter-spacing: 0.8px; text-transform: uppercase; }
  .fm-table th:nth-child(1) { width: 28%; }
  .fm-table th:nth-child(2) { width: 22%; }
  .fm-table th:nth-child(3) { width: 12%; }
  .fm-table th:nth-child(4) { width: 16%; }
  .fm-table th:nth-child(5) { width: 14%; }
  .fm-table th:nth-child(6) { width: 8%; }
  .fm-table td { padding: 13px 16px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; font-size: 13px; }
  .fm-table tbody tr:last-child td { border-bottom: none; }
  .fm-table tbody tr { cursor: pointer; transition: background 0.12s; }
  .fm-table tbody tr:hover td { background: #FAFAFA; }
  .fm-student-name { font-weight: 600; color: var(--text); }
  .fm-student-no   { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .fm-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; }
  .fm-week { font-size: 12px; color: var(--muted); }
  .fm-actions { display: flex; gap: 6px; }
  .fm-action-btn {
    width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--white); cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: var(--muted); transition: all 0.13s;
  }
  .fm-action-btn:hover { border-color: var(--maroon); color: var(--maroon); background: #FEF2F2; }
  .fm-empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }

  .fm-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-top: 1px solid var(--border); position: relative;
  }
  .fm-pagination-info { font-size: 12.5px; color: var(--muted); }
  .fm-pagination-controls { display: flex; align-items: center; gap: 4px; position: absolute; left: 50%; transform: translateX(-50%); }
  .fm-page-btn {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--white); font-size: 13px; font-family: var(--font); font-weight: 500;
    color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, border-color 0.12s;
  }
  .fm-page-btn:hover:not(.fm-page-btn-active):not(:disabled) { background: #F9FAFB; border-color: #9CA3AF; }
  .fm-page-btn.fm-page-btn-active { background: var(--maroon); color: #fff; border-color: var(--maroon); font-weight: 700; }
  .fm-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Modal */
  .fm-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .fm-modal { background: var(--white); border-radius: 20px; width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .fm-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
  .fm-modal-title  { font-weight: 700; font-size: 16px; }
  .fm-modal-close  { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: background 0.12s; }
  .fm-modal-close:hover { background: var(--border); }
  .fm-modal-body   { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
  .fm-modal-label  { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .fm-modal-value  { font-size: 14px; font-weight: 600; color: var(--text); }
  .fm-modal-row    { display: flex; gap: 16px; }
  .fm-modal-field  { flex: 1; }
  .fm-modal-actions { display: flex; gap: 10px; padding: 0 22px 22px; }
  .fm-modal-btn {
    flex: 1; padding: 10px; border-radius: 10px; border: none; cursor: pointer;
    font-size: 13.5px; font-weight: 700; font-family: var(--font); transition: background 0.13s;
  }
  .fm-modal-btn-approve { background: #D1FAE5; color: #065F46; }
  .fm-modal-btn-approve:hover { background: #A7F3D0; }
  .fm-modal-btn-reject  { background: #FEE2E2; color: #991B1B; }
  .fm-modal-btn-reject:hover  { background: #FECACA; }
`;

const PAGE_SIZE = 8;

export default function FormsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | FormStatus>("All");
  const [typeFilter, setTypeFilter]     = useState<"All" | FormType>("All");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showTypeDrop, setShowTypeDrop]     = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const [selected, setSelected]         = useState<FormEntry | null>(null);

  async function handleSignOut() {
    await signOutWithAudit();
    router.push("/");
    router.refresh();
  }

  const filtered = formEntries.filter((f) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || f.studentName.toLowerCase().includes(q) || f.studentNo.includes(q);
    const matchStatus = statusFilter === "All" || f.status === statusFilter;
    const matchType   = typeFilter === "All"   || f.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <style>{formsStyles}</style>
      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="Forms"
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={(label) => { setSidebarOpen(false); router.push(navRoutes[label]); }}
          onSignOut={handleSignOut}
        />
        {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

        <div className="main-wrapper">
          <main className="main">
            <div className="fm-root">

              {/* Header */}
              <div className="fm-header-row">
                <h1 className="fm-title">Forms</h1>
                <div className="search-bar" style={{ minWidth: 200 }}>
                  <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                  <input className="search-input" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search student..." />
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
              <div className="fm-stat-cards">
                {statCards.map(({ label, value, Icon, color }) => (
                  <div key={label} className="fm-stat-card">
                    <div className="fm-stat-label">{label}</div>
                    <div className="fm-stat-value" style={{ color }}>{value}</div>
                    <div className="fm-stat-icon-deco" style={{ color }}>
                      <Icon size={60} stroke={1.2} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="fm-body">
                <div className="fm-card">
                  <div className="fm-toolbar">
                    <div>
                      <div className="fm-toolbar-title">All Submissions</div>
                      <div className="fm-toolbar-count">{filtered.length} form{filtered.length !== 1 ? "s" : ""} found</div>
                    </div>
                    <div className="fm-search-bar">
                      <IconSearch size={13} stroke={1.75} color="var(--light)" />
                      <input className="fm-search-input" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search..." />
                    </div>

                    {/* Status filter */}
                    <div style={{ position: "relative" }}>
                      <button className="fm-filter-btn" onClick={() => { setShowStatusDrop(v => !v); setShowTypeDrop(false); }}>
                        <IconFilter size={13} stroke={2} /> {statusFilter === "All" ? "All Status" : statusFilter} <IconChevronDown size={13} stroke={2} />
                      </button>
                      {showStatusDrop && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, minWidth: 150, overflow: "hidden" }}>
                          {(["All", "Submitted", "Pending", "Approved", "Rejected"] as const).map((opt) => (
                            <button key={opt} onClick={() => { setStatusFilter(opt); setShowStatusDrop(false); setCurrentPage(1); }}
                              style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", background: statusFilter === opt ? "#F9FAFB" : "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)", fontWeight: statusFilter === opt ? 700 : 400, color: statusFilter === opt ? "var(--maroon)" : "var(--text)" }}>
                              {opt === "All" ? "All Status" : opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Type filter */}
                    <div style={{ position: "relative" }}>
                      <button className="fm-filter-btn" onClick={() => { setShowTypeDrop(v => !v); setShowStatusDrop(false); }}>
                        <IconClipboardText size={13} stroke={2} /> {typeFilter === "All" ? "All Types" : typeFilter} <IconChevronDown size={13} stroke={2} />
                      </button>
                      {showTypeDrop && (
                        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, minWidth: 200, overflow: "hidden" }}>
                          {(["All", "Daily Time Record", "Accomplishment Report", "Attendance Sheet", "Incident Report"] as const).map((opt) => (
                            <button key={opt} onClick={() => { setTypeFilter(opt); setShowTypeDrop(false); setCurrentPage(1); }}
                              style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", background: typeFilter === opt ? "#F9FAFB" : "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)", fontWeight: typeFilter === opt ? 700 : 400, color: typeFilter === opt ? "var(--maroon)" : "var(--text)" }}>
                              {opt === "All" ? "All Types" : opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="fm-table-wrapper">
                    <table className="fm-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Form Type</th>
                          <th>Week</th>
                          <th>Date Submitted</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={6} className="fm-empty">No forms match your search.</td></tr>
                        ) : paginated.map((f) => (
                          <tr key={f.id} onClick={() => setSelected(f)}>
                            <td>
                              <div className="fm-student-name">{f.studentName}</div>
                              <div className="fm-student-no">{f.studentNo} · {f.section}</div>
                            </td>
                            <td>
                              <span className="fm-badge" style={{ background: typeConfig[f.type].bg, color: typeConfig[f.type].color }}>
                                {f.type}
                              </span>
                            </td>
                            <td><span className="fm-week">{f.week}</span></td>
                            <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{f.submittedDate}</td>
                            <td>
                              <span className="fm-badge" style={{ background: statusConfig[f.status].bg, color: statusConfig[f.status].color }}>
                                {f.status}
                              </span>
                            </td>
                            <td>
                              <div className="fm-actions" onClick={(e) => e.stopPropagation()}>
                                <button className="fm-action-btn" title="View"><IconEye size={15} stroke={1.75} /></button>
                                <button className="fm-action-btn" title="Download"><IconDownload size={15} stroke={1.75} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="fm-pagination">
                    <div className="fm-pagination-info">
                      Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </div>
                    <div className="fm-pagination-controls">
                      <button className="fm-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&#8249;</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button key={p} className={`fm-page-btn${p === currentPage ? " fm-page-btn-active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                      ))}
                      <button className="fm-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&#8250;</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Form detail modal */}
        {selected && (
          <div className="fm-modal-backdrop" onClick={() => setSelected(null)}>
            <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fm-modal-header">
                <div className="fm-modal-title">{selected.type}</div>
                <button className="fm-modal-close" onClick={() => setSelected(null)}><IconX size={18} stroke={1.75} /></button>
              </div>
              <div className="fm-modal-body">
                <div className="fm-modal-row">
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Student</div>
                    <div className="fm-modal-value">{selected.studentName}</div>
                  </div>
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Student No.</div>
                    <div className="fm-modal-value">{selected.studentNo}</div>
                  </div>
                </div>
                <div className="fm-modal-row">
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Section</div>
                    <div className="fm-modal-value">{selected.section}</div>
                  </div>
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Week</div>
                    <div className="fm-modal-value">{selected.week ?? "—"}</div>
                  </div>
                </div>
                <div className="fm-modal-row">
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Date Submitted</div>
                    <div className="fm-modal-value">{selected.submittedDate}</div>
                  </div>
                  <div className="fm-modal-field">
                    <div className="fm-modal-label">Status</div>
                    <span className="fm-badge" style={{ background: statusConfig[selected.status].bg, color: statusConfig[selected.status].color }}>
                      {selected.status}
                    </span>
                  </div>
                </div>
              </div>
              {(selected.status === "Submitted" || selected.status === "Pending") && (
                <div className="fm-modal-actions">
                  <button className="fm-modal-btn fm-modal-btn-approve">✓ Approve</button>
                  <button className="fm-modal-btn fm-modal-btn-reject">✕ Reject</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}