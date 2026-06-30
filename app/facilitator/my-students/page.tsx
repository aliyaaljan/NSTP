"use client";

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation";
import {
  IconSearch, IconChevronDown,
  IconUsers, IconCircleCheck, IconClock,
  IconAlertCircle, IconX, IconPaperclip,
} from "@tabler/icons-react";
import { Sidebar, dashboardStyles, navRoutes } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions"
import { ChartStyles } from "@/components/shared/ChartModule"
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/client";

// ── Data ──────────────────────────────────────────────────────────────
type Status = "Completed" | "In Progress" | "Not Started";

interface Student {
  id: string;
  name: string;
  studentNo: string;
  siteLocation: string;
  status: Status;
  hoursLogged: number;
  totalHours: number;
}

type RequestType = "Absence Excuse" | "Hour Adjustment" | "Schedule Change";

interface PendingRequest {
  id: string;
  name: string;
  studentNo: string;
  section: string;
  type: RequestType;
  dateSubmitted: string;
  hasAttachment: boolean;
  note: string;
}

const pendingRequests: PendingRequest[] = [
  { id: "p1", name: "Rhona Shayne Lopez",      studentNo: "20201234", section: "NSTP-H", type: "Absence Excuse",        dateSubmitted: "Jun 18, 2025", hasAttachment: true,  note: "Was sick during the community service day. Medical certificate attached." },
  { id: "p2", name: "Jaerish Kyle Rabang",     studentNo: "20123421", section: "NSTP-H", type: "Hour Adjustment",       dateSubmitted: "Jun 17, 2025", hasAttachment: false, note: "Requesting correction of logged hours from 4hrs to 6hrs on June 10." },
  { id: "p3", name: "Saffi Limbaro",           studentNo: "20198765", section: "NSTP-H", type: "Schedule Change",       dateSubmitted: "Jun 16, 2025", hasAttachment: false, note: "Requesting to reschedule missed session to the following week." },
  { id: "p4", name: "Aliya Aljan Mendoza",     studentNo: "20152314", section: "NSTP-H", type: "Schedule Change",       dateSubmitted: "Jun 15, 2025", hasAttachment: false, note: "Requesting to move Saturday slot to Sunday due to work conflict." },
  { id: "p5", name: "Charles Ansbert Joaquin", studentNo: "20201111", section: "NSTP-H", type: "Absence Excuse",        dateSubmitted: "Jun 14, 2025", hasAttachment: true,  note: "Missed session due to university event. Proof of participation attached." },
  { id: "p6", name: "Axel Xandrei Valido",     studentNo: "20203333", section: "NSTP-H", type: "Absence Excuse",        dateSubmitted: "Jun 13, 2025", hasAttachment: true,  note: "Family emergency on June 11. Supporting documents attached." },
];

const allStudents: Student[] = [
  { id: "1",  name: "Rhona Shayne Lopez",      studentNo: "20201234", siteLocation: "Salud Mitra",    status: "In Progress",  hoursLogged: 105, totalHours: 120 },
  { id: "2",  name: "Jaerish Kyle Rabang",     studentNo: "20123421", siteLocation: "Burnham Park",   status: "Completed",    hoursLogged: 120, totalHours: 120 },
  { id: "3",  name: "Aliya Aljan Mendoza",     studentNo: "20152314", siteLocation: "Engineers Hill", status: "Not Started",  hoursLogged: 0,   totalHours: 120 },
  { id: "4",  name: "Saffi Limbaro",           studentNo: "20198765", siteLocation: "Burnham Park",   status: "In Progress",  hoursLogged: 60,  totalHours: 120 },
  { id: "5",  name: "Charles Ansbert Joaquin", studentNo: "20201111", siteLocation: "Salud Mitra",    status: "Completed",    hoursLogged: 120, totalHours: 120 },
  { id: "6",  name: "Axel Xandrei Valido",     studentNo: "20203333", siteLocation: "Engineers Hill", status: "In Progress",  hoursLogged: 55,  totalHours: 120 },
  { id: "7",  name: "Janine Irish Tulic",      studentNo: "20204444", siteLocation: "Salud Mitra",    status: "Not Started",  hoursLogged: 0,   totalHours: 120 },
  { id: "8",  name: "Marco Dela Cruz",         studentNo: "20205555", siteLocation: "Burnham Park",   status: "In Progress",  hoursLogged: 98,  totalHours: 120 },
  { id: "9",  name: "Patricia Santos",         studentNo: "20206666", siteLocation: "Engineers Hill", status: "In Progress",  hoursLogged: 72,  totalHours: 120 },
  { id: "10", name: "Luis Miguel Reyes",       studentNo: "20207777", siteLocation: "Salud Mitra",    status: "Completed",    hoursLogged: 120, totalHours: 120 },
];

const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
  "Completed":   { bg: "#D1FAE5", color: "#065F46", label: "Completed"   },
  "In Progress": { bg: "#FEF3C7", color: "#92400E", label: "In Progress" },
  "Not Started": { bg: "#FEE2E2", color: "#991B1B", label: "Not Started" },
};

function progressColor(status: Status): string {
  if (status === "Completed")   return "#059669";
  if (status === "In Progress") return "#D97706";
  return "#EF4444";
}


type Tab = "list" | "pending";
type StatusFilter = "All Status" | Status;

const myStudentsStyles = `
  ${dashboardStyles}

  /* ── My Students extras ── */
  .ms-header-row { display: flex; align-items: center; gap: 16px; padding: 28px 28px 0; flex-shrink: 0; }
  .ms-title { font-size: 38px; font-weight: 800; color: var(--maroon); font-family: var(--font); flex: 1; }
  .ms-stat-cards { display: flex; gap: 12px; padding: 18px 28px 0; flex-shrink: 0; }

  /* Tabs */
  .ms-tabs { display: flex; gap: 0; padding: 20px 0 0; margin: 0 28px 0; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ms-tab {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; background: none; border: none;
    font-size: 14px; font-weight: 600; font-family: var(--font);
    color: var(--muted); cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.13s;
  }
  .ms-tab.ms-tab-active { color: var(--maroon); border-bottom-color: var(--maroon); }
  .ms-tab:hover:not(.ms-tab-active) { color: var(--text); }

  /* Table card */
  .ms-body { flex: 1; overflow: auto; padding: 20px 28px 28px; }
  .ms-table-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .ms-table-toolbar {
    display: flex; align-items: center;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .ms-table-title { font-weight: 700; font-size: 15px; }
  .ms-table-count { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .ms-toolbar-right { display: flex; align-items: center; gap: 10px; }
  .ms-search-bar {
    display: flex; align-items: center; gap: 8px;
    border: 1.5px solid var(--border); border-radius: 20px;
    padding: 6px 14px; min-width: 180px; background: var(--white);
    transition: border-color 0.15s;
  }
  .ms-search-bar:focus-within { border-color: var(--maroon); }
  .ms-search-input { border: none; outline: none; font-size: 13px; font-family: var(--font); color: var(--text); width: 100%; background: transparent; }
  .ms-search-input::placeholder { color: var(--light); }
  .ms-filter-btn {
    display: flex; align-items: center; gap: 6px;
    border: 1.5px solid var(--border); border-radius: 20px;
    padding: 6px 14px; background: var(--white); font-size: 13px;
    font-family: var(--font); font-weight: 500; cursor: pointer;
    color: var(--text); transition: border-color 0.13s;
  }
  .ms-filter-btn:hover { border-color: #9CA3AF; }

  /* Table */
  .ms-table-wrapper { overflow-y: auto; max-height: calc(100vh - 420px); scrollbar-width: none; }
  .ms-table-wrapper::-webkit-scrollbar { display: none; }
  .ms-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .ms-table thead tr { background: #F9FAFB; border-bottom: 1px solid var(--border); }
  .ms-table thead th { position: sticky; top: 0; z-index: 2; background: #F9FAFB; padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--maroon); letter-spacing: 0.8px; text-transform: uppercase; }
  .ms-table th:nth-child(1) { width: 30%; }
  .ms-table th:nth-child(2) { width: 22%; }
  .ms-table th:nth-child(3) { width: 22%; }
  .ms-table th:nth-child(4) { width: 26%; }
  .ms-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; min-width: 110px; text-align: center; }
  .ms-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
  .ms-table tbody tr:last-child td { border-bottom: none; }
  .ms-table tbody tr { cursor: pointer; }
  .ms-table tbody tr:hover td { background: #FAFAFA; }
  .ms-student-name { font-size: 13.5px; font-weight: 600; color: var(--text); }
  .ms-student-no   { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .ms-site-badge {
    display: inline-block; padding: 3px 10px;
    background: #F3F4F6; border-radius: 20px;
    font-size: 12px; font-weight: 500; color: var(--muted);
  }
  .ms-hours-cell { min-width: 160px; }
  .ms-hours-label { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); margin-bottom: 4px; }
  .ms-hours-track { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .ms-hours-fill  { height: 100%; border-radius: 4px; transition: width 0.35s ease; }
  /* Empty / pending */
  .ms-empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }

  /* Pending Requests */
  .ms-requests-toolbar {
    display: flex; align-items: center;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .ms-requests-list { display: flex; flex-direction: column; }
  .ms-request-row {
    display: grid;
    grid-template-columns: 2.4fr 1.2fr 1fr 2fr 140px;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    border-bottom: 1px solid #F3F4F6;
    cursor: pointer;
    transition: background 0.12s;
  }
  .ms-request-row:last-child { border-bottom: none; }
  .ms-request-row:hover { background: #FAFAFA; }
  .ms-request-student { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .ms-request-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: #E5E7EB; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 700; color: #4B5563;
  }
  .ms-request-name  { font-size: 13.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ms-request-meta  { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
  .ms-request-type  { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; display: inline-block; }
  .ms-request-date  { font-size: 12px; color: var(--muted); white-space: nowrap; }
  .ms-request-note  { font-size: 12px; color: var(--muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ms-attachment-tag { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 11.5px; color: var(--muted); }

  .ms-requests-thead {
    display: grid;
    grid-template-columns: 2.4fr 1.2fr 1fr 2fr 140px;
    gap: 16px;
    padding: 10px 20px;
    background: #F9FAFB;
    border-bottom: 1px solid var(--border);
  }
  .ms-requests-thead span {
    font-size: 11px; font-weight: 700; color: var(--maroon);
    letter-spacing: 0.8px; text-transform: uppercase;
  }
  .ms-requests-thead span:last-child { text-align: center; }

  /* Request modal */
  .ms-req-modal-section { margin-bottom: 2px; }
  .ms-req-modal-note {
    font-size: 13px; color: var(--text); line-height: 1.6;
    background: #F9FAFB; border-radius: 10px; padding: 12px 14px;
    margin-top: 4px;
  }
  .ms-req-modal-attachment {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--maroon); font-weight: 600;
    background: #FEF2F2; border-radius: 10px; padding: 10px 14px;
    margin-top: 4px; cursor: pointer;
  }

  /* Pagination */
  .ms-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-top: 1px solid var(--border);
  }
  .ms-pagination-info { font-size: 12.5px; color: var(--muted); }
  .ms-pagination-controls { display: flex; align-items: center; gap: 4px; position: absolute; left: 50%; transform: translateX(-50%); }
  .ms-pagination { position: relative; }
  .ms-page-btn {
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--white);
    font-size: 13px; font-family: var(--font); font-weight: 500;
    color: var(--text); cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: background 0.12s, border-color 0.12s;
  }
  .ms-page-btn:hover:not(.ms-page-btn-active):not(:disabled) { background: #F9FAFB; border-color: #9CA3AF; }
  .ms-page-btn.ms-page-btn-active { background: var(--maroon); color: #fff; border-color: var(--maroon); font-weight: 700; }
  .ms-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .ms-page-btn-nav { width: 32px; height: 32px; }

  /* Modal */
  .ms-modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px); z-index: 100;
    display: flex; align-items: center; justify-content: center;
  }
  .ms-modal {
    background: var(--white); border-radius: 20px;
    width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
  }
  .ms-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px; border-bottom: 1px solid var(--border);
  }
  .ms-modal-title  { font-weight: 700; font-size: 16px; }
  .ms-modal-close  {
    background: none; border: none; cursor: pointer; color: var(--muted);
    display: flex; align-items: center; padding: 4px;
    border-radius: 6px; transition: background 0.12s;
  }
  .ms-modal-close:hover { background: var(--border); }
  .ms-modal-body   { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
  .ms-modal-row    { display: flex; gap: 12px; }
  .ms-modal-field  { flex: 1; }
  .ms-modal-label  { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .ms-modal-value  { font-size: 14px; font-weight: 600; color: var(--text); }
  .ms-modal-progress { margin-top: 4px; }
`;

function MyStudentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeTab, setActiveTab]         = useState<Tab>("list");
  const [headerSearch, setHeaderSearch]   = useState("");
  const [tableSearch, setTableSearch]     = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("All Status");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showFilter, setShowFilter]       = useState(false);
  const [currentPage, setCurrentPage]     = useState(1);
  const [pageSize, setPageSize]           = useState(5);
  const [pendingSearch, setPendingSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<"All Types" | RequestType>("All Types");
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "pending" || tab === "list") {
      setActiveTab(tab)
    }
  }, [searchParams])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [selectedSection, setSelectedSection] = useState("All Sections")
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const [statData, setStatData] = useState<{section_id: string; section_name: string; total: number; completed: number; in_progress: number; pending_request: number;}[]>([])
  const [animKey, setAnimKey] = useState(0)
  const [sectionKey, setSectionKey] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      // Get first name & last name
      const full: string = user?.user_metadata?.full_name ?? ""
      const parts = full.trim().split(" ")
      const fName = parts[0] ?? ""
      const lName = parts.at(-1) ?? ""
      setFirstName(fName)
      setLastName(lName)
      setInitials((fName[0] ?? "") + (lName[0] ?? ""))

      const [
        { data: statData, error: statError },
        { data: sectionData, error: sectionError },
        { data: semData, error: semError },
      ] = await Promise.all([
        supabase.rpc("get_students_stats", { p_adviser_user_id: user?.id }),
        supabase.rpc("get_sections", { p_adviser_user_id: user?.id }),
        supabase.rpc("get_active_sem", { p_adviser_user_id: user?.id }),
      ])

      if (statError) console.error("get_students_stats error:", statError.message, statError.details)
      if (statData) setStatData(statData)

      if (sectionError) console.error("get_sections error:", sectionError.message, sectionError.details)
      if (sectionData && statData) {
        const mappedSection = statData.map((r: { section_id: string | null; section_name: string }) => ({
          id: r.section_id ?? "all",
          name: r.section_name,
        }))
        const sortedSection = [...mappedSection].sort((a, b) => {
          if (a.name === "All Sections") return -1
          if (b.name === "All Sections") return 1
          return a.name.localeCompare(b.name)
        })
        setSections(sortedSection)
      }

      if (semError) console.error("get_active_sem error:", semError.message, semError.details)
    })
  }, [])

  const currentData = statData.find((r) => r.section_name === selectedSection)
  if (!currentData) return null

  // const currentSemData = selectedSection === "All Sections" ? activeSemData.slice().sort((a, b) => new Date(a.sem_end_date).getTime() - new Date(b.sem_end_date).getTime())[0] : activeSemData.find((r) => r.section_name === selectedSection)


  function buildStatCards(students: Student[]) {
    const completed  = students.filter(s => s.status === "Completed").length;
    const inProgress = students.filter(s => s.status === "In Progress").length;
    const pending    = pendingRequests.length;
    return [
      { label: "Total Students",   value: currentData?.total, Icon: IconUsers},
      { label: "Completed",        value: currentData?.completed, Icon: IconCircleCheck},
      { label: "In Progress",      value: currentData?.in_progress, Icon: IconClock},
      { label: "Pending Requests", value: currentData?.pending_request, Icon: IconAlertCircle},
    ];
  }

  const filtered = allStudents.filter((s) => {
    const q = (headerSearch || tableSearch).trim().toLowerCase();
    const matchSearch = q === "" ||
      s.name.toLowerCase().includes(q) ||
      s.studentNo.includes(q);
    const matchStatus = statusFilter === "All Status" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPending = pendingRequests.filter((r) => {
    const matchSearch = pendingSearch.trim() === "" || r.name.toLowerCase().includes(pendingSearch.toLowerCase());
    const matchType = requestTypeFilter === "All Types" || r.type === requestTypeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusOptions: StatusFilter[] = ["All Status", "Completed", "In Progress", "Not Started"];
  const statCards = buildStatCards(allStudents);

  async function handleSignOut() {
    await signOutWithAudit();
    router.push("/");
    router.refresh();
  }

  function requestTypeStyle(type: RequestType): { bg: string; color: string } {
    const map: Record<RequestType, { bg: string; color: string }> = {
      "Absence Excuse":  { bg: "#FEF3C7", color: "#92400E" },
      "Hour Adjustment": { bg: "#DBEAFE", color: "#1E40AF" },
      "Schedule Change": { bg: "#FCE7F3", color: "#9D174D" },
    };
    return map[type];
  }

  return (
    <>
      <style>{myStudentsStyles}</style>
      <ChartStyles />

      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="My Students"
          onToggle={() => { setSidebarOpen((o) => !o); setShowFilter(false); setShowTypeFilter(false); }}
          onNavClick={(label) => { setSidebarOpen(false); router.push(navRoutes[label]); }}
          onSignOut={handleSignOut}
        />

        {sidebarOpen && (
          <div className="sb-overlay" onClick={() => { setSidebarOpen(false); setShowFilter(false); setShowTypeFilter(false); }} aria-hidden="true" />
        )}

        <div className="main-wrapper">
          <main className="main">

            {/* Header */}
            <div className="ms-header-row">
              <h1 className="ms-title">My Students</h1>
              {/* <div className="search-bar" style={{ minWidth: 200 }}>
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input"
                  value={headerSearch}
                  onChange={(e) => { setHeaderSearch(e.target.value); setTableSearch(""); setCurrentPage(1); }}
                  placeholder="Search students..."
                  aria-label="Search students"
                />
              </div> */}
              <div className="profile-pill">
                <div className="profile-avatar">{initials}</div>
                <div>
                  <div className="profile-name">{lastName}, {firstName}</div>
                </div>
              </div>
            </div>

            {/* Sections filter */}
            <div style={{ position: "relative", padding: "12px 28px 0" }}>
              <div onMouseLeave={() => setSectionDropdownOpen(false)}>
                <button
                  className="sections-btn"
                  onClick={() => setSectionDropdownOpen((o) => !o)}
                >
                  {selectedSection} <IconChevronDown size={13} stroke={2} />
                </button>

                {sectionDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      // top: "100%",
                      // right: 0,
                      paddingTop: 6,
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        background: "var(--white)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        boxShadow: "var(--shadow)",
                        minWidth: 160,
                        overflow: "hidden",
                      }}
                      >
                        {sections.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedSection(s.name)
                              setSectionDropdownOpen(false)
                              setCurrentPage(1)
                              setAnimKey((k) => k + 1)
                              setSectionKey((k) => k + 1)
                            }}
                            className={`block w-full px-4 py-2.25 text-left text-[13px] cursor-pointer border-none font-sans hover:bg-green/30 ${
                              s.name === selectedSection ? "font-semibold bg-green text-white" : "font-normal text-text"
                            }`}
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* Stat cards */}
            <div className="ms-stat-cards">
              {statCards.map(({ label, value, Icon }) => (
                <div key={label} className="db-kpi-card">
                  <div className="db-kpi-header">
                    <span className="db-kpi-label">{label}</span>
                  </div>
                  <div className="db-kpi-value">{value}</div>
                  <div className="db-kpi-deco">
                    <Icon size={110} stroke={1.2} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="ms-tabs">
              <button
                className={`ms-tab${activeTab === "list" ? " ms-tab-active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                <IconUsers size={16} stroke={1.75} />
                List of Students
              </button>
              <button
                className={`ms-tab${activeTab === "pending" ? " ms-tab-active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                <IconAlertCircle size={16} stroke={1.75} />
                Pending Requests
              </button>
            </div>

            {/* Body */}
            <div className="ms-body">
              {activeTab === "list" ? (
                <div className="ms-table-card">
                  <div className="ms-table-toolbar">
                    <div>
                      <div className="ms-table-title">All Students</div>
                      <div className="ms-table-count">{filtered.length} student{filtered.length !== 1 ? "s" : ""} found</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 24 }}>
                      <div className="ms-search-bar">
                        <IconSearch size={13} stroke={1.75} color="var(--light)" />
                        <input
                          className="ms-search-input"
                          value={tableSearch}
                          onChange={(e) => { setTableSearch(e.target.value); setHeaderSearch(""); setCurrentPage(1); }}
                          placeholder="Search..."
                        />
                      </div>
                      <div style={{ position: "relative" }}>
                        <button className="ms-filter-btn" onClick={() => setShowFilter((v) => !v)}>
                          {statusFilter} <IconChevronDown size={13} stroke={2} />
                        </button>
                        {showFilter && (
                          <div style={{
                            position: "absolute", top: "calc(100% + 6px)", left: 0,
                            background: "var(--white)", border: "1px solid var(--border)",
                            borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50,
                            minWidth: 160, overflow: "hidden",
                          }}>
                            {statusOptions.map((opt) => (
                              <button key={opt} onClick={() => { setStatusFilter(opt); setShowFilter(false); setCurrentPage(1); }}
                                style={{
                                  display: "block", width: "100%", padding: "9px 16px",
                                  textAlign: "left", background: statusFilter === opt ? "#F9FAFB" : "none",
                                  border: "none", cursor: "pointer", fontSize: 13,
                                  fontFamily: "var(--font)", fontWeight: statusFilter === opt ? 700 : 400,
                                  color: statusFilter === opt ? "var(--maroon)" : "var(--text)",
                                }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ms-table-wrapper"><table className="ms-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Site Location</th>
                        <th>Status</th>
                        <th>Hours Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="ms-empty">No students match your search.</td>
                        </tr>
                      ) : paginated.map((s) => {
                        const pct = Math.round((s.hoursLogged / s.totalHours) * 100);
                        const cfg = statusConfig[s.status];
                        return (
                          <tr key={s.id} onClick={() => setSelectedStudent(s)}>
                            <td>
                              <div className="ms-student-name">{s.name}</div>
                              <div className="ms-student-no">{s.studentNo}</div>
                            </td>
                            <td>
                              <span className="ms-site-badge">{s.siteLocation}</span>
                            </td>
                            <td>
                              <span className="ms-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="ms-hours-cell">
                              <div className="ms-hours-label">
                                <span>{s.hoursLogged}/{s.totalHours} hrs</span>
                              </div>
                              <div className="ms-hours-track">
                                <div className="ms-hours-fill" style={{ width: `${pct}%`, background: progressColor(s.status) }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table></div>

                  {/* Pagination */}
                  <div className="ms-pagination">
                    <div className="ms-pagination-info">
                      Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} students
                    </div>
                    <div className="ms-pagination-controls">
                      <button
                        className="ms-page-btn ms-page-btn-nav"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        &#8249;
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`ms-page-btn${p === currentPage ? " ms-page-btn-active" : ""}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="ms-page-btn ms-page-btn-nav"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        &#8250;
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        style={{
                          border: "1.5px solid var(--border)", borderRadius: 8,
                          padding: "4px 8px", fontSize: 12.5, fontFamily: "var(--font)",
                          color: "var(--text)", background: "var(--white)", cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ms-table-card">
                  <div className="ms-requests-toolbar">
                    <div>
                      <div className="ms-table-title">All Requests</div>
                      <div className="ms-table-count">{filteredPending.length} request{filteredPending.length !== 1 ? "s" : ""} found</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 24 }}>
                      <div className="ms-search-bar" style={{ minWidth: 180 }}>
                        <IconSearch size={13} stroke={1.75} color="var(--light)" />
                        <input
                          className="ms-search-input"
                          value={pendingSearch}
                          onChange={(e) => setPendingSearch(e.target.value)}
                          placeholder="Search..."
                        />
                      </div>
                      <div style={{ position: "relative" }}>
                        <button className="ms-filter-btn" onClick={() => setShowTypeFilter((v) => !v)}>
                          {requestTypeFilter} <IconChevronDown size={13} stroke={2} />
                        </button>
                        {showTypeFilter && (
                          <div style={{
                            position: "absolute", top: "calc(100% + 6px)", left: 0,
                            background: "var(--white)", border: "1px solid var(--border)",
                            borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50,
                            minWidth: 170, overflow: "hidden",
                          }}>
                            {(["All Types", "Absence Excuse", "Hour Adjustment", "Schedule Change"] as const).map((opt) => (
                              <button key={opt} onClick={() => { setRequestTypeFilter(opt); setShowTypeFilter(false); }}
                                style={{
                                  display: "block", width: "100%", padding: "9px 16px",
                                  textAlign: "left", background: requestTypeFilter === opt ? "#F9FAFB" : "none",
                                  border: "none", cursor: "pointer", fontSize: 13,
                                  fontFamily: "var(--font)", fontWeight: requestTypeFilter === opt ? 700 : 400,
                                  color: requestTypeFilter === opt ? "var(--maroon)" : "var(--text)",
                                }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {filteredPending.length === 0 ? (
                    <div className="ms-empty">No pending requests found.</div>
                  ) : (
                    <>
                      <div className="ms-requests-thead">
                        <span>Student</span>
                        <span>Type</span>
                        <span>Date</span>
                        <span>Note</span>
                        <span>Attachment</span>
                      </div>
                      <div className="ms-requests-list">
                        {filteredPending.map((r) => {
                          const typeStyle = requestTypeStyle(r.type);
                          const initials = r.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                          return (
                            <div key={r.id} className="ms-request-row" onClick={() => setSelectedRequest(r)}>
                              <div className="ms-request-student">
                                <div className="ms-request-avatar">{initials}</div>
                                <div>
                                  <div className="ms-request-name">{r.name}</div>
                                  <div className="ms-request-meta">{r.studentNo} · {r.section}</div>
                                </div>
                              </div>
                              <div>
                                <span className="ms-request-type" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                                  {r.type}
                                </span>
                              </div>
                              <div className="ms-request-date">{r.dateSubmitted}</div>
                              <div className="ms-request-note">{r.note}</div>
                              <div className="ms-attachment-tag">
                                {r.hasAttachment ? (
                                  <><IconPaperclip size={13} stroke={1.75} /> 1 file</>
                                ) : (
                                  <span style={{ opacity: 0.35 }}>—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Student detail modal */}
        {selectedStudent && (
          <div className="ms-modal-backdrop" onClick={() => setSelectedStudent(null)}>
            <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ms-modal-header">
                <div className="ms-modal-title">{selectedStudent.name}</div>
                <button className="ms-modal-close" onClick={() => setSelectedStudent(null)}>
                  <IconX size={18} stroke={1.75} />
                </button>
              </div>
              <div className="ms-modal-body">
                <div className="ms-modal-row">
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Student No.</div>
                    <div className="ms-modal-value">{selectedStudent.studentNo}</div>
                  </div>
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Site Location</div>
                    <div className="ms-modal-value">{selectedStudent.siteLocation}</div>
                  </div>
                </div>
                <div className="ms-modal-row">
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Status</div>
                    <span className="ms-status-badge" style={{
                      background: statusConfig[selectedStudent.status].bg,
                      color: statusConfig[selectedStudent.status].color,
                    }}>
                      {statusConfig[selectedStudent.status].label}
                    </span>
                  </div>
                  <div className="ms-modal-field">
                    <div className="ms-modal-label">Hours Logged</div>
                    <div className="ms-modal-value">
                      {selectedStudent.hoursLogged} / {selectedStudent.totalHours} hrs
                    </div>
                  </div>
                </div>
                <div className="ms-modal-field ms-modal-progress">
                  <div className="ms-modal-label">Progress</div>
                  <div className="ms-hours-label" style={{ marginTop: 6 }}>
                    <span>{selectedStudent.hoursLogged} / {selectedStudent.totalHours} hrs</span>
                    <span>{Math.round((selectedStudent.hoursLogged / selectedStudent.totalHours) * 100)}%</span>
                  </div>
                  <div className="ms-hours-track">
                    <div className="ms-hours-fill" style={{
                      width: `${Math.round((selectedStudent.hoursLogged / selectedStudent.totalHours) * 100)}%`,
                      background: progressColor(selectedStudent.status),
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Request detail modal */}
        {selectedRequest && (
          <div className="ms-modal-backdrop" onClick={() => setSelectedRequest(null)}>
            <div className="ms-modal ms-req-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ms-modal-header">
                <div>
                  <div className="ms-modal-title">{selectedRequest.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {selectedRequest.studentNo} · {selectedRequest.section}
                  </div>
                </div>
                <button className="ms-modal-close" onClick={() => setSelectedRequest(null)}>
                  <IconX size={18} stroke={1.75} />
                </button>
              </div>
              <div className="ms-modal-body">
                <div className="ms-modal-row">
                  <div className="ms-modal-field ms-req-modal-section">
                    <div className="ms-modal-label">Request Type</div>
                    <span className="ms-request-type" style={{
                      background: requestTypeStyle(selectedRequest.type).bg,
                      color: requestTypeStyle(selectedRequest.type).color,
                      padding: "4px 12px",
                    }}>
                      {selectedRequest.type}
                    </span>
                  </div>
                  <div className="ms-modal-field ms-req-modal-section">
                    <div className="ms-modal-label">Date Submitted</div>
                    <div className="ms-modal-value">{selectedRequest.dateSubmitted}</div>
                  </div>
                </div>
                <div className="ms-req-modal-section">
                  <div className="ms-modal-label">Note</div>
                  <div className="ms-req-modal-note">{selectedRequest.note}</div>
                </div>
                {selectedRequest.hasAttachment && (
                  <div className="ms-req-modal-section">
                    <div className="ms-modal-label">Attachment</div>
                    <div className="ms-req-modal-attachment">
                      <IconPaperclip size={16} stroke={1.75} />
                      View attached document
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default function MyStudentsPage() {
  return (
    <Suspense>
      <MyStudentsContent />
    </Suspense>
  );
}