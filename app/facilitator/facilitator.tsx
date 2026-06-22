"use client";

import {
  IconLayoutGrid,
  IconUsersGroup,
  IconClipboardText,
  IconChartBar,
  IconLogout2,
  IconX,
  IconCamera,
  IconUsers,
  IconClock,
  IconCircleCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  Icon: React.ElementType;
}

// ── Nav ───────────────────────────────────────────────────────────────
export const navItems: NavItem[] = [
  { label: "Dashboard",     Icon: IconLayoutGrid    },
  { label: "My Students",   Icon: IconUsersGroup    },
  { label: "Forms",         Icon: IconClipboardText },
  { label: "Group Summary", Icon: IconChartBar      },
];

// ── Routes ────────────────────────────────────────────────────────────
export const navRoutes: Record<string, string> = {
  "Dashboard":     "/facilitator/dashboard",
  "My Students":   "/facilitator/my-students",
  "Forms":         "/facilitator/forms",
  "Group Summary": "/facilitator/group-summary",
};

// ── Dashboard data ────────────────────────────────────────────────────
export const dashboardStudents = [
  { name: "Rhona Shayne Lopez",      pct: 72  },
  { name: "Jaerish Kyle Rabang",     pct: 48  },
  { name: "Saffi Limbaro",           pct: 90  },
  { name: "Aliya Aljan Mendoza",     pct: 70  },
  { name: "Charles Ansbert Joaquin", pct: 100 },
  { name: "Axel Xandrei Valido",     pct: 50  },
  { name: "Janine Irish Tulic",      pct: 0   },
];

export const dashboardStatCards = [
  { label: "Total Students", value: 40, Icon: IconUsers       },
  { label: "Pending Review", value: 10, Icon: IconClock       },
  { label: "Completed",      value: 3,  Icon: IconCircleCheck },
];

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Utils ─────────────────────────────────────────────────────────────
export function progressColor(pct: number): string {
  if (pct >= 75) return "#1B4332";
  if (pct >= 40) return "#D97706";
  return "#7B1D1D";
}

export function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ── Components ────────────────────────────────────────────────────────
export function StudentAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      aria-label={name}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "#D1D5DB", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: size * 0.34, fontWeight: 700,
        color: "#4B5563", flexShrink: 0, letterSpacing: "0.3px",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      style={{ flex: 1, height: 10, background: "#E5E7EB", borderRadius: 5, overflow: "hidden" }}
    >
      <div style={{
        height: "100%", width: `${pct}%`,
        background: progressColor(pct), borderRadius: 5, transition: "width 0.35s ease",
      }} />
    </div>
  );
}

export function DonutChart({ pct = 60 }: { pct?: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" aria-label={`${pct}% completion rate`} style={{ flexShrink: 0 }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E5E7EB" strokeWidth="11" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="#7B1D1D" strokeWidth="11"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <text x="55" y="60" textAnchor="middle" fill="#111827" fontSize="15" fontWeight="700" fontFamily="sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

export function Calendar() {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells       = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const isToday = (d: number) =>
    d === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

  const prev = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  const next = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prev}><IconChevronLeft size={15} stroke={2} /></button>
        <span className="cal-month-label">{MONTHS[current.month]} {current.year}</span>
        <button className="cal-nav-btn" onClick={next}><IconChevronRight size={15} stroke={2} /></button>
      </div>
      <div className="cal-grid">
        {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} className={[
            "cal-cell",
            d === null ? "cal-empty" : "",
            d && isToday(d) ? "cal-today" : "",
          ].join(" ").trim()}>
            {d ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  open: boolean;
  activeNav: string;
  onToggle: () => void;
  onNavClick: (label: string) => void;
  onSignOut: () => void;
}

export function Sidebar({ open, activeNav, onToggle, onNavClick, onSignOut }: SidebarProps) {
  return (
    <div className="sb-wrap">
      <aside
        className={`sb${open ? "" : " sb-closed"}`}
        onClick={() => { if (!open) onToggle(); }}
        style={{ cursor: open ? "default" : "pointer" }}
      >
        <div className="sb-logo">
          <img
            src="/icon.jpg" alt="NSTP Logo" className="sb-logo-img"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            title={open ? "Collapse sidebar" : "Expand sidebar"}
          />
          <div className="sb-logo-text">
            <div className="sb-logo-name">NSTP</div>
            <div className="sb-logo-sub">University of the Philippines Baguio</div>
          </div>
        </div>

        <nav className="sb-nav">
          {navItems.map(({ label, Icon }) => (
            <button
              key={label}
              className={`sb-nav-btn${activeNav === label ? " sb-active" : ""}`}
              title={!open ? label : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (open) { onNavClick(label); } else { onToggle(); }
              }}
            >
              <span className="sb-nav-pill">
                <span className="sb-nav-icon"><Icon size={20} stroke={1.75} /></span>
                <span className="sb-nav-label">{label}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          <button className="sb-logout" title={!open ? "Log Out" : undefined}
            onClick={(e) => {e.stopPropagation();  onSignOut()}}>
            <IconLogout2 size={16} stroke={1.75} />
            <span className="sb-logout-label">Log Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

export function QrScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; setScanning(true); }
      } catch {
        setError("Unable to access camera. Please allow camera permissions.");
      }
    }
    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <span className="scanner-title">Scan QR Code</span>
          <button className="scanner-close" onClick={onClose} aria-label="Close">
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        <div className="scanner-body">
          {error ? (
            <div className="scanner-error">
              <IconCamera size={40} stroke={1.5} />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="scanner-video" />
              <div className="scanner-frame">
                <div className="scanner-corner tl" />
                <div className="scanner-corner tr" />
                <div className="scanner-corner bl" />
                <div className="scanner-corner br" />
                {scanning && <div className="scanner-line" />}
              </div>
            </>
          )}
        </div>
        <p className="scanner-hint">Point your camera at a QR code</p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
export const dashboardStyles = `
  .db-root { display: flex; height: 100vh; background: var(--bg); font-family: var(--font); font-size: 14px; color: var(--text); overflow: hidden; }
  .sb-wrap { padding: 12px; position: fixed; top: 0; left: 0; height: 100vh; z-index: 40; background: transparent; }
  .sb { width: 280px; height: 100%; background: var(--green); display: flex; flex-direction: column; flex-shrink: 0; border-radius: 20px; overflow: hidden; transition: width 0.25s ease; }
  .sb.sb-closed { width: 64px; }
  .sb-logo { display: flex; align-items: center; gap: 10px; padding: 22px 18px 26px; overflow: hidden; flex-shrink: 0; }
  .sb.sb-closed .sb-logo { padding: 22px 0 26px; justify-content: center; gap: 0; }
  .sb.sb-closed .sb-logo-img { margin: 0 auto; }
  .sb-logo-img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.25); cursor: pointer; }
  .sb-logo-text { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, width 0.25s ease; opacity: 1; width: auto; }
  .sb.sb-closed .sb-logo-text { opacity: 0; width: 0; pointer-events: none; }
  .sb-logo-name { color: #fff; font-family: var(--font-title); font-size: 30px; line-height: 1; letter-spacing: 0.5px; }
  .sb-logo-sub { color: var(--green-light); font-family: var(--font-sub); font-style: normal; font-size: 12px; margin-top: 4px; opacity: 0.9; white-space: nowrap; }
  .sb-nav { flex: 1; padding: 8px 0; overflow: hidden; }
  .sb-nav-btn { width: 100%; display: flex; align-items: center; justify-content: flex-start; padding: 0 0 0 10px; background: transparent; border: none; cursor: pointer; color: #86EFAC; font-size: 15px; font-family: var(--font); font-weight: 600; text-align: left; transition: color 0.13s; line-height: 1; margin: 4px 0; }
  .sb.sb-closed .sb-nav-btn { padding: 0; justify-content: center; }
  .sb-nav-btn:hover:not(.sb-active) { color: #d1fae5; }
  .sb-nav-btn.sb-active { color: var(--green); }
  .sb-nav-pill { display: flex; align-items: center; gap: 14px; padding: 13px 20px; border-radius: 999px 0 0 999px; width: 100%; transition: background 0.13s; white-space: nowrap; overflow: hidden; }
  .sb.sb-closed .sb-nav-pill { border-radius: 999px; width: 44px; height: 44px; min-width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; margin: 0 auto; gap: 0; }
  .sb-nav-btn.sb-active .sb-nav-pill { background: rgba(232,232,232,0.92); }
  .sb-nav-btn:hover:not(.sb-active) .sb-nav-pill { background: rgba(255,255,255,0.08); }
  .sb-nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-nav-label { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, max-width 0.25s ease; opacity: 1; max-width: 200px; }
  .sb.sb-closed .sb-nav-label { opacity: 0; max-width: 0; overflow: hidden; pointer-events: none; }
  .sb-footer { padding: 18px 18px 24px; overflow: hidden; flex-shrink: 0; }
  .sb.sb-closed .sb-footer { padding: 18px 0 24px; display: flex; justify-content: center; align-items: center; }
  .sb-logout { display: flex; align-items: center; gap: 8px; background: transparent; border: none; cursor: pointer; color: #FCA5A5; font-size: 13px; font-family: var(--font); font-weight: 500; padding: 0; opacity: 0.85; transition: opacity 0.13s; white-space: nowrap; overflow: hidden; }
  .sb-logout:hover { opacity: 1; }
  .sb-logout-label { transition: opacity 0.2s ease, max-width 0.25s ease; opacity: 1; max-width: 200px; overflow: hidden; }
  .sb.sb-closed .sb-logout-label { opacity: 0; max-width: 0; pointer-events: none; }
  .sb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 25; cursor: pointer; }
  .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; width: 100%; padding-left: 90px; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; width: 100%; }
  .header { display: flex; align-items: center; gap: 16px; padding: 36px 28px 20px; background: var(--bg); flex-shrink: 0; }
  .header-greeting { flex: 1; font-size: 34px; font-weight: 800; color: var(--maroon); font-family: var(--font); white-space: nowrap; }
  .search-bar { display: flex; align-items: center; gap: 8px; background: var(--white); border: 1.5px solid var(--border); border-radius: 24px; padding: 8px 16px; min-width: 190px; transition: border-color 0.15s; }
  .search-bar:focus-within { border-color: #9CA3AF; }
  .search-icon { color: var(--light); display: flex; flex-shrink: 0; }
  .search-input { border: none; background: transparent; outline: none; font-size: 13.5px; color: var(--text); width: 100%; font-family: var(--font); }
  .search-input::placeholder { color: var(--light); }
  .profile-pill { display: flex; align-items: center; gap: 10px; background: var(--maroon); border-radius: 24px; padding: 7px 16px 7px 8px; color: #fff; flex-shrink: 0; }
  .profile-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
  .profile-name { font-weight: 700; font-size: 13px; }
  .profile-sec { font-size: 11px; opacity: 0.75; margin-top: 1px; }
  .body { flex: 1; overflow: auto; padding: 0 28px 28px; display: flex; flex-direction: column; gap: 8px; }
  .top-row { display: flex; gap: 14px; }
  .alert-banner { flex: 1; background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: var(--radius); padding: 13px 16px; display: flex; align-items: center; gap: 12px; }
  .alert-icon { display: flex; align-items: center; color: #D97706; flex-shrink: 0; }
  .alert-text { flex: 1; }
  .alert-title { font-weight: 800; font-size: 14px; color: #166534; text-transform: uppercase; letter-spacing: 0.4px; }
  .alert-sub { font-size: 12.5px; color: #15803D; margin-top: 2px; }
  .alert-btn { display: flex; align-items: center; gap: 6px; background: rgba(22,101,52,0.12); border: 1.5px solid #86EFAC; border-radius: 20px; padding: 6px 14px; cursor: pointer; color: #166534; font-weight: 700; font-size: 12.5px; font-family: var(--font); transition: background 0.13s; flex-shrink: 0; }
  .alert-btn:hover { background: rgba(22,101,52,0.2); }
  .qr-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 13px 18px; display: flex; align-items: center; gap: 12px; width: 260px; flex-shrink: 0; box-shadow: var(--shadow); cursor: pointer; transition: border-color 0.13s; }
  .qr-card:hover { border-color: #9CA3AF; }
  .qr-icon-box { width: 46px; height: 46px; background: var(--text); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
  .qr-title { font-weight: 700; font-size: 14px; }
  .qr-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
  .overview-row { display: flex; gap: 14px; align-items: stretch; }
  .overview-left { flex: 1; }
  .overview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .overview-label { font-weight: 700; font-size: 11px; letter-spacing: 1.2px; color: var(--muted); text-transform: uppercase; }
  .sections-btn { display: flex; align-items: center; gap: 4px; background: var(--green); color: #fff; border: none; border-radius: 20px; padding: 5px 13px; font-size: 12.5px; cursor: pointer; font-family: var(--font); font-weight: 600; transition: background 0.13s; }
  .sections-btn:hover { background: var(--green-dark); }
  .sections-dropdown {position: fixed;inset: 0; z-index: 9; background: transparent;}
  .stat-cards { display: flex; gap: 10px; }
  .stat-card { flex: 1; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); }
  .stat-card-label { font-size: 11.5px; color: var(--muted); font-weight: 600; }
  .stat-card-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .stat-card-icon { color: var(--muted); display: flex; }
  .stat-card-value { font-size: 30px; font-weight: 800; color: var(--text); line-height: 1; }
  .completion-card { width: 260px; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow); flex-shrink: 0; }
  .card-title { font-weight: 700; font-size: 14px; margin-bottom: 14px; color: var(--text); }
  .completion-inner { display: flex; align-items: center; gap: 12px; }
  .completion-meta { flex: 1; }
  .completion-name { font-weight: 700; font-size: 13px; }
  .completion-sub { font-size: 12px; color: var(--muted); margin-top: 4px; line-height: 1.4; }
.completion-warn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  background: rgba(217, 119, 6, 0.12);
  color: var(--amber);
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
}  .bottom-row { display: flex; gap: 14px; align-items: flex-start; flex: 1; }
  .progress-card { display:flex; flex-direction:column; flex: 1; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; box-shadow: var(--shadow); min-width: 0; align-items: stretch;}
  .progress-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .view-all-btn { background: none; border: none; color: var(--maroon); font-weight: 700; cursor: pointer; font-size: 13px; font-family: var(--font); text-decoration: underline; text-underline-offset: 2px; padding: 0; }
  .student-list { display: flex; flex-direction: column; gap: 12px; }
  .student-row { display: flex; align-items: center; gap: 10px; flex:1}
  .student-info { flex: 1; min-width: 0; }
  .student-name { font-size: 13px; font-weight: 500; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .student-pct { font-size: 12px; color: var(--muted); width: 34px; text-align: right; flex-shrink: 0; font-weight: 600; }
  .no-results { text-align: center; color: var(--muted); font-size: 13px; padding: 20px 0; }
  .activity-card { width: 255px; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; box-shadow: var(--shadow); flex: 1 }
  .activity-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0 12px; gap: 8px; }
  .activity-empty-icon { width: 36px; height: 36px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; color: var(--light); }
  .activity-empty-text { font-size: 12.5px; color: var(--muted); text-align: center; line-height: 1.5; }
  .activity-empty-cta { font-size: 12px; color: var(--maroon); font-weight: 700; background: none; border: none; cursor: pointer; font-family: var(--font); text-decoration: underline; text-underline-offset: 2px; padding: 0; margin-top: 2px; }
  .scanner-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; }
  .scanner-modal { background: var(--white); border-radius: 20px; width: 360px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
  .scanner-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .scanner-title { font-weight: 700; font-size: 15px; color: var(--text); }
  .scanner-close { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: background 0.12s; }
  .scanner-close:hover { background: var(--border); }
  .scanner-body { position: relative; width: 360px; height: 360px; background: #000; overflow: hidden; }
  .scanner-video { width: 100%; height: 100%; object-fit: cover; }
  .scanner-frame { position: absolute; inset: 0; }
  .scanner-corner { position: absolute; width: 28px; height: 28px; border-color: #fff; border-style: solid; border-width: 0; }
  .scanner-corner.tl { top: 40px; left: 40px; border-top-width: 3px; border-left-width: 3px; border-radius: 4px 0 0 0; }
  .scanner-corner.tr { top: 40px; right: 40px; border-top-width: 3px; border-right-width: 3px; border-radius: 0 4px 0 0; }
  .scanner-corner.bl { bottom: 40px; left: 40px; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 4px; }
  .scanner-corner.br { bottom: 40px; right: 40px; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }
  .scanner-line { position: absolute; left: 44px; right: 44px; height: 2px; background: linear-gradient(90deg, transparent, #1B4332, transparent); animation: scan 2s ease-in-out infinite; top: 44px; }
  @keyframes scan { 0% { top: 44px; opacity: 1; } 90% { top: calc(100% - 44px); opacity: 1; } 100% { top: calc(100% - 44px); opacity: 0; } }
  .scanner-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: var(--muted); padding: 20px; text-align: center; font-size: 13px; }
  .scanner-hint { text-align: center; font-size: 12px; color: var(--muted); padding: 12px 20px 16px; }

  /* ── Calendar ── */
  .right-panel { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
  .cal-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; flex-shrink: 0; }
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .cal-month-label { font-size: 13px; font-weight: 700; color: var(--text); }
  .cal-nav-btn { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 3px; border-radius: 6px; transition: background 0.12s; }
  .cal-nav-btn:hover { background: var(--border); color: var(--text); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .cal-day-label { text-align: center; font-size: 10px; font-weight: 700; color: var(--muted); padding: 3px 0; text-transform: uppercase; letter-spacing: 0.4px; }
  .cal-cell { position: relative; text-align: center; font-size: 12px; padding: 5px 2px; border-radius: 6px; color: var(--text); cursor: default; line-height: 1; }
  .cal-cell.cal-empty { color: transparent; }
  .cal-cell.cal-today { background: var(--maroon); color: #fff; font-weight: 700; border-radius: 50%; }

  /* ── Dashboard layout ── */
  .dashboard-layout { display: flex; gap: 16px; align-items: flex-start; flex: 1; align-items: stretch; }
  .dashboard-left   { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;