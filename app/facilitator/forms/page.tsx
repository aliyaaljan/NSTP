"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconChevronDown, IconClipboardText,
  IconCircleCheck, IconClock, IconX, IconDownload,
  IconFilter, IconFolder,
  IconInbox, IconUpload, IconTrash, IconFile, IconPlus,
} from "@tabler/icons-react";
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions";
import { ChartStyles } from "@/components/shared/ChartModule";
import { createClient } from "@/lib/client";

// ── Types ──────────────────────────────────────────────────────────────
type FormTab    = "repository" | "submissions";
type FormStatus = "Submitted" | "Not Yet Submitted";
type FormType   = "Daily Time Record" | "Accomplishment Report" | "Attendance Sheet" | "Incident Report";

interface RepoForm {
  id: string;
  name: string;
  type: FormType;
  uploadedDate: string;
  fileSize: string;
  downloads: number;
}

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
const repoForms: RepoForm[] = [
  { id: "r1", name: "Daily Time Record Template",      type: "Daily Time Record",      uploadedDate: "Jun 1, 2025",  fileSize: "124 KB", downloads: 38 },
  { id: "r2", name: "Accomplishment Report Template",  type: "Accomplishment Report",  uploadedDate: "Jun 1, 2025",  fileSize: "98 KB",  downloads: 31 },
  { id: "r3", name: "Attendance Sheet Template",       type: "Attendance Sheet",       uploadedDate: "Jun 2, 2025",  fileSize: "76 KB",  downloads: 27 },
  { id: "r4", name: "Incident Report Template",        type: "Incident Report",        uploadedDate: "Jun 3, 2025",  fileSize: "88 KB",  downloads: 12 },
];

const formEntries: FormEntry[] = [
  { id: "f1",  studentName: "Rhona Shayne Lopez",      studentNo: "20201234", section: "NSTP-H", type: "Daily Time Record",      submittedDate: "Jun 18, 2025", status: "Submitted",         week: "Week 5" },
  { id: "f2",  studentName: "Jaerish Kyle Rabang",     studentNo: "20123421", section: "NSTP-H", type: "Accomplishment Report",  submittedDate: "—",            status: "Not Yet Submitted", week: "Week 5" },
  { id: "f3",  studentName: "Saffi Limbaro",           studentNo: "20198765", section: "NSTP-H", type: "Attendance Sheet",       submittedDate: "Jun 16, 2025", status: "Submitted",         week: "Week 4" },
  { id: "f4",  studentName: "Aliya Aljan Mendoza",     studentNo: "20152314", section: "NSTP-H", type: "Daily Time Record",      submittedDate: "Jun 15, 2025", status: "Submitted",         week: "Week 4" },
  { id: "f5",  studentName: "Charles Ansbert Joaquin", studentNo: "20201111", section: "NSTP-H", type: "Incident Report",        submittedDate: "—",            status: "Not Yet Submitted", week: "Week 4" },
  { id: "f6",  studentName: "Axel Xandrei Valido",     studentNo: "20203333", section: "NSTP-H", type: "Accomplishment Report",  submittedDate: "Jun 13, 2025", status: "Submitted",         week: "Week 3" },
  { id: "f7",  studentName: "Janine Irish Tulic",      studentNo: "20204444", section: "NSTP-H", type: "Daily Time Record",      submittedDate: "—",            status: "Not Yet Submitted", week: "Week 3" },
  { id: "f8",  studentName: "Marco Dela Cruz",         studentNo: "20205555", section: "NSTP-H", type: "Attendance Sheet",       submittedDate: "Jun 11, 2025", status: "Submitted",         week: "Week 3" },
  { id: "f9",  studentName: "Patricia Santos",         studentNo: "20206666", section: "NSTP-H", type: "Accomplishment Report",  submittedDate: "Jun 10, 2025", status: "Submitted",         week: "Week 2" },
  { id: "f10", studentName: "Luis Miguel Reyes",       studentNo: "20207777", section: "NSTP-H", type: "Daily Time Record",      submittedDate: "—",            status: "Not Yet Submitted", week: "Week 2" },
];

const statusConfig: Record<FormStatus, { bg: string; color: string }> = {
  "Submitted":         { bg: "#D1FAE5", color: "#065F46" },
  "Not Yet Submitted": { bg: "#FEE2E2", color: "#991B1B" },
};

const typeConfig: Record<FormType, { bg: string; color: string }> = {
  "Daily Time Record":     { bg: "#F3E8FF", color: "#6B21A8" },
  "Accomplishment Report": { bg: "#FEF3C7", color: "#92400E" },
  "Attendance Sheet":      { bg: "#DBEAFE", color: "#1E40AF" },
  "Incident Report":       { bg: "#FEE2E2", color: "#991B1B" },
};

const submissionStatCards = (entries: FormEntry[]) => [
  { label: "Total",             value: entries.length,                                              Icon: IconClipboardText,   filter: "All" as const },
  { label: "Submitted",         value: entries.filter(f => f.status === "Submitted").length,        Icon: IconCircleCheck,     filter: "Submitted" as const },
  { label: "Not Yet Submitted", value: entries.filter(f => f.status === "Not Yet Submitted").length,Icon: IconClock,           filter: "Not Yet Submitted" as const },
];

const formsStyles = `
  ${dashboardStyles}

  .fm-body { flex: 1; overflow: auto; padding-top: 16px; }
  .adv-table th:nth-child(1) { width: 28%; }
  .adv-table th:nth-child(2) { width: 12%; }
  .adv-table th:nth-child(3) { width: 24%; }
  .adv-table th:nth-child(4) { width: 18%; }
  .adv-table th:nth-child(5) { width: 18%; }
  .fm-student-name { font-weight: 600; color: var(--text); }
  .fm-student-no   { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .fm-week { font-size: 12px; color: var(--muted); }
  .fm-upload-btn {
    display: flex; align-items: center; gap: 7px;
    background: var(--green); color: #fff; border: none;
    border-radius: 20px; padding: 8px 18px;
    font-size: 13px; font-weight: 700; font-family: var(--font);
    cursor: pointer; transition: background 0.13s;
  }
  .fm-upload-btn:hover { background: var(--green-dark); }

  /* Repository grid */
  .fm-repo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; padding: 20px; }
  .fm-repo-card {
    background: var(--white); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px 18px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 12px;
    transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .fm-repo-card:hover { border-color: var(--maroon); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .fm-repo-card-top { display: flex; align-items: flex-start; gap: 12px; }
  .fm-repo-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .fm-repo-name { font-size: 13.5px; font-weight: 700; color: var(--text); line-height: 1.3; }
  .fm-repo-meta { font-size: 11.5px; color: var(--muted); margin-top: 3px; }
  .fm-repo-card-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #F3F4F6; }
  .fm-repo-downloads { font-size: 11.5px; color: var(--muted); }
  .fm-repo-actions { display: flex; gap: 6px; }
  .fm-icon-btn {
    width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
    background: var(--white); cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: var(--muted); transition: all 0.13s;
  }
  .fm-icon-btn:hover { border-color: var(--maroon); color: var(--maroon); background: #FEF2F2; }
  .fm-icon-btn.danger:hover { border-color: #EF4444; color: #EF4444; background: #FEF2F2; }

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
  .fm-modal-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; cursor: pointer; font-size: 13.5px; font-weight: 700; font-family: var(--font); transition: background 0.13s; }
  .fm-modal-btn-approve { background: #D1FAE5; color: #065F46; }
  .fm-modal-btn-approve:hover { background: #A7F3D0; }
  .fm-modal-btn-reject  { background: #FEE2E2; color: #991B1B; }
  .fm-modal-btn-reject:hover  { background: #FECACA; }
  .fm-upload-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 32px; text-align: center; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .fm-upload-zone:hover { border-color: var(--green); background: #F0FDF4; }
  .fm-upload-zone-text { font-size: 13px; color: var(--muted); margin-top: 8px; }
  .fm-upload-zone-sub  { font-size: 11.5px; color: var(--light); margin-top: 4px; }
`;

export default function FormsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState<FormTab>("repository");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"All" | FormStatus>("All");
  const [typeFilter, setTypeFilter]       = useState<"All" | FormType>("All");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showTypeDrop, setShowTypeDrop]         = useState(false);
  const [showSectionDrop, setShowSectionDrop]   = useState(false);
  const [sectionFilter, setSectionFilter]       = useState("All");
  const [currentPage, setCurrentPage]           = useState(1);
  const [pageSize, setPageSize]                 = useState(5);
  const [selected, setSelected]                 = useState<FormEntry | null>(null);
  const [showUpload, setShowUpload]             = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [initials, setInitials] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const sections = ["All", ...Array.from(new Set(formEntries.map(f => f.section)))];

  async function handleSignOut() {
    await signOutWithAudit();
    router.push("/");
    router.refresh();
  }

  const filteredSubmissions = formEntries.filter((f) => {
    const q = search.trim().toLowerCase();
    const matchSearch  = !q || f.studentName.toLowerCase().includes(q) || f.studentNo.includes(q);
    const matchStatus  = statusFilter === "All"  || f.status === statusFilter;
    const matchType    = typeFilter === "All"    || f.type === typeFilter;
    const matchSection = sectionFilter === "All" || f.section === sectionFilter;
    return matchSearch && matchStatus && matchType && matchSection;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const paginated  = filteredSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const statCards = submissionStatCards(formEntries);

  return (
    <>
      <style>{formsStyles}</style>
      <ChartStyles />
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
            <header className="header">
              <h1 className="header-greeting">Forms</h1>
              <div className="search-bar">
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search student..."
                  aria-label="Search student"
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
              <div className="page-tabs">
                <button
                  className={`page-tab${activeTab === "repository" ? " page-tab-active" : ""}`}
                  onClick={() => setActiveTab("repository")}
                >
                  <IconFolder size={16} stroke={1.75} /> Repository
                </button>
                <button
                  className={`page-tab${activeTab === "submissions" ? " page-tab-active" : ""}`}
                  onClick={() => setActiveTab("submissions")}
                >
                  <IconInbox size={16} stroke={1.75} /> Submission Bin
                </button>
              </div>

              {activeTab === "repository" && (
                <div className="fm-body">
                  <div className="adv-table-card">
                    <div className="adv-table-toolbar">
                      <div>
                        <div className="adv-table-title">All Forms</div>
                        <div className="adv-table-count">Official NSTP Documents</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                        <div className="adv-search-bar">
                          <IconSearch size={16} stroke={1.75} color="var(--muted)" />
                          <input className="adv-search-input" placeholder="Search forms..." />
                        </div>
                        <button className="fm-upload-btn" onClick={() => setShowUpload(true)}>
                          <IconPlus size={15} stroke={2.5} /> Upload Form
                        </button>
                      </div>
                    </div>

                    <div className="fm-repo-grid">
                      {repoForms.map((f) => {
                        const tc = typeConfig[f.type];
                        return (
                          <div key={f.id} className="fm-repo-card">
                            <div className="fm-repo-card-top">
                              <div className="fm-repo-icon" style={{ background: tc.bg }}>
                                <IconFile size={22} stroke={1.5} color={tc.color} />
                              </div>
                              <div>
                                <div className="fm-repo-name">{f.name}</div>
                                <div className="fm-repo-meta">{f.fileSize} · Uploaded {f.uploadedDate}</div>
                                <span className="adv-badge" style={{ background: tc.bg, color: tc.color, marginTop: 6, display: "inline-block" }}>
                                  {f.type}
                                </span>
                              </div>
                            </div>
                            <div className="fm-repo-card-bottom">
                              <span className="fm-repo-downloads">{f.downloads} downloads</span>
                              <div className="fm-repo-actions">
                                <button className="fm-icon-btn" title="Download"><IconDownload size={14} stroke={1.75} /></button>
                                <button className="fm-icon-btn danger" title="Delete"><IconTrash size={14} stroke={1.75} /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "submissions" && (
                <>
                  <div className="stat-cards">
                    {statCards.map(({ label, value, Icon, filter }) => (
                      <button
                        key={label}
                        className="db-kpi-card db-kpi-card--interactive"
                        onClick={() => { setStatusFilter(filter); setCurrentPage(1); }}
                        aria-label={`${label}: ${value}`}
                      >
                        <div className="db-kpi-header">
                          <span className="db-kpi-label">{label}</span>
                        </div>
                        <div className="db-kpi-value">{value}</div>
                        <div className="db-kpi-deco">
                          <Icon size={110} stroke={1.2} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="fm-body">
                    <div className="adv-table-card">
                      <div className="adv-table-toolbar">
                        <div>
                          <div className="adv-table-title">All Submissions</div>
                          <div className="adv-table-count">{filteredSubmissions.length} form{filteredSubmissions.length !== 1 ? "s" : ""} found</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                          <div className="adv-search-bar">
                            <IconSearch size={16} stroke={1.75} color="var(--muted)" />
                            <input className="adv-search-input" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search student..." />
                          </div>

                          {/* Status filter */}
                          <div style={{ position: "relative" }}>
                            <button className="adv-filter-btn" onClick={() => { setShowStatusDrop(v => !v); setShowTypeDrop(false); }}>
                              <IconFilter size={13} stroke={2} />
                              {statusFilter === "All" ? "All Status" : statusFilter}
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                            {showStatusDrop && (
                              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, minWidth: 180, overflow: "hidden" }}>
                                {(["All", "Submitted", "Not Yet Submitted"] as const).map((opt) => (
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
                            <button className="adv-filter-btn" onClick={() => { setShowTypeDrop(v => !v); setShowStatusDrop(false); }}>
                              <IconClipboardText size={13} stroke={2} />
                              {typeFilter === "All" ? "All Types" : typeFilter}
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                            {showTypeDrop && (
                              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, minWidth: 210, overflow: "hidden" }}>
                                {(["All", "Daily Time Record", "Accomplishment Report", "Attendance Sheet", "Incident Report"] as const).map((opt) => (
                                  <button key={opt} onClick={() => { setTypeFilter(opt); setShowTypeDrop(false); setCurrentPage(1); }}
                                    style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", background: typeFilter === opt ? "#F9FAFB" : "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)", fontWeight: typeFilter === opt ? 700 : 400, color: typeFilter === opt ? "var(--maroon)" : "var(--text)" }}>
                                    {opt === "All" ? "All Types" : opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Section filter */}
                          <div style={{ position: "relative" }}>
                            <button className="adv-filter-btn" onClick={() => { setShowSectionDrop(v => !v); setShowStatusDrop(false); setShowTypeDrop(false); }}>
                              <IconFilter size={13} stroke={2} />
                              {sectionFilter === "All" ? "All Sections" : sectionFilter}
                              <IconChevronDown size={13} stroke={2} />
                            </button>
                            {showSectionDrop && (
                              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50, minWidth: 160, overflow: "hidden" }}>
                                {sections.map((opt) => (
                                  <button key={opt} onClick={() => { setSectionFilter(opt); setShowSectionDrop(false); setCurrentPage(1); }}
                                    style={{ display: "block", width: "100%", padding: "9px 16px", textAlign: "left", background: sectionFilter === opt ? "#F9FAFB" : "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)", fontWeight: sectionFilter === opt ? 700 : 400, color: sectionFilter === opt ? "var(--maroon)" : "var(--text)" }}>
                                    {opt === "All" ? "All Sections" : opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="adv-table-wrapper">
                        <table className="adv-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Section</th>
                              <th>Form Type</th>
                              <th>Date Submitted</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSubmissions.length === 0 ? (
                              <tr><td colSpan={5} className="adv-empty">No forms match your search.</td></tr>
                            ) : paginated.map((f) => (
                              <tr key={f.id} onClick={() => setSelected(f)}>
                                <td>
                                  <div className="fm-student-name">{f.studentName}</div>
                                  <div className="fm-student-no">{f.studentNo}</div>
                                </td>
                                <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{f.section}</td>
                                <td>
                                  <span className="adv-badge" style={{ background: typeConfig[f.type].bg, color: typeConfig[f.type].color }}>{f.type}</span>
                                </td>
                                <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{f.submittedDate}</td>
                                <td>
                                  <span className="adv-badge" style={{ background: statusConfig[f.status].bg, color: statusConfig[f.status].color }}>{f.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="adv-pagination">
                        <div className="adv-pagination-info">
                          Showing {filteredSubmissions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredSubmissions.length)} of {filteredSubmissions.length}
                        </div>
                        <div className="adv-pagination-controls">
                          <button className="adv-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&#8249;</button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button key={p} className={`adv-page-btn${p === currentPage ? " adv-page-btn-active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                          ))}
                          <button className="adv-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&#8250;</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                          <span>Rows per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            style={{ border: "1.5px solid var(--border)", borderRadius: 10, padding: "4px 8px", fontSize: 12.5, fontFamily: "var(--font)", color: "var(--text)", background: "var(--white)", cursor: "pointer", outline: "none", appearance: "auto" }}
                          >
                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        {/* Submission detail modal */}
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
                    <span className="adv-badge" style={{ background: statusConfig[selected.status].bg, color: statusConfig[selected.status].color }}>{selected.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload modal */}
        {showUpload && (
          <div className="fm-modal-backdrop" onClick={() => setShowUpload(false)}>
            <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="fm-modal-header">
                <div className="fm-modal-title">Upload Form Template</div>
                <button className="fm-modal-close" onClick={() => setShowUpload(false)}><IconX size={18} stroke={1.75} /></button>
              </div>
              <div className="fm-modal-body">
                <div>
                  <div className="fm-modal-label">Form Type</div>
                  <select style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "var(--font)", color: "var(--text)", background: "var(--white)", outline: "none", marginTop: 4 }}>
                    <option>Daily Time Record</option>
                    <option>Accomplishment Report</option>
                    <option>Attendance Sheet</option>
                    <option>Incident Report</option>
                  </select>
                </div>
                <div>
                  <div className="fm-modal-label">File</div>
                  <div className="fm-upload-zone" onClick={() => fileInputRef.current?.click()}>
                    <IconUpload size={28} stroke={1.5} color="var(--muted)" />
                    <div className="fm-upload-zone-text">Click to browse or drag & drop</div>
                    <div className="fm-upload-zone-sub">PDF, DOCX, XLSX up to 10 MB</div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display: "none" }} />
                  </div>
                </div>
              </div>
              <div className="fm-modal-actions">
                <button className="fm-modal-btn" style={{ background: "#F3F4F6", color: "var(--text)" }} onClick={() => setShowUpload(false)}>Cancel</button>
                <button className="fm-modal-btn fm-modal-btn-approve">Upload</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}