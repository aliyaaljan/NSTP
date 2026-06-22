"use client";

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconQrcode,
  IconAlertTriangle,
  IconInfoCircle,
  IconChevronDown,
  IconEye,
  IconAlertCircle,
  IconUsers,
  IconClock,
  IconCircleCheck,
} from "@tabler/icons-react"
import {
  navRoutes,
  dashboardStyles,
  Sidebar,
  QrScanner,
  StudentAvatar,
  ProgressBar,
  DonutChart,
  Calendar,
} from "../facilitator"
import { signOutWithAudit } from "@/lib/auth-actions"
import { createClient } from "@/lib/client"

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
}

const PAGE_SIZE = 10

export default function DashboardPage() {
  const router = useRouter()

  const [activeNav, setActiveNav] = useState("Dashboard")
  const [searchVal, setSearchVal] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState("All Sections")
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [initials, setInitials] = useState("")
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardRow[]>([])
  const [currentPage, setCurrentPage] = useState(1)

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

      // Get dashboard data
      const { data: dashboardData, error: dashboardError } = await supabase.rpc("get_adviser_dashboard_data", { p_adviser_user_id: user?.id})
      if (dashboardError) console.error(dashboardError)
      if (dashboardData) setDashboardData(dashboardData)

      // Get sections
      const { data: sectionData, error: sectionError } = await supabase.rpc("get_sections",{p_adviser_user_id: user?.id})
      if (sectionError) console.error(sectionError)
      if (sectionData && dashboardData) {
        const mappedSection = dashboardData.map((r: DashboardRow) => ({
          id: r.section_id ?? "all",
          name: r.section_name,
        }))
        const sortedSection = [...mappedSection].sort((a, b) => {
          if (a.name === "All Sections") return -1 // all sections on top
          if (b.name === "All Sections") return 1
          return a.name.localeCompare(b.name)
        })
        setSections(sortedSection)
      }
    })
  }, [])

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

  const statCards = [
    { label: "Total Students", value: currentData.total, Icon: IconUsers },
    { label: "Pending Review", value: currentData.pending, Icon: IconClock },
    { label: "Completed", value: currentData.completed, Icon: IconCircleCheck },
  ]

  const students = currentData.students ?? []

  const filtered = searchVal.trim() ? students.filter((s) => s.name.toLowerCase().includes(searchVal.toLowerCase())) : students

  const totalPages = Math.max(1, Math.ceil(filtered?.length / PAGE_SIZE))
  const paginated = filtered?.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <>
      <style>{dashboardStyles}</style>

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
              <h1 className="header-greeting">Hello, {firstName}!</h1>
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
                  placeholder="Search..."
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
              {/* Alert + QR */}
              <div className="top-row">
                <div className="alert-banner" role="alert">
                  <span className="alert-icon">
                    <IconAlertTriangle size={24} stroke={1.75} />
                  </span>
                  <div className="alert-text">
                    <div className="alert-title">Action Needed</div>
                    <div className="alert-sub">
                      {dashboardData.find((r) => r.section_name === "All Sections")
                        ?.pending ?? 0}{" "}
                      pending requests
                    </div>
                  </div>
                  <button className="alert-btn">
                    <IconEye size={13} stroke={1.75} /> Review
                  </button>
                </div>
                <div
                  className="qr-card"
                  role="button"
                  tabIndex={0}
                  aria-label="Open QR code scanner"
                  onClick={() => setScannerOpen(true)}
                >
                  <div className="qr-icon-box">
                    <IconQrcode size={24} stroke={1.5} />
                  </div>
                  <div>
                    <div className="qr-title">Scan QR Code</div>
                    <div className="qr-sub">Tap to open scanner</div>
                  </div>
                </div>
              </div>

              {/* Main layout: Left (overview + progress) | Right (completion + calendar + activity) */}
              <div className="dashboard-layout">
                {/* Left */}
                <div className="dashboard-left">
                  {/* Class Overview */}
                  <div>
                    <div className="overview-header">
                      <div className="overview-label">Class Overview</div>
                      <div style={{ position: "relative" }}>
                        <button
                          className="sections-btn"
                          onClick={() => setSectionDropdownOpen((o) => !o)}
                        >
                          {selectedSection} <IconChevronDown size={13} stroke={2} />
                        </button>
                        {sectionDropdownOpen && (
                          <>
                            <div
                              className="sections-dropdown"
                              onClick={() => setSectionDropdownOpen(false)}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                right: 0,
                                background: "var(--white)",
                                border: "1px solid var(--border)",
                                borderRadius: 10,
                                boxShadow: "var(--shadow)",
                                zIndex: 10,
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
                                  }}
                                  className={`block w-full px-4 py-2.25 text-left text-[13px] cursor-pointer border-none font-sans hover:bg-green/30 ${
                                    s.name === selectedSection ? "font-semibold bg-green text-white" : "font-normal text-text"
                                  }`}
                                >
                                  {s.name}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="stat-cards">
                      {statCards.map(({ label, value, Icon }) => (
                        <div key={label} className="stat-card">
                          <div className="stat-card-label">{label}</div>
                          <div className="stat-card-row">
                            <span className="stat-card-icon">
                              <Icon size={22} stroke={1.5} />
                            </span>
                            <div className="stat-card-value">{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Progress */}
                  <div className="progress-card">
                    <div className="progress-card-header">
                      <div className="card-title" style={{ marginBottom: 0 }}>
                        Student Progress
                      </div>
                      <button className="view-all-btn">View All</button>
                    </div>
                    <div className="student-list">
                      {filtered.length === 0 ? (
                        <div className="no-results">
                          No students match your search.
                        </div>
                      ) : (
                        paginated.map(({ name, pct }) => (
                          <div key={name} className="student-row">
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
                        marginTop: "auto",
                      }}
                      className="w-auto"
                    >
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Showing{" "}
                        {filtered.length === 0
                          ? 0
                          : (currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                        {filtered.length}
                      </span>
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
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (p) => (
                            <button
                              key={p}
                              onClick={() => setCurrentPage(p)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: "1px solid var(--border)",
                                background:
                                  p === currentPage
                                    ? "var(--maroon)"
                                    : "var(--white)",
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
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
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
                  {/* Section Completion Rate */}
                  <div className="completion-card" style={{ width: "100%" }}>
                    <div className="card-title">Section Completion Rate</div>
                    <div className="completion-inner">
                      <DonutChart pct={currentData.completion_pct} />
                      <div className="completion-meta">
                        <div className="completion-name">
                          {selectedSection === "All Sections"
                            ? "NSTP Overall"
                            : selectedSection}
                        </div>
                        <div className="completion-sub">
                          {currentData.on_track} / {currentData.total} students on track
                        </div>
                        {currentData.at_risk > 0 && (<div className="completion-warn">
                          <IconAlertCircle size={15} stroke={1.75} className="shrink-0 m-1"/>{" "}
                          {currentData.at_risk}  {currentData.at_risk === 1 ? "student" : "students"} behind
                        </div>)}
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <Calendar />

                  {/* Recent Activity */}
                  <div className="activity-card" style={{ width: "100%"}}>
                    <div className="card-title">Recent Activity</div>
                    <div className="activity-empty">
                      <div className="activity-empty-icon">
                        <IconInfoCircle size={18} stroke={1.5} />
                      </div>
                      <div className="activity-empty-text">
                        No activity yet.
                        <br />
                        Actions you take will appear here.
                      </div>
                      <button className="activity-empty-cta">Go to Forms</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {scannerOpen && <QrScanner onClose={() => setScannerOpen(false)} />}
      </div>
    </>
  )
}