"use client";

import {
  IconInfoCircle,
  IconLayoutGrid,
  IconUsersGroup,
  IconClipboardText,
  IconChartBar,
  IconLogout2,
  IconUsers,
  IconClock,
  IconCircleCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ── Sidebar constants ─────────────────────────────────────────────────
const COLLAPSED_W = 88
const EXPANDED_W  = 272
const RAIL_MARGIN = 16

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
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setDisplayed(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  return (
    <div
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      style={{ flex: 1, height: 10, background: "#E5E7EB", borderRadius: 5, overflow: "hidden" }}
    >
      <div style={{
        height: "100%", width: `${displayed}%`,
        background: progressColor(pct), borderRadius: 5, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}

export function DonutChart({ pct = 60 }: { pct?: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setDisplayed(pct));
    return () => cancelAnimationFrame(t);
  }, [pct]);
  // Minimum arc of 4% so even tiny values are clearly visible
  const minDash = (4 / 100) * circ;
  const rawDash = (displayed / 100) * circ;
  const dash = displayed > 0 ? Math.max(rawDash, minDash) : 0;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" aria-label={`${pct}% completion rate`} style={{ flexShrink: 0 }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E5E7EB" strokeWidth="11" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="#7B1D1D" strokeWidth="11"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="55" y="60" textAnchor="middle" fill="#111827" fontSize="15" fontWeight="700" fontFamily="sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

export function Calendar({ semEndDate, holidays = [], }: { semEndDate?: string | Date, holidays?: { name: string; date: string;}[]}) {
  const today = new Date();

  const semEnd = typeof semEndDate === "string" 
    ? (() => {
        const [year, month, day] = semEndDate.split("-").map(Number);
        return new Date(year, month - 1, day); 
      })()
    : semEndDate;
  
  const parsedHolidays = holidays.map((h) => {
    const [year, month, day] = h.date.split("-").map(Number);
    return { date: new Date(year, month - 1, day), name: h.name };
  });

  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const firstDay    = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const cells       = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const isToday = (d: number) =>
    d === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

  const isSemEnd = (d: number) => {
    if (!semEnd) return false;
    return d === semEnd.getDate() && current.month === semEnd.getMonth() && current.year === semEnd.getFullYear();
  }

  const getHoliday = (d: number) =>
    parsedHolidays.find(
      (h) => h.date.getDate() === d && h.date.getMonth() === current.month && h.date.getFullYear() === current.year
    );

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
        {cells.map((d, i) => {
          const cellIsToday = d && isToday(d);
          const cellIsSemEnd = d && isSemEnd(d);
          const cellHoliday = d ? getHoliday(d) : undefined;
          const hasLabel = cellIsToday || cellIsSemEnd || cellHoliday;

          return (
            <div 
              key={i} 
              className={[
                "cal-cell relative group",
                d === null ? "cal-empty" : "",
                cellIsToday ? "cal-today" : "",
                cellIsSemEnd ? "cal-sem-end": "",
                cellHoliday && !cellIsToday && !cellIsSemEnd ? "cal-holiday" : "",
                
              ].join(" ").trim()}
            >
              {d !== null ? <span className="cal-day-num">{d}</span> : null}

              {hasLabel && (
                <span className={`capitalize absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-white text-[12px] rounded px-2 py-0.5 whitespace-nowrap z-10 pointer-events-none shadow-md ${cellIsToday ? "text-maroon" : cellIsSemEnd ? "text-[var(--amber)]" : "text-[var(--green)]"}`}>
                  {cellIsToday ? "Today" : cellIsSemEnd ? "End of Semester" : cellHoliday?.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface InfoCircleProps {
  tooltip: string;
  size?: "sm" | "md" | "lg";
}

export function InfoCircle({ tooltip, size = "md" }: InfoCircleProps) {
  const dim = { sm: 14, md: 18, lg: 22 }[size];
  const iconSize = { sm: 13, md: 17, lg: 21 }[size];
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null);
  const [pinned, setPinned] = useState(false);

  const calcCoords = () => {
    if (!btnRef.current) return null;
    const r = btnRef.current.getBoundingClientRect();
    const placement = r.top >= window.innerHeight - r.bottom ? "top" : "bottom";
    const top = placement === "top" ? r.top - 8 : r.bottom + 8;
    const left = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    return { top, left, placement } as const;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinned) {
      setPinned(false);
      setCoords(null);
    } else {
      const c = calcCoords();
      if (c) { setCoords(c); setPinned(true); }
    }
  };

  const handleMouseEnter = () => {
    if (pinned) return;
    const c = calcCoords();
    if (c) setCoords(c);
  };

  const handleMouseLeave = () => {
    if (pinned) return;
    setCoords(null);
  };

  useEffect(() => {
    if (!pinned) return;
    const handler = () => { setPinned(false); setCoords(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [pinned]);

  const tooltipEl = coords && typeof document !== "undefined"
  ? createPortal(
      <span style={{ 
        position: "fixed",
        top: coords.placement === "top" ? Math.max(8, coords.top) : Math.min(coords.top, window.innerHeight - 8),
        left: coords.left,
        transform: coords.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0%)",
        background: "var(--white)",
        border: `1px solid ${pinned ? "var(--border)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--text)",
        lineHeight: 1.45,
        fontFamily: "var(--font-montserrat)",
        whiteSpace: "pre-line",
        minWidth: 200,
        maxWidth: 250,
        overflowY: "visible",
        pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        zIndex: 9999,
        textAlign: "justify",
      }}>
        {tooltip}
        <span style={{
          position: "absolute",
          left: `calc(50% + ${(btnRef.current?.getBoundingClientRect().left ?? 0) + (btnRef.current?.getBoundingClientRect().width ?? 0) / 2 - coords.left}px)`,
          transform: "translateX(-50%)",
          width: 0, height: 0, border: "6px solid transparent",
          ...(coords.placement === "top"
            ? { top: "100%", borderTopColor: "var(--border)" }
            : { bottom: "100%", borderBottomColor: "var(--border)" }),
        }} />
        <span style={{
          position: "absolute",
          left: `calc(50% + ${(btnRef.current?.getBoundingClientRect().left ?? 0) + (btnRef.current?.getBoundingClientRect().width ?? 0) / 2 - coords.left}px)`,
          transform: "translateX(-50%)",
          width: 0, height: 0, border: "5px solid transparent",
          ...(coords.placement === "top"
            ? { top: "calc(100% - 1px)", borderTopColor: "var(--white)" }
            : { bottom: "calc(100% - 1px)", borderBottomColor: "var(--white)" }),
        }} />
      </span>,
      document.body
    )
  : null;

  return (
    <span className="ic-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={btnRef}
        className={`ic-btn${pinned ? " ic-btn-active" : ""}`}
        aria-label="More info"
        aria-expanded={!!coords}
        style={{ width: dim, height: dim }}
        type="button"
        onClick={handleClick}
      >
        <IconInfoCircle size={iconSize} stroke={1.75} />
      </button>
      {tooltipEl}
    </span>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <img
              src="/icon.jpg" alt="NSTP Logo" className="sb-logo-img"
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              title={open ? "Collapse sidebar" : "Expand sidebar"}
            />
          </div>
          <div className="sb-logo-text">
            <div className="sb-logo-name">NSTP</div>
            <div className="sb-logo-sub">University of the Philippines Baguio</div>
          </div>
        </div>
        <div className="sb-logo-divider" />

        <nav className="sb-nav">
          <div className="sb-nav-section-label">Main</div>
          {navItems.map(({ label, Icon }) => (
            <button
              key={label}
              className={`sb-nav-btn${activeNav === label ? " sb-active" : ""}`}
              title={!open ? label : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onNavClick(label);
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
            <IconLogout2 size={20} stroke={1.75} />
            <span className="sb-logout-label">Log Out</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
export const dashboardStyles = `
  .db-root { display: flex; height: 100vh; background: var(--bg); font-family: var(--font); font-size: 14px; color: var(--text); overflow: hidden; }
  .sb-wrap { padding: ${RAIL_MARGIN}px; position: fixed; top: 0; left: 0; height: 100vh; z-index: 40; background: transparent; }
  .sb { width: ${EXPANDED_W}px; height: 100%; background: var(--green); display: flex; flex-direction: column; flex-shrink: 0; border-radius: 20px; overflow: hidden; transition: width 0.25s ease; }
  .sb.sb-closed { width: ${COLLAPSED_W}px; }
  .sb-logo { display: flex; align-items: center; gap: 10px; padding: 22px 18px 20px; overflow: hidden; flex-shrink: 0; }
  .sb.sb-closed .sb-logo { padding: 22px 0 20px; justify-content: center; gap: 0; }
  .sb-logo-img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.25); cursor: pointer; }
  .sb-logo-divider { height: 1px; background: rgba(255,255,255,0.25); margin: 0 18px 8px; }
  .sb.sb-closed .sb-logo-divider { width: 46px; margin: 0 auto 8px; }
  .sb-logo-text { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, width 0.25s ease; opacity: 1; width: auto; }
  .sb.sb-closed .sb-logo-text { opacity: 0; width: 0; pointer-events: none; }
  .sb-logo-name { color: #fff; font-family: var(--font-title); font-size: 30px; line-height: 1; letter-spacing: 0.5px; }
  .sb-logo-sub { color: var(--green-light); font-family: var(--font-sub); font-style: normal; font-size: 12px; margin-top: 4px; opacity: 0.9; white-space: nowrap; }
  .sb-nav { flex: 1; padding: 8px 0; overflow: hidden; }
  .sb-nav-section-label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: rgba(255,255,255,0.45); text-transform: uppercase; padding: 0 20px 4px; transition: opacity 0.2s ease; }
  .sb.sb-closed .sb-nav-section-label { opacity: 0; pointer-events: none; }
  .sb-nav-btn { width: 100%; display: flex; align-items: center; justify-content: flex-start; padding: 0 10px; background: transparent; border: none; cursor: pointer; color: #fff; font-size: 15px; font-family: var(--font); font-weight: 600; text-align: left; transition: color 0.13s; line-height: 1; margin: 4px 0; }
  .sb-nav-btn:hover:not(.sb-active) { color: rgba(255,255,255,0.8); }
  .sb-nav-btn.sb-active { color: var(--green-dark); }
  .sb-nav-pill { display: flex; align-items: center; gap: 14px; padding: 13px 20px; border-radius: 999px; width: 100%; transition: background 0.13s, width 0.25s ease, gap 0.25s ease; white-space: nowrap; overflow: hidden; }
  .sb.sb-closed .sb-nav-pill { width: 46px; height: 46px; padding: 0; margin-left: 7px; gap: 0; justify-content: center; }
  .sb-nav-btn.sb-active .sb-nav-pill { background: rgba(232,232,232,0.92); }
  .sb-nav-btn:hover:not(.sb-active) .sb-nav-pill { background: rgba(255,255,255,0.08); }
  .sb-nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
  .sb-nav-btn.sb-active .sb-nav-icon { color: var(--green); }
  .sb-nav-label { overflow: hidden; white-space: nowrap; transition: opacity 0.2s ease, max-width 0.25s ease; opacity: 1; max-width: 200px; }
  .sb.sb-closed .sb-nav-label { opacity: 0; max-width: 0; overflow: hidden; pointer-events: none; }
  .sb-footer { padding: 18px 18px 24px 30px; overflow: hidden; flex-shrink: 0; }
  .sb.sb-closed .sb-footer { padding: 18px 0 24px; display: flex; justify-content: center; align-items: center; }
  .sb-logout { display: flex; align-items: center; gap: 14px; background: transparent; border: none; cursor: pointer; color: #FCA5A5; font-size: 15px; font-family: var(--font); font-weight: 500; padding: 0; opacity: 0.85; transition: opacity 0.13s; white-space: nowrap; overflow: hidden; }
  .sb-logout:hover { opacity: 1; }
  .sb-logout-label { transition: opacity 0.2s ease, max-width 0.25s ease; opacity: 1; max-width: 200px; overflow: hidden; }
  .sb.sb-closed .sb-logout-label { opacity: 0; max-width: 0; pointer-events: none; }
  .sb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); z-index: 25; cursor: pointer; }
  .main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; width: 100%; padding-left: ${COLLAPSED_W + RAIL_MARGIN}px; }
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
  .body { flex: 1; overflow: auto; padding: 0 28px 28px; display: flex; flex-direction: column; gap: 8px; scrollbar-width: thin;}
  .top-row { display: flex; gap: 14px; justify-content: space-between; align-items: flex-start; }
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
  .card-title { font-weight: 700; font-size: 14px; color: var(--text); }
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
  .progress-card { display:flex; flex-direction:column; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 20px 18px; box-shadow: var(--shadow); min-width: 0; align-items: stretch;}
  .progress-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .view-all-btn { background: none; border: none; color: var(--maroon); font-weight: 700; cursor: pointer; font-size: 13px; font-family: var(--font); text-decoration: underline; text-underline-offset: 2px; padding: 0; }
  .student-list { display: flex; flex-direction: column; }
  .student-list--empty { flex: 1; }
  .student-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F9FAFB; }
  .student-row:last-child { border-bottom: none; }
  .student-info { flex: 1; min-width: 0; }
  .student-name { font-size: 13px; font-weight: 500; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .student-pct { font-size: 12px; color: var(--muted); width: 34px; text-align: right; flex-shrink: 0; font-weight: 600; }
  .no-results { text-align: center; color: var(--muted); font-size: 13px; padding: 20px 0; margin-bottom: auto; margin-top: auto; }
  .activity-card { width: 255px; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 0 18px 20px; box-shadow: var(--shadow); }
  .activity-card-scroll {
    overflow-y: auto; max-height: 235px;
    scrollbar-width: thin; scrollbar-color: #CFCFCB transparent;
    padding-right: 12px;
  }
  .activity-card-scroll::-webkit-scrollbar { width: 5px; }
  .activity-card-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  .activity-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px 0 12px; gap: 8px; }
  .activity-empty-icon { width: 36px; height: 36px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; color: var(--light); }
  .activity-empty-text { font-size: 12.5px; color: var(--muted); text-align: center; line-height: 1.5; }
  .activity-empty-cta { font-size: 12px; color: var(--maroon); font-weight: 700; background: none; border: none; cursor: pointer; font-family: var(--font); text-decoration: underline; text-underline-offset: 2px; padding: 0; margin-top: 2px; }
  /* ── Calendar ── */
  .right-panel { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
  .cal-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; flex-shrink: 0; width: 100%; font-size: clamp(10px, calc((100% - 32px) / 20), 13px); }
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85em; }
  .cal-month-label { font-size: 1em; font-weight: 700; color: var(--text); }
  .cal-nav-btn { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; align-items: center; padding: 0.2em; border-radius: 6px; transition: background 0.12s; }
  .cal-nav-btn:hover { background: var(--border); color: var(--text); }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.28em; }
  .cal-day-label { display: flex; align-items: center; justify-content: center; font-size: 0.72em; font-weight: 700; color: var(--muted); padding: 0 0 0.2em; text-transform: uppercase; letter-spacing: 0.04em; }
  .cal-cell { position: relative; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 1.05em; color: var(--text); cursor: default; line-height: 1; }
  .cal-day-num { position: relative; z-index: 1; }
  .cal-cell.cal-empty { visibility: hidden; }
  .cal-cell.cal-today,
  .cal-cell.cal-sem-end { color: #fff; font-weight: 700; }
  .cal-cell.cal-today::before,
  .cal-cell.cal-sem-end::before {
    content: "";
    position: absolute;
    width: 88%;
    height: 88%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    z-index: 0;
  }
  .cal-cell.cal-today::before { background: var(--maroon); }
  .cal-cell.cal-sem-end::before { background: var(--amber); }
  .cal-cell.cal-holiday {color: #fff; font-weight: 700; }
  .cal-cell.cal-holiday::after {
    content: "";
    position: absolute;
    width: 88%;
    height: 88%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    z-index: 0;
    background: var(--green);
  }
  
  /* ── Dashboard layout ── */
  .dashboard-layout { display: flex; gap: 16px; align-items: flex-start; flex: 1; align-items: stretch; }
  .dashboard-left   { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .ic-wrap { position: relative; display: inline-flex; align-items: center; }
  .ic-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; border: none; background: none; cursor: pointer; color: var(--light); padding: 0; transition: color 0.13s; flex-shrink: 0; }
  .ic-btn:hover { color: var(--muted); }
  .ic-btn-active { color: var(--muted) !important; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }

  /* ── Responsive dashboard layout ── */
  @media (max-width: 980px) {
    .dashboard-layout { flex-direction: column; }
    .right-panel { width: 100%; }
    .activity-card { width: 100%; }
  }

  /* ── Sub-page shared layout (My Students, Forms, Group Summary) ── */
  button.db-kpi-card {
    cursor: pointer;
    text-align: left;
    font-family: var(--font);
    font-size: inherit;
    color: inherit;
    width: 100%;
  }
  .page-tabs {
    display: flex; gap: 0; padding: 20px 0 0;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .page-tab {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 20px; background: none; border: none;
    font-size: 14px; font-weight: 600; font-family: var(--font);
    color: var(--muted); cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.13s;
  }
  .page-tab.page-tab-active { color: var(--maroon); border-bottom-color: var(--maroon); }
  .page-tab:hover:not(.page-tab-active) { color: var(--text); }

  .adv-table-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow);
  }
  .adv-table-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .adv-table-title { font-weight: 700; font-size: 15px; }
  .adv-table-count { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .adv-search-bar {
    display: flex; align-items: center; gap: 8px;
    border: 1.5px solid var(--maroon); border-radius: 999px;
    padding: 8px 18px; min-width: 280px; background: var(--white);
    transition: border-color 0.15s;
  }
  .adv-search-bar:focus-within { border-color: var(--green); }
  .adv-search-input {
    border: none; outline: none; font-size: 13.5px;
    font-family: var(--font); color: var(--text); width: 100%; background: transparent;
  }
  .adv-search-input::placeholder { color: var(--light); }
  .adv-filter-btn {
    display: flex; align-items: center; gap: 6px;
    border: 1.5px solid var(--green); border-radius: 999px;
    padding: 8px 18px; background: var(--white); font-size: 13.5px;
    font-family: var(--font); font-weight: 500; cursor: pointer;
    color: var(--green); transition: border-color 0.13s, color 0.13s;
  }
  .adv-filter-btn:hover { border-color: var(--green-dark); }
  .adv-table-wrapper {
    overflow-y: auto; max-height: calc(100vh - 420px); scrollbar-width: thin;
    scrollbar-color: #CFCFCB transparent;
  }
  .adv-table-wrapper::-webkit-scrollbar { width: 5px; }
  .adv-table-wrapper::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  .adv-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .adv-table thead tr { background: #F9FAFB; border-bottom: 1px solid var(--border); }
  .adv-table thead th {
    position: sticky; top: 0; z-index: 2; background: #F9FAFB;
    padding: 10px 20px; text-align: left; font-size: 11px; font-weight: 700;
    color: var(--maroon); letter-spacing: 0.8px; text-transform: uppercase;
  }
  .adv-table td {
    padding: 14px 20px; border-bottom: 1px solid #F3F4F6;
    vertical-align: middle; font-size: 13px;
  }
  .adv-table tbody tr:last-child td { border-bottom: none; }
  .adv-table tbody tr { cursor: pointer; transition: background 0.12s; }
  .adv-table tbody tr:hover td { background: #FAFAFA; }
  .adv-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600; white-space: nowrap;
  }
  .adv-empty { text-align: center; padding: 48px 0; color: var(--muted); font-size: 13px; }
  .adv-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-top: 1px solid var(--border); position: relative;
  }
  .adv-pagination-info { font-size: 12.5px; color: var(--muted); }
  .adv-pagination-controls {
    display: flex; align-items: center; gap: 4px;
    position: absolute; left: 50%; transform: translateX(-50%);
  }
  .adv-page-btn {
    width: 28px; height: 28px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--white);
    font-size: 12px; font-family: var(--font); font-weight: 500;
    color: var(--text); cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: background 0.12s, border-color 0.12s;
  }
  .adv-page-btn:hover:not(.adv-page-btn-active):not(:disabled) { background: #F9FAFB; border-color: #9CA3AF; }
  .adv-page-btn.adv-page-btn-active { background: var(--maroon); color: #fff; border-color: var(--maroon); font-weight: 700; }
  .adv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
`;