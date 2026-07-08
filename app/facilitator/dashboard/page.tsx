"use client";

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconQrcode,
  IconAlertTriangle,
  IconInfoCircle,
  IconEye,
  IconAlertCircle,
  IconUsers,
  IconClock,
  IconCircleCheck,
  IconInbox,
  IconFilter,
} from "@tabler/icons-react"
import {
  navRoutes,
  dashboardStyles,
  Sidebar,
  StudentAvatar,
  ProgressBar,
  DonutChart,
  Calendar,
  InfoCircle
} from "../facilitator"
import { QrScanner } from "@/components/shared/QrScanner"
import { signOutWithAudit } from "@/lib/auth-actions"
import { createClient } from "@/lib/client"
import { ChartStyles } from "@/components/shared/ChartModule"
import { useAdviserBroadcast } from "@/lib/hooks/broadcastListener";

type DashboardRow = {
  section_id: string | null
  section_name: string
  total: number
  pending: number
  completed: number
  completion_pct: number
  on_track: number
  at_risk: number
  students: { name: string; pct: number }[]
  is_active: boolean
  term_start_date: string | null
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  const gap = 2
  const shown = new Set<number>()

  shown.add(1)
  shown.add(total)
  let start = current - gap
  let end = current + gap

  if (start < 1) {
    end += 1 - start
    start = 1
  }
  
  if (end > total) {
    start -= end - total
    end = total
  }

  for (let i = Math.max(1, start); i <= Math.min(total, end); i++) {
    shown.add(i)
  }

  const sorted = Array.from(shown).sort((a, b) => a - b)
  const result: (number | "...")[] = []

  
  for (let i = 0; i < sorted.length; i++) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1]
      if (gap === 2) {
        result.push(sorted[i - 1] + 1) 
      } else if (gap > 2) {
        result.push("...")
      }
    }
    result.push(sorted[i])
  }

  return result
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [searchVal, setSearchVal] = useState("")
  const [debouncedSearchVal, setDebouncedSearchVal] = useState("")
  const [sortOrder, setSortOrder] = useState<"none" | "desc" | "asc">("none")
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState("All Classes")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string; isActive: boolean; termStartDate: string | null }[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([])
  const [recentActivity, setRecentActivity] = useState<{ summary: string; created_at_hours: string }[]>([])
  const [activeSemData, setActiveSemData] = useState<{ section_id: string; section_name: string; sem_end_date: string; remaining_days: string }[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [animKey, setAnimKey] = useState(0)
  const [sectionKey, setSectionKey] = useState(0)
  const didDefaultToActiveSection = useRef(false)

  const fetchDashboardBundle = useCallback(async (uid: string) => {
    const [
      { data: dashboardData, error: dashboardError },
      { data: sectionData, error: sectionError },
      { data: auditData, error: auditError },
      { data: semData, error: semError },
    ] = await Promise.all([
      supabase.rpc("get_adviser_dashboard_data", { p_adviser_user_id: uid }),
      supabase.rpc("get_sections", { p_adviser_user_id: uid }),
      supabase.rpc("get_adviser_recent_activity", { p_adviser_user_id: uid }),
      supabase.rpc("get_active_sem", { p_adviser_user_id: uid }),
    ])

    if (dashboardError) console.error(dashboardError)
    if (dashboardData) setDashboardData(dashboardData)

    if (sectionError) console.error(sectionError)
    if (sectionData && dashboardData) {
      const mappedSection = dashboardData.map((r: DashboardRow) => ({
        id: r.section_id ?? r.section_name,
        name: r.section_name,
        isActive: r.is_active,
        termStartDate: r.term_start_date,
      }))
      const tierRank = (name: string) => (name === "All Classes" ? 0 : 1)
      const sortedSection = [...mappedSection].sort((a, b) => {
        const rankDiff = tierRank(a.name) - tierRank(b.name)
        if (rankDiff !== 0) return rankDiff
        // Latest class term first.
        return new Date(b.termStartDate ?? 0).getTime() - new Date(a.termStartDate ?? 0).getTime()
      })
      setSections(sortedSection)

      // Default the filter to the facilitator's current active class (only once,
      // on first load — later refetches shouldn't yank the user's own selection).
      if (!didDefaultToActiveSection.current) {
        didDefaultToActiveSection.current = true
        const activeSection = sortedSection.find((s) => s.isActive)
        if (activeSection) setSelectedSection(activeSection.name)
      }
    }

    if (auditError) console.log(auditError)
    if (auditData) setRecentActivity(auditData)

    if (semError) console.error(semError)
    if (semData) setActiveSemData(semData)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const full: string = user?.user_metadata?.full_name ?? ""
      const parts = full.trim().split(" ")
      setFirstName(parts[0] ?? "")
      setLastName(parts.at(-1) ?? "")
      setInitials(((parts[0] ?? "")[0] ?? "") + ((parts.at(-1) ?? "")[0] ?? ""))
      setUserId(user?.id ?? null)
      if (user?.id) await fetchDashboardBundle(user.id)
    })
  }, [supabase, fetchDashboardBundle])

  // Debounce search input so filtering the student list doesn't run on
  // every keystroke — keeps typing smooth once a section has many students.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchVal(searchVal), 250)
    return () => clearTimeout(t)
  }, [searchVal])

  useAdviserBroadcast(supabase, {
    adviserUserId: userId,
    onChange: () => {
      if (userId) fetchDashboardBundle(userId)
    },
  })

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

    const currentData = dashboardData.find((r) => r.section_name === selectedSection)
    if (!currentData) return null

    const currentSemData =
      selectedSection === "All Classes"
        ? activeSemData
            .filter((r) => r.remaining_days !== "Semester ended")
            .sort((a, b) => new Date(a.sem_end_date).getTime() - new Date(b.sem_end_date).getTime())[0]
        : activeSemData.find((r) => r.section_name === selectedSection)

  const statCards = [
    { label: "Total Students", value: currentData.total, Icon: IconUsers, onClick:  () => router.push(`${navRoutes["My Students"]}?tab=list`)},
    { label: "Pending Requests", value: currentData.pending, Icon: IconAlertCircle, onClick: () => router.push(`${navRoutes["My Students"]}?tab=pending&status=Pending%20Review&status=Under%20Review`)},
    { label: "Completed", value: currentData.completed, Icon: IconCircleCheck, onClick: () => router.push(`${navRoutes["My Students"]}?tab=list&status=Completed`)},
  ]

  const students = currentData.students ?? []

  const filtered = debouncedSearchVal.trim() ? students.filter((s) => s.name.toLowerCase().includes(debouncedSearchVal.toLowerCase())) : students

  const sorted =
    sortOrder === "none"
      ? filtered
      : [...filtered].sort((a, b) => (sortOrder === "desc" ? b.pct - a.pct : a.pct - b.pct))

  const totalPages = Math.max(1, Math.ceil(sorted?.length / pageSize))
  const paginated = sorted?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const pendingCount = dashboardData.find((r) => r.is_active)?.pending ?? 0

  return (
    <>
      <style>{dashboardStyles}</style>
      <ChartStyles />

      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav={activeNav}
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={handleNavClick}
          onSignOut={handleSignOut}
        />

        {sidebarOpen && (
          <div
            className="sb-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="main-wrapper">
          <main className="main">
            <header className="header">
              <h1 className="header-greeting">Hello, {firstName || "Adviser"}!</h1>
              <div className="search-bar">
                <span className="search-icon">
                  <IconSearch size={14} stroke={1.75} />
                </span>
                <input
                  className="search-input"
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search students..."
                  aria-label="Search students"
                />
              </div>
              <div className="profile-pill">
                <div className="profile-avatar">{initials}</div>
                <div>
                  <div className="profile-name">
                    {lastName}, {firstName}
                  </div>
                </div>
              </div>
            </header>

            <div className="body">
              {/* Alert banner - only when pending */}
              {pendingCount > 0 && (
                <div className="top-row">
                  <div className="alert-banner" role="alert">
                    <span className="alert-icon">
                      <IconAlertTriangle size={24} stroke={1.75} />
                    </span>
                    <div className="alert-text">
                      <div className="alert-title">Action Needed</div>
                      <div className="alert-sub">
                        {pendingCount} pending requests
                      </div>
                    </div>
                    <button
                      className="alert-btn"
                      onClick={() => router.push(`${navRoutes["My Students"]}?tab=pending`)}
                    >
                      <IconEye size={13} stroke={1.75} /> Review
                    </button>
                  </div>
                </div>
              )}

              {/* Main layout: Left (overview + progress) | Right (completion + calendar + activity) */}
              <div className="dashboard-layout">
                {/* Left */}
                <div className="dashboard-left">
                  {/* Class Overview */}
                  <div>
                    <div className="overview-header">
                      <div className="overview-label">Class Overview</div>
                    </div>
                    <div className="stat-cards">
                      {statCards.map(({ label, value, Icon, onClick }) => (
                        <button key={label} className="db-kpi-card db-kpi-card--interactive" onClick={onClick} aria-label={`${label}: ${value}`} style={{ cursor: "pointer", textAlign: "left" }}>
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
                  </div>

                  {/* Student Progress */}
                  <div className="progress-card" style={{ marginTop: -8 }}>
                    <div className="progress-card-header">
                      <div className="card-title" style={{ marginBottom: 0 }}>
                        Student Progress
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {currentSemData?.remaining_days && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {currentSemData.remaining_days}
                          </div>
                        )}
                        <div style={{ position: "relative" }}>
                          <div onMouseLeave={() => setSortMenuOpen(false)}>
                            <button
                              className="adv-filter-btn"
                              onClick={() => setSortMenuOpen((o) => !o)}
                              aria-label="Sort students by progress"
                              aria-expanded={sortMenuOpen}
                              style={{ width: 60, height: 38, borderRadius: 999, padding: 0, justifyContent: "center", borderColor: sortOrder !== "none" ? "var(--green-dark)" : undefined }}
                            >
                              <IconFilter size={16} stroke={2} />
                            </button>

                            {sortMenuOpen && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: 0,
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
                                    width: "max-content",
                                    minWidth: 190,
                                    overflow: "hidden",
                                  }}
                                >
                                  {[
                                    { value: "none" as const, label: "Sort: Default" },
                                    { value: "desc" as const, label: "Progress: High to Low" },
                                    { value: "asc" as const, label: "Progress: Low to High" },
                                  ].map((opt) => (
                                    <div
                                      key={opt.value}
                                      onClick={() => {
                                        setSortOrder(opt.value)
                                        setSortMenuOpen(false)
                                        setCurrentPage(1)
                                        setAnimKey((k) => k + 1)
                                      }}
                                      className={`flex items-center justify-between gap-3 w-full px-4 py-2.25 text-left text-[13px] cursor-pointer border-none font-sans hover:bg-green/30 ${
                                        opt.value === sortOrder ? "font-semibold bg-green text-white" : "font-normal text-text"
                                      }`}
                                    >
                                      <span style={{ whiteSpace: "nowrap" }}>{opt.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`student-list ${filtered.length === 0 ? "student-list--empty" : ""}`} key={animKey}>
                      {filtered.length === 0 ? (
                        <div className="no-results">
                          No students match your search.
                        </div>
                      ) : (
                        paginated.map(({ name, pct }) => (
                          <div key={name} className="student-row anim-list-item">
                            <StudentAvatar name={name} />
                            <div className="student-info">
                              <div className="student-name" title={name}>
                                {name}
                              </div>
                              <ProgressBar pct={pct} />
                            </div>
                            <div className="student-pct">{pct}%</div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 0 0",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
                        <span>Rows per page:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                          style={{ border: "1.5px solid var(--border)", borderRadius: 10, padding: "5px 10px", fontSize: 13, fontFamily: "var(--font)", color: "var(--text)", background: "var(--white)", cursor: "pointer", outline: "none", appearance: "auto", minWidth: 60, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                        >
                          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          transform: "translateX(-50%)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setAnimKey((k) => k + 1) }}
                          disabled={currentPage === 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--white)",
                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                            opacity: currentPage === 1 ? 0.35 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            color: "var(--text)",
                          }}
                        >
                          &#8249;
                        </button>
                        {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                          p === "..." ? (
                            <span
                              key={`ellipsis-${idx}`}
                              style={{
                                width: 28,
                                height: 28,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              &#8230;
                            </span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => { setCurrentPage(p); setAnimKey((k) => k + 1) }}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background: p === currentPage ? "var(--maroon)" : "var(--white)",
                                color: p === currentPage ? "#fff" : "var(--text)",
                                fontWeight: p === currentPage ? 700 : 500,
                                cursor: "pointer",
                                fontSize: 12,
                                fontFamily: "var(--font)",
                              }}
                            >
                              {p}
                            </button>
                          )
                        )}
                        <button
                          onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); setAnimKey((k) => k + 1) }}
                          disabled={currentPage === totalPages}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--white)",
                            cursor:
                              currentPage === totalPages
                                ? "not-allowed"
                                : "pointer",
                            opacity: currentPage === totalPages ? 0.35 : 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            color: "var(--text)",
                          }}
                        >
                          &#8250;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="right-panel">
                  {/* QR Scanner */}
                  <div
                    className="qr-card mt-[26.5px]" //pantay sa kpi cards
                    role="button"
                    tabIndex={0}
                    aria-label="Open QR code scanner"
                    onClick={() => setScannerOpen(true)}
                    style={{ width: "100%" }}
                  >
                    <div className="qr-icon-box">
                      <IconQrcode size={24} stroke={1.5} />
                    </div>
                    <div>
                      <div className="qr-title">Scan QR Code</div>
                      <div className="qr-sub">Tap to open scanner</div>
                    </div>
                  </div>

                  {/* Section Completion Rate */}
                  <div className="completion-card" style={{ width: "100%" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <div className="card-title">Section Completion Rate</div>
                      <InfoCircle tooltip={"On Track: Students are keeping up with the term's pace.\nAt Risk: Students are more than 20% behind schedule."} />
                    </div>
                    <div className="completion-inner">
                      <DonutChart key={sectionKey} pct={currentData.completion_pct} />
                      <div className="completion-meta">
                        <div className="completion-name text-center">
                          {selectedSection === "All Classes" ? "NSTP Overall" : selectedSection}
                        </div>
                        <div className="completion-sub text-center">
                          {currentData.on_track} / {currentData.total} students on track
                        </div>
                        {currentData.at_risk > 0 && (<div className="completion-warn py-0.5 pr-2">
                          <IconAlertCircle size={20} stroke={1.75} className="shrink-0 ml-2"/>{" "}
                          {currentData.at_risk}  {currentData.at_risk === 1 ? "student" : "students"} behind
                        </div>)}
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <Calendar semEndDate={currentSemData?.sem_end_date} />
                  {/* Recent Activity */}
                  <div className={`activity-card ${recentActivity.length === 0 ? "flex-1" : ""}`} style={{ width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, paddingRight: 20 }}>
                      <div className="card-title">Recent Activity</div>
                      <InfoCircle tooltip="All recent activity for the last 7 days." />
                    </div>
                    <div className="activity-card-scroll" style={{ paddingBottom: 8 }}>
                      {recentActivity.length > 0 ? (
                        recentActivity.map((item, index) => (
                          <div key={index} style={{ fontSize: 12, background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", marginTop: 8, boxShadow: "var(--shadow)" }}>
                            <div style={{ textAlign: "justify" }}>{item.summary}</div>
                            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 10, textAlign: "right" }}>{item.created_at_hours}</div>
                          </div>
                        ))
                      ) : (
                        <div className="activity-empty">
                          <div className="activity-empty-icon">
                            <IconInbox size={18} stroke={1.5} />
                          </div>
                          <div className="activity-empty-text">
                            No activity for the past 7 days.
                            <br />
                            Actions you take will appear here.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {scannerOpen && (
          <QrScanner
            onClose={() => setScannerOpen(false)}
            onScanSuccess={() => { if (userId) fetchDashboardBundle(userId) }}
          />
        )}
      </div>
    </>
  )
}