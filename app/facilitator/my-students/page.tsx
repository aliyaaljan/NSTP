"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation";
import {
  IconSearch, IconQrcode, IconChevronDown,
  IconUsersGroup, IconCircleCheck, IconClock,
  IconAlertCircle, IconEye, IconX, IconClipboardText, IconPaperclip,
} from "@tabler/icons-react";
import { Sidebar, QrScanner, dashboardStyles, navRoutes } from "../facilitator";
import { signOutWithAudit } from "@/lib/auth-actions"
import { useSearchParams } from "next/navigation";

// ── Data ──────────────────────────────────────────────────────────────
type Status = "Completed" | "Near Completion" | "In Progress" | "Not Started";

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
  { id: "1",  name: "Rhona Shayne Lopez",      studentNo: "20201234", siteLocation: "Salud Mitra",    status: "Near Completion", hoursLogged: 105, totalHours: 120 },
  { id: "2",  name: "Jaerish Kyle Rabang",     studentNo: "20123421", siteLocation: "Burnham Park",   status: "Completed",       hoursLogged: 120, totalHours: 120 },
  { id: "3",  name: "Aliya Aljan Mendoza",     studentNo: "20152314", siteLocation: "Engineers Hill", status: "Not Started",     hoursLogged: 0,   totalHours: 120 },
  { id: "4",  name: "Saffi Limbaro",           studentNo: "20198765", siteLocation: "Burnham Park",   status: "In Progress",     hoursLogged: 60,  totalHours: 120 },
  { id: "5",  name: "Charles Ansbert Joaquin", studentNo: "20201111", siteLocation: "Salud Mitra",    status: "Completed",       hoursLogged: 120, totalHours: 120 },
  { id: "6",  name: "Axel Xandrei Valido",     studentNo: "20203333", siteLocation: "Engineers Hill", status: "In Progress",     hoursLogged: 55,  totalHours: 120 },
  { id: "7",  name: "Janine Irish Tulic",      studentNo: "20204444", siteLocation: "Salud Mitra",    status: "Not Started",     hoursLogged: 0,   totalHours: 120 },
  { id: "8",  name: "Marco Dela Cruz",         studentNo: "20205555", siteLocation: "Burnham Park",   status: "Near Completion", hoursLogged: 98,  totalHours: 120 },
  { id: "9",  name: "Patricia Santos",         studentNo: "20206666", siteLocation: "Engineers Hill", status: "In Progress",     hoursLogged: 72,  totalHours: 120 },
  { id: "10", name: "Luis Miguel Reyes",       studentNo: "20207777", siteLocation: "Salud Mitra",    status: "Completed",       hoursLogged: 120, totalHours: 120 },
];

const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
  "Completed":       { bg: "#D1FAE5", color: "#065F46", label: "Completed"       },
  "Near Completion": { bg: "#FEF3C7", color: "#92400E", label: "Near Completion" },
  "In Progress":     { bg: "#DBEAFE", color: "#1E40AF", label: "In Progress"     },
  "Not Started":     { bg: "#F3E8FF", color: "#6B21A8", label: "Not Started"     },
};

function progressColor(status: Status): string {
  if (status === "Completed")       return "#1B4332";
  if (status === "Near Completion") return "#D97706";
  if (status === "In Progress")     return "#3B82F6";
  return "#E5E7EB";
}

const statCards = [
  { label: "Total Students",   value: 40, Icon: IconUsersGroup  },
  { label: "Completed",        value: 3,  Icon: IconCircleCheck },
  { label: "In Progress",      value: 10, Icon: IconClock       },
  { label: "Pending Requests", value: 14, Icon: IconAlertCircle },
];

type Tab = "list" | "pending";
type StatusFilter = "All Status" | Status;

const myStudentsStyles = `
  ${dashboardStyles}

  /* ── My Students extras ── */
  .ms-header-row { display: flex; align-items: center; gap: 16px; padding: 28px 28px 0; flex-shrink: 0; }
  .ms-title { font-size: 38px; font-weight: 800; color: var(--maroon); font-family: var(--font); flex: 1; }
  .ms-stat-cards { display: flex; gap: 12px; padding: 18px 28px 0; flex-shrink: 0; }
  .ms-stat-card { flex: 1; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); }
  .ms-stat-label { font-size: 11.5px; color: var(--muted); font-weight: 600; }
  .ms-stat-row   { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .ms-stat-icon  { color: var(--muted); display: flex; }
  .ms-stat-value { font-size: 28px; font-weight: 800; color: var(--text); line-height: 1; }

  /* Tabs */
  .ms-tabs { display: flex; gap: 0; padding: 20px 28px 0; border-bottom: 1px solid var(--border); flex-shrink: 0; margin: 0 0 0; }
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
    display: flex; align-items: center; justify-content: space-between;
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
  .ms-table th:nth-child(2) { width: 20%; }
  .ms-table th:nth-child(3) { width: 20%; }
  .ms-table th:nth-child(4) { width: 25%; }
  .ms-table th:nth-child(5) { width: 5%; }
  .ms-status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; width: 130px; text-align: center; cursor: pointer; transition: filter 0.15s, transform 0.15s; }
  .ms-status-badge:hover { filter: brightness(0.9); transform: scale(1.04); }
  .ms-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
  .ms-table tbody tr:last-child td { border-bottom: none; }
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
  .ms-view-btn {
    background: none; border: none; cursor: pointer;
    color: var(--muted); display: flex; align-items: center;
    padding: 4px; border-radius: 6px; transition: color 0.13s, background 0.13s;
  }
  .ms-view-btn:hover { color: var(--maroon); background: #FEF2F2; }

  /* Empty / pending */
  .ms-empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }

  /* Pending Requests */
  .ms-requests-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .ms-requests-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .ms-request-card {
    display: flex; flex-direction: column; gap: 10px;
    padding: 18px 20px; border-bottom: 1px solid #F3F4F6;
    border-right: 1px solid #F3F4F6;
    transition: background 0.12s; cursor: pointer;
  }
  .ms-request-card:nth-child(even) { border-right: none; }
  .ms-request-card:hover { background: #FAFAFA; }
  .ms-request-top { display: flex; align-items: center; gap: 12px; }
  .ms-request-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    background: #D1D5DB; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #4B5563;
  }
  .ms-request-name    { font-size: 14px; font-weight: 600; color: var(--text); }
  .ms-request-meta    { font-size: 11.5px; color: var(--muted); margin-top: 1px; }
  .ms-request-mid     { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ms-request-type    { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
  .ms-request-date    { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
  .ms-request-note    { font-size: 12px; color: var(--muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ms-request-bottom  { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
  .ms-attachment-tag  { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--muted); }
  .ms-review-btn {
    background: #F59E0B; color: #fff; border: none;
    border-radius: 20px; padding: 5px 16px;
    font-size: 12.5px; font-weight: 600; font-family: var(--font);
    cursor: pointer; transition: background 0.12s;
  }
  .ms-review-btn:hover { background: #D97706; }

  /* Request modal */
  .ms-req-modal-wrap {
    background: var(--white); border-radius: 16px;
    width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
    overflow: hidden;
  }
  .ms-req-modal-header {
    background: var(--green); padding: 18px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .ms-req-modal-header-left { display: flex; align-items: center; gap: 12px; }
  .ms-req-modal-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
  }
  .ms-req-modal-hname { font-size: 15px; font-weight: 700; color: #fff; }
  .ms-req-modal-hsub  { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 1px; }
  .ms-req-modal-close {
    background: none; border: none; cursor: pointer; color: #fff;
    display: flex; align-items: center; padding: 4px;
    opacity: 0.85; transition: opacity 0.12s;
  }
  .ms-req-modal-close:hover { opacity: 1; }
  .ms-req-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .ms-req-modal-label { font-size: 13.5px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
  .ms-req-modal-textarea {
    width: 100%; border-radius: 12px; border: none;
    background: #F0F0F0; padding: 14px 16px; height: 80px;
    font-size: 13px; font-family: var(--font); color: var(--text);
    resize: none; outline: none; line-height: 1.5;
  }
  .ms-req-modal-photo {
    width: 100%; border-radius: 12px; background: #F0F0F0;
    height: 80px; display: flex; align-items: center; justify-content: center;
    color: var(--light); font-size: 13px; cursor: pointer; gap: 6px;
    border: none; transition: background 0.12s; font-family: var(--font);
  }
  .ms-req-modal-photo:hover { background: #E8E8E8; }
  .ms-req-modal-footer {
    display: flex; justify-content: flex-end;
    padding: 0 20px 20px;
  }
  .ms-req-save-btn {
    background: var(--green); color: #fff; border: none;
    border-radius: 20px; padding: 10px 24px;
    font-size: 13.5px; font-weight: 700; font-family: var(--font);
    cursor: pointer; transition: background 0.12s;
  }
  .ms-req-save-btn:hover { background: var(--green-dark); }

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

export default function MyStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState<Tab>("list");
  const [searchVal, setSearchVal]     = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All Status");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showFilter, setShowFilter]   = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [requestTypeFilter, setRequestTypeFilter] = useState<"All Types" | RequestType>("All Types");
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const PAGE_SIZE = 5;

  useEffect(() => {
    const tab = searchParams.get("tab")
    console.log(tab)
    if (tab === "pending" || tab === "list") {
      setActiveTab(tab)
    }
  }, [searchParams])

  const filtered = allStudents.filter((s) => {
    const matchSearch = tableSearch.trim() === "" ||
      s.name.toLowerCase().includes(tableSearch.toLowerCase()) ||
      s.studentNo.includes(tableSearch);
    const matchStatus = statusFilter === "All Status" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPending = pendingRequests.filter((r) => {
    const matchSearch = pendingSearch.trim() === "" || r.name.toLowerCase().includes(pendingSearch.toLowerCase());
    const matchType = requestTypeFilter === "All Types" || r.type === requestTypeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statusOptions: StatusFilter[] = ["All Status", "Completed", "Near Completion", "In Progress", "Not Started"];

  async function handleSignOut() {
      await signOutWithAudit()
      router.push("/")
      router.refresh()
    }
  
    function handleNavClick(label: string) {
      setActiveNav(label)
      setSidebarOpen(false)
      if (navRoutes?.[label]) {
        router.push(navRoutes[label])
      }
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
              <div className="search-bar" style={{ minWidth: 200 }}>
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input" value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Search..." aria-label="Search"
                />
              </div>
              <div className="profile-pill">
                <div className="profile-avatar">KM</div>
                <div>
                  <div className="profile-name">Kim, Mingyu</div>
                  <div className="profile-sec">NSTP – H</div>
                </div>
              </div>
            </div>

            {/* Sections filter */}
            <div style={{ padding: "12px 28px 0" }}>
              <button className="sections-btn">
                All Sections <IconChevronDown size={13} stroke={2} />
              </button>
            </div>

            {/* Stat cards */}
            <div className="ms-stat-cards">
              {statCards.map(({ label, value, Icon }) => (
                <div key={label} className="ms-stat-card">
                  <div className="ms-stat-label">{label}</div>
                  <div className="ms-stat-row">
                    <span className="ms-stat-icon"><Icon size={22} stroke={1.5} /></span>
                    <div className="ms-stat-value">{value}</div>
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
                <IconUsersGroup size={16} stroke={1.75} />
                List of Students
              </button>
              <button
                className={`ms-tab${activeTab === "pending" ? " ms-tab-active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                <IconQrcode size={16} stroke={1.75} />
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
                    <div className="ms-toolbar-right">
                      <div className="ms-search-bar">
                        <IconSearch size={13} stroke={1.75} color="var(--light)" />
                        <input
                          className="ms-search-input"
                          value={tableSearch}
                          onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                          placeholder="Search..."
                        />
                      </div>
                      <div style={{ position: "relative" }}>
                        <button className="ms-filter-btn" onClick={() => setShowFilter((v) => !v)}>
                          {statusFilter} <IconChevronDown size={13} stroke={2} />
                        </button>
                        {showFilter && (
                          <div style={{
                            position: "absolute", top: "calc(100% + 6px)", right: 0,
                            background: "var(--white)", border: "1px solid var(--border)",
                            borderRadius: 10, boxShadow: "var(--shadow)", zIndex: 50,
                            minWidth: 160, overflow: "hidden",
                          }}>
                            {statusOptions.map((opt) => (
                              <button key={opt} onClick={() => { setStatusFilter(opt); setShowFilter(false); }}
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
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="ms-empty">No students match your search.</td>
                        </tr>
                      ) : paginated.map((s) => {
                        const pct = Math.round((s.hoursLogged / s.totalHours) * 100);
                        const cfg = statusConfig[s.status];
                        return (
                          <tr key={s.id}>
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
                                <span>{pct}%</span>
                              </div>
                              <div className="ms-hours-track">
                                <div className="ms-hours-fill" style={{ width: `${pct}%`, background: progressColor(s.status) }} />
                              </div>
                            </td>
                            <td>
                              <button className="ms-view-btn" onClick={() => setSelectedStudent(s)} aria-label={`View ${s.name}`}>
                                <IconEye size={16} stroke={1.75} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table></div>

                  {/* Pagination */}
                  <div className="ms-pagination">
                    <div className="ms-pagination-info">
                      Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} students
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
                  </div>
                </div>
              ) : (
                <div className="ms-table-card">
                  <div className="ms-requests-toolbar">
                    <div>
                      <div className="ms-table-title">All Requests</div>
                      <div className="ms-table-count">{filteredPending.length} request{filteredPending.length !== 1 ? "s" : ""} found</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                            position: "absolute", top: "calc(100% + 6px)", right: 0,
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
                    <div className="ms-requests-grid">
                      {filteredPending.map((r) => {
                        const typeStyle = requestTypeStyle(r.type);
                        const initials = r.name.split(" ").slice(0,2).map((w: string) => w[0]).join("").toUpperCase();
                        return (
                          <div key={r.id} className="ms-request-card" onClick={() => setSelectedRequest(r)}>
                            <div className="ms-request-top">
                              <div className="ms-request-avatar">{initials}</div>
                              <div>
                                <div className="ms-request-name">{r.name}</div>
                                <div className="ms-request-meta">{r.studentNo} · {r.section}</div>
                              </div>
                            </div>
                            <div className="ms-request-mid">
                              <span className="ms-request-type" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                                {r.type}
                              </span>
                              <span className="ms-request-date">{r.dateSubmitted}</span>
                            </div>
                            <div className="ms-request-note">{r.note}</div>
                            <div className="ms-request-bottom">
                              <span className="ms-attachment-tag">
                                {r.hasAttachment ? (
                                  <><IconPaperclip size={13} stroke={1.75} /> 1 attachment</>
                                ) : (
                                  <span style={{ opacity: 0.4 }}>No attachment</span>
                                )}
                              </span>
                              <button className="ms-review-btn" onClick={(e) => { e.stopPropagation(); setSelectedRequest(r); }}>
                                Review
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                    <span></span>
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

        {scannerOpen && <QrScanner onClose={() => setScannerOpen(false)} />}
      </div>
    </>
  );
}