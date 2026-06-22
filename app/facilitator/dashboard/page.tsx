"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconQrcode, IconAlertTriangle, IconInfoCircle,
  IconChevronDown, IconEye, IconAlertCircle,
} from "@tabler/icons-react";
import {
  navRoutes, dashboardStyles,
  Sidebar, QrScanner, StudentAvatar, ProgressBar, DonutChart, Calendar,
  dashboardStudents, dashboardStatCards,
} from "../facilitator";

export default function DashboardPage() {
  const router = useRouter();
  const [searchVal, setSearchVal]     = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const filtered = searchVal.trim()
    ? dashboardStudents.filter((s) => s.name.toLowerCase().includes(searchVal.toLowerCase()))
    : dashboardStudents;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <style>{dashboardStyles}</style>

      <div className="db-root">
        <Sidebar
          open={sidebarOpen}
          activeNav="Dashboard"
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={(label) => { setSidebarOpen(false); router.push(navRoutes[label]); }}
        />

        {sidebarOpen && (
          <div className="sb-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <div className="main-wrapper">
          <main className="main">

            {/* Header */}
            <header className="header">
              <h1 className="header-greeting">Hello, Mingyu!</h1>
              <div className="search-bar">
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input" value={searchVal}
                  onChange={(e) => { setSearchVal(e.target.value); setCurrentPage(1); }}
                  placeholder="Search..." aria-label="Search students"
                />
              </div>
              <div className="profile-pill">
                <div className="profile-avatar">KM</div>
                <div>
                  <div className="profile-name">Kim, Mingyu</div>
                  <div className="profile-sec">NSTP – H</div>
                </div>
              </div>
            </header>

            <div className="body">

              {/* Alert + QR */}
              <div className="top-row">
                <div className="alert-banner" role="alert">
                  <span className="alert-icon"><IconAlertTriangle size={24} stroke={1.75} /></span>
                  <div className="alert-text">
                    <div className="alert-title">Action Needed</div>
                    <div className="alert-sub">7 pending requests</div>
                  </div>
                  <button className="alert-btn">
                    <IconEye size={13} stroke={1.75} /> Review
                  </button>
                </div>
                <div className="qr-card" role="button" tabIndex={0}
                  aria-label="Open QR code scanner" onClick={() => setScannerOpen(true)}>
                  <div className="qr-icon-box"><IconQrcode size={24} stroke={1.5} /></div>
                  <div>
                    <div className="qr-title">Scan QR Code</div>
                    <div className="qr-sub">Tap to open scanner</div>
                  </div>
                </div>
              </div>

              {/* Main layout: Left (stats + progress) | Right (completion + calendar + activity) */}
              <div className="dashboard-layout">

                {/* Left */}
                <div className="dashboard-left">

                  {/* Class Overview */}
                  <div>
                    <div className="overview-header">
                      <div className="overview-label">Class Overview</div>
                      <button className="sections-btn">
                        All Sections <IconChevronDown size={13} stroke={2} />
                      </button>
                    </div>
                    <div className="stat-cards">
                      {dashboardStatCards.map(({ label, value, Icon }) => (
                        <div key={label} className="stat-card">
                          <div className="stat-card-label">{label}</div>
                          <div className="stat-card-row">
                            <span className="stat-card-icon"><Icon size={22} stroke={1.5} /></span>
                            <div className="stat-card-value">{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Student Progress */}
                  <div className="progress-card">
                    <div className="progress-card-header">
                      <div className="card-title" style={{ marginBottom: 0 }}>Student Progress</div>
                      <button className="view-all-btn">View All</button>
                    </div>
                    <div className="student-list">
                      {filtered.length === 0 ? (
                        <div className="no-results">No students match your search.</div>
                      ) : paginated.map(({ name, pct }) => (
                        <div key={name} className="student-row">
                          <StudentAvatar name={name} />
                          <div className="student-info">
                            <div className="student-name" title={name}>{name}</div>
                            <ProgressBar pct={pct} />
                          </div>
                          <div className="student-pct">{pct}%</div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", borderTop: "1px solid var(--border)", marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--white)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text)" }}
                        >&#8249;</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button key={p} onClick={() => setCurrentPage(p)}
                            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: p === currentPage ? "var(--maroon)" : "var(--white)", color: p === currentPage ? "#fff" : "var(--text)", fontWeight: p === currentPage ? 700 : 500, cursor: "pointer", fontSize: 12, fontFamily: "var(--font)" }}
                          >{p}</button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--white)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--text)" }}
                        >&#8250;</button>
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
                      <DonutChart pct={60} />
                      <div className="completion-meta">
                        <div className="completion-name">NSTP-H Overall</div>
                        <div className="completion-sub">24 out of 40 students on track</div>
                        <div className="completion-warn">
                          <IconAlertCircle size={13} stroke={1.75} /> 7 students below 50%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <Calendar />

                  {/* Recent Activity */}
                  <div className="activity-card" style={{ width: "100%" }}>
                    <div className="card-title">Recent Activity</div>
                    <div className="activity-empty">
                      <div className="activity-empty-icon">
                        <IconInfoCircle size={18} stroke={1.5} />
                      </div>
                      <div className="activity-empty-text">
                        No activity yet.<br />Actions you take will appear here.
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
  );
}