// app/facilitator/dashboard/page.tsx
"use client";

import { useState } from "react";
import {
  IconSearch, IconQrcode, IconAlertTriangle, IconInfoCircle,
  IconChevronDown, IconEye, IconAlertCircle,
  IconUsers, IconClock, IconCircleCheck,
} from "@tabler/icons-react";
import {
  navItems, dashboardStyles,
  Sidebar, QrScanner, StudentAvatar, ProgressBar, DonutChart,
} from "../facilitator";

// ── Dashboard-specific data ───────────────────────────────────────────
const students = [
  { name: "Rhona Shayne Lopez",      pct: 72  },
  { name: "Jaerish Kyle Rabang",     pct: 48  },
  { name: "Saffi Limbaro",           pct: 90  },
  { name: "Aliya Aljan Mendoza",     pct: 70  },
  { name: "Charles Ansbert Joaquin", pct: 100 },
  { name: "Axel Xandrei Valido",     pct: 50  },
  { name: "Janine Irish Tulic",      pct: 0   },
];

const statCards = [
  { label: "Total Students", value: 40, Icon: IconUsers       },
  { label: "Pending Review", value: 10, Icon: IconClock       },
  { label: "Completed",      value: 3,  Icon: IconCircleCheck },
];

export default function DashboardPage() {
  const [activeNav, setActiveNav]     = useState("Dashboard");
  const [searchVal, setSearchVal]     = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const filtered = searchVal.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(searchVal.toLowerCase()))
    : students;

  return (
    <>
      <style>{dashboardStyles}</style>

      <div className="db-root">

        <Sidebar
          open={sidebarOpen}
          activeNav={activeNav}
          onToggle={() => setSidebarOpen((o) => !o)}
          onNavClick={(label) => { setActiveNav(label); setSidebarOpen(false); }}
        />

        {sidebarOpen && (
          <div className="sb-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <div className="main-wrapper">
          <main className="main">

            <header className="header">
              <h1 className="header-greeting">Hello, Mingyu!</h1>
              <div className="search-bar">
                <span className="search-icon"><IconSearch size={14} stroke={1.75} /></span>
                <input
                  className="search-input" value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
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

              {/* Overview + Completion */}
              <div className="overview-row">
                <div className="overview-left">
                  <div className="overview-header">
                    <div className="overview-label">Class Overview</div>
                    <button className="sections-btn">
                      All Sections <IconChevronDown size={13} stroke={2} />
                    </button>
                  </div>
                  <div className="stat-cards">
                    {statCards.map(({ label, value, Icon }) => (
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
                <div className="completion-card">
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
              </div>

              {/* Progress + Activity */}
              <div className="bottom-row">
                <div className="progress-card">
                  <div className="progress-card-header">
                    <div className="card-title" style={{ marginBottom: 0 }}>Student Progress</div>
                    <button className="view-all-btn">View All</button>
                  </div>
                  <div className="student-list">
                    {filtered.length === 0 ? (
                      <div className="no-results">No students match your search.</div>
                    ) : filtered.map(({ name, pct }) => (
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
                </div>
                <div className="activity-card">
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
          </main>
        </div>

        {scannerOpen && <QrScanner onClose={() => setScannerOpen(false)} />}

      </div>
    </>
  );
}