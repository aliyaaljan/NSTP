"use client"

import Link from "next/link"
import type { ReactNode } from "react"

export type KpiStatCardProps = {
  icon: string
  label: string
  value: string | number
  valueSuffix?: string
  badge?: { text: string; bg: string; color: string }
  note?: string
  href?: string
  scrollTarget?: string
  onClick?: () => void
  isActive?: boolean
  static?: boolean
}

function scrollToElement(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function KpiStatCardContent({
  icon,
  label,
  value,
  valueSuffix,
  badge,
  note,
}: Omit<KpiStatCardProps, "href" | "scrollTarget" | "onClick" | "isActive" | "static">) {
  return (
    <>
      <div className="db-kpi-header">
        <span className="db-kpi-label">{label}</span>
      </div>
      <div className="db-kpi-value">
        {value}
        {valueSuffix && <span className="db-kpi-value-suffix">{valueSuffix}</span>}
      </div>
      {(badge || note) && (
        <div className="db-kpi-meta">
          {badge && (
            <span
              className="db-kpi-badge"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.text}
            </span>
          )}
          {note && <span className="db-kpi-note">{note}</span>}
        </div>
      )}
      <div className="db-kpi-deco" aria-hidden="true">
        <i className={`ti ${icon}`} />
      </div>
    </>
  )
}

export function KpiStatCard({
  icon,
  label,
  value,
  valueSuffix,
  badge,
  note,
  href,
  scrollTarget,
  onClick,
  isActive,
  static: isStatic,
}: KpiStatCardProps) {
  const className = [
    "db-kpi-card",
    isStatic && "db-kpi-card--static",
    !isStatic && (href || scrollTarget || onClick) && "db-kpi-card--interactive",
  ]
    .filter(Boolean)
    .join(" ")

  const content = (
    <KpiStatCardContent
      icon={icon}
      label={label}
      value={value}
      valueSuffix={valueSuffix}
      badge={badge}
      note={note}
    />
  )

  if (scrollTarget) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => scrollToElement(scrollTarget)}
        aria-label={`${label}: ${value}`}
      >
        {content}
      </button>
    )
  }

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-label={`${label}: ${value}`}
      >
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={`${label}: ${value}`}
        aria-pressed={isActive}
      >
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

export function KpiStatCardGrid({
  children,
  columns = 4,
}: {
  children: ReactNode
  columns?: number
}) {
  return (
    <div
      className="db-kpi-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {children}
    </div>
  )
}

export function ChartStyles() {
  return (
    <style>{`
      /* ── KPI Stat Cards ───────────────────────────────────────────────── */
      .db-kpi-grid {
        display: grid;
        gap: 20px;
        margin-bottom: 20px;
      }
      .db-kpi-card {
        position: relative;
        flex: 1;
        display: block;
        width: 100%;
        text-align: left;
        background: var(--white);
        background-image: linear-gradient(to bottom right, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        text-decoration: none;
        color: inherit;
      }
      .db-kpi-card--interactive {
        cursor: pointer;
      }
      .db-kpi-card--static {
        cursor: default;
      }
      button.db-kpi-card {
        font: inherit;
      }
      .db-kpi-card--interactive:hover {
        border-color: var(--maroon);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -5px rgba(123, 29, 29, 0.15), 0 8px 10px -6px rgba(123, 29, 29, 0.1);
      }
      .db-kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        position: relative;
        z-index: 1;
      }
      .db-kpi-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .db-kpi-value {
        font-size: 34px;
        font-weight: 800;
        line-height: 1.1;
        font-family: var(--font);
        color: var(--text);
        position: relative;
        z-index: 1;
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .db-kpi-value-suffix {
        font-size: 15px;
        font-weight: 600;
        color: var(--muted);
        -webkit-text-fill-color: var(--muted);
      }
      .db-kpi-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
        position: relative;
        z-index: 1;
      }
      .db-kpi-badge {
        font-size: 11px;
        font-weight: 700;
        border-radius: 12px;
        padding: 2px 8px;
        line-height: 1.3;
      }
      .db-kpi-note {
        font-size: 11px;
        font-weight: 500;
        color: var(--muted);
        line-height: 1.3;
      }
      .db-kpi-deco {
        position: absolute;
        right: -15px;
        bottom: -23px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.12;
        color: var(--muted);
        pointer-events: none;
        z-index: 0;
        transition: all 0.3s ease;
      }
      .db-kpi-deco .ti {
        font-size: 110px;
        line-height: 1;
      }
      .db-kpi-card--interactive:hover .db-kpi-deco {
        opacity: 0.2;
        transform: rotate(0deg) scale(1.08);
      }

      /* ── List Animation ───────────────────────────────────────────────── */
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .anim-list-item {
        animation: fadeSlideIn 0.3s ease both;
      }
      .anim-list-item:nth-child(1)  { animation-delay: 0ms; }
      .anim-list-item:nth-child(2)  { animation-delay: 40ms; }
      .anim-list-item:nth-child(3)  { animation-delay: 80ms; }
      .anim-list-item:nth-child(4)  { animation-delay: 120ms; }
      .anim-list-item:nth-child(5)  { animation-delay: 160ms; }
      .anim-list-item:nth-child(6)  { animation-delay: 200ms; }
      .anim-list-item:nth-child(7)  { animation-delay: 240ms; }
      .anim-list-item:nth-child(8)  { animation-delay: 280ms; }
      .anim-list-item:nth-child(9)  { animation-delay: 320ms; }
      .anim-list-item:nth-child(10) { animation-delay: 360ms; }
    `}</style>
  )
}