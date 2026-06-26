"use client"

import { useMemo, useState, useEffect } from "react"
import { Montserrat } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const COLORS = {
  maroonBase: "#7B1113",
  forestLight: "#2D6A4F",
  surface: "#F5F5F5",
  white: "#FFFFFF",
  text: "#2C2C2A",
  muted: "#888888",
  border: "#DDDDDD",
  disabled: "#BBBBBB",
  gold: "#F3AA2C",
  hover: "#F5F5F5",
}

export interface GeneratedStudent {
  id: string
  name: string
  studentId: string
  generatedAt: string
  scanned: boolean
  scannedAt?: string
}

export interface ScannedStudentsProps {
  students?: GeneratedStudent[]
  /*
    "card" — the dashboard widget
    "list" — open full searchable list
    */
  variant?: "card" | "list"
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export default function ScannedStudents({ students = [], variant = "card" }: ScannedStudentsProps) {
  const [expanded, setExpanded] = useState(variant === "list")
  const [isMobile, setIsMobile] = useState(false)
  const [isVerySmall, setIsVerySmall] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsVerySmall(width < 380)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const scannedCount = useMemo(() => students.filter((s) => s.scanned).length, [students])
  const total = students.length
  const pct = total === 0 ? 0 : Math.round((scannedCount / total) * 100)

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          width: "100%",
          textAlign: "left",
          background: COLORS.white,
          borderRadius: "14px",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          padding: isVerySmall ? "14px" : isMobile ? "16px" : "18px",
          cursor: "pointer",
          transition: "all 0.15s",
          fontFamily: montserrat.style.fontFamily,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.maroonBase
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isVerySmall ? "10px" : "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: isVerySmall ? "18px" : isMobile ? "20px" : "22px", 
              fontWeight: 700, 
              color: COLORS.text, 
              lineHeight: 1.1 
            }}>
              {scannedCount} / {total}
            </div>
            <div style={{ 
              fontSize: isVerySmall ? "10px" : isMobile ? "11px" : "12px", 
              color: COLORS.muted, 
              marginTop: "2px" 
            }}>
              Logged in and Scanned
            </div>
          </div>
          <div
            style={{
              width: isVerySmall ? "32px" : isMobile ? "36px" : "40px",
              height: isVerySmall ? "32px" : isMobile ? "36px" : "40px",
              borderRadius: "50%",
              background: COLORS.gold,
              color: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-users" style={{ fontSize: isVerySmall ? "15px" : isMobile ? "17px" : "19px" }} />
          </div>
        </div>
        <div style={{ 
          width: "100%", 
          height: isVerySmall ? "4px" : "6px", 
          borderRadius: "4px", 
          background: COLORS.surface, 
          overflow: "hidden", 
          marginTop: isVerySmall ? "8px" : "12px" 
        }}>
          <div style={{ width: `${pct}%`, height: "100%", background: COLORS.gold, borderRadius: "4px" }} />
        </div>
      </button>
    )
  }

  return <ScannedStudentsList 
    students={students} 
    total={total} 
    scannedCount={scannedCount} 
    pct={pct} 
    onCollapse={variant === "card" ? () => setExpanded(false) : undefined}
    isMobile={isMobile}
    isVerySmall={isVerySmall}
  />
}

/* Expanded List */
function ScannedStudentsList({
  students,
  total,
  scannedCount,
  pct,
  onCollapse,
  isMobile,
  isVerySmall,
}: {
  students: GeneratedStudent[]
  total: number
  scannedCount: number
  pct: number
  onCollapse?: () => void
  isMobile: boolean
  isVerySmall: boolean
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "scanned" | "pending">("all")

  const visible = useMemo(() => {
    return students
      .filter((s) => (filter === "all" ? true : filter === "scanned" ? s.scanned : !s.scanned))
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
  }, [students, filter, query])

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: "14px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        padding: isVerySmall ? "14px 12px" : isMobile ? "16px 16px" : "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: isVerySmall ? "10px" : isMobile ? "12px" : "16px",
        height: "100%",
        fontFamily: montserrat.style.fontFamily,
      }}
    >
      <div style={{ 
        display: "flex", 
        alignItems: isMobile ? "flex-start" : "center", 
        justifyContent: "space-between", 
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "8px" : "0",
        flexWrap: "wrap" 
      }}>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: isVerySmall ? "15px" : isMobile ? "17px" : "20px",
              color: COLORS.maroonBase,
              letterSpacing: "0.5px",
            }}
          >
            QR Attendance
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isVerySmall ? "6px" : "10px",
          width: isMobile ? "100%" : "auto",
          justifyContent: isMobile ? "space-between" : "flex-end",
        }}>
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Collapse"
              style={{
                width: isVerySmall ? "28px" : "30px",
                height: isVerySmall ? "28px" : "30px",
                borderRadius: "50%",
                border: `1px solid ${COLORS.border}`,
                background: COLORS.white,
                color: COLORS.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: montserrat.style.fontFamily,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.hover
                e.currentTarget.style.borderColor = COLORS.maroonBase
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.white
                e.currentTarget.style.borderColor = COLORS.border
              }}
            >
              <i className="ti ti-x" style={{ fontSize: isVerySmall ? "12px" : "14px" }} />
            </button>
          )}
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        gap: isVerySmall ? "6px" : "10px", 
        flexWrap: "wrap", 
        alignItems: "center",
        flexDirection: isMobile ? "column" : "row",
      }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isVerySmall ? "6px" : "8px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "999px",
            padding: isVerySmall ? "5px 10px" : isMobile ? "6px 12px" : "7px 14px",
            flex: 1,
            minWidth: isVerySmall ? "100%" : "140px",
            width: isMobile ? "100%" : "auto",
            fontFamily: montserrat.style.fontFamily,
          }}
        >
          <i className="ti ti-search" style={{ fontSize: isVerySmall ? "12px" : "14px", color: COLORS.disabled }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student..."
            style={{ 
              border: "none", 
              outline: "none", 
              fontSize: isVerySmall ? "11px" : isMobile ? "12px" : "13px", 
              flex: 1, 
              color: COLORS.text, 
              background: "transparent",
              minWidth: "60px",
              fontFamily: montserrat.style.fontFamily,
            }}
          />
        </div>

        <div style={{ 
          display: "flex", 
          gap: isVerySmall ? "4px" : "6px",
          width: isMobile ? "100%" : "auto",
          justifyContent: isMobile ? "stretch" : "flex-start",
        }}>
          {([
            { key: "all", label: "All" },
            { key: "scanned", label: "✓" },
            { key: "pending", label: "⏱" },
          ] as const).map((opt) => {
            const active = filter === opt.key
            const label = isVerySmall ? opt.key === "all" ? "All" : opt.key === "scanned" ? "✓" : "⏱" : opt.key === "all" ? "All" : opt.key === "scanned" ? "Scanned" : "Pending"
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                style={{
                  fontSize: isVerySmall ? "10px" : isMobile ? "10px" : "11px",
                  fontWeight: 600,
                  padding: isVerySmall ? "4px 8px" : isMobile ? "5px 10px" : "6px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? COLORS.maroonBase : COLORS.border}`,
                  background: active ? "rgba(123,17,19,0.08)" : COLORS.white,
                  color: active ? COLORS.maroonBase : COLORS.muted,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flex: isMobile ? 1 : "auto",
                  transition: "all 0.15s",
                  fontFamily: montserrat.style.fontFamily,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = COLORS.hover
                    e.currentTarget.style.borderColor = COLORS.maroonBase
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = COLORS.white
                    e.currentTarget.style.borderColor = COLORS.border
                  }
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        display: "flex", 
        flexDirection: "column", 
        gap: isVerySmall ? "6px" : isMobile ? "6px" : "8px",
        maxHeight: isVerySmall ? "200px" : isMobile ? "280px" : "400px",
      }}>
        {visible.length === 0 && (
          <div style={{ 
            fontSize: isVerySmall ? "11px" : isMobile ? "11px" : "12px", 
            color: COLORS.disabled, 
            textAlign: "center", 
            padding: isVerySmall ? "20px 0" : "30px 0",
            fontFamily: montserrat.style.fontFamily,
          }}>
            No students match this view.
          </div>
        )}
        {visible.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: isVerySmall ? "8px" : isMobile ? "10px" : "14px",
              padding: isVerySmall ? "6px 8px" : isMobile ? "8px 10px" : "10px 12px",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              fontFamily: montserrat.style.fontFamily,
            }}
          >
            <span
              style={{
                width: isVerySmall ? "28px" : isMobile ? "30px" : "36px",
                height: isVerySmall ? "28px" : isMobile ? "30px" : "36px",
                flexShrink: 0,
                borderRadius: "50%",
                background: COLORS.maroonBase,
                color: COLORS.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isVerySmall ? "9px" : isMobile ? "10px" : "12px",
                fontWeight: 700,
                fontFamily: montserrat.style.fontFamily,
              }}
            >
              {initials(s.name)}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: isVerySmall ? "11px" : isMobile ? "12px" : "13px", 
                fontWeight: 600, 
                color: COLORS.text, 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis",
                fontFamily: montserrat.style.fontFamily,
              }}>
                {s.name}
              </div>
              <div style={{ 
                fontSize: isVerySmall ? "9px" : isMobile ? "10px" : "11px", 
                color: COLORS.muted,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap",
                fontFamily: montserrat.style.fontFamily,
              }}>
                <span>Student No: {s.studentId}</span>
                <span style={{ display: isVerySmall ? "none" : "inline" }}>·</span>
                <span>QR generated at {s.generatedAt}</span>
              </div>
            </div>

            {s.scanned ? (
              <span style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "flex-end", 
                gap: "1px",
                flexShrink: 0,
              }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isVerySmall ? "2px" : "4px",
                    fontSize: isVerySmall ? "9px" : isMobile ? "10px" : "11px",
                    fontWeight: 700,
                    color: COLORS.forestLight,
                    background: "rgba(45,106,79,0.10)",
                    padding: isVerySmall ? "2px 6px" : isMobile ? "3px 8px" : "4px 10px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                    fontFamily: montserrat.style.fontFamily,
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: isVerySmall ? "8px" : "11px" }} />
                  {!isVerySmall && "Scanned"}
                </span>
                {s.scannedAt && !isVerySmall && (
                  <span style={{ fontSize: isVerySmall ? "8px" : "10px", color: COLORS.muted, fontFamily: montserrat.style.fontFamily }}>
                    {s.scannedAt}
                  </span>
                )}
              </span>
            ) : (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: isVerySmall ? "2px" : "4px",
                  fontSize: isVerySmall ? "9px" : isMobile ? "10px" : "11px",
                  fontWeight: 700,
                  color: COLORS.gold,
                  background: "rgba(243,170,44,0.12)",
                  padding: isVerySmall ? "2px 6px" : isMobile ? "3px 8px" : "4px 10px",
                  borderRadius: "999px",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  fontFamily: montserrat.style.fontFamily,
                }}
              >
                <i className="ti ti-clock" style={{ fontSize: isVerySmall ? "8px" : "11px" }} />
                {!isVerySmall && "Pending"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}