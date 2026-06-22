"use client"

import { useMemo, useState } from "react"

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

// Manual student data
const DEFAULT_STUDENTS: GeneratedStudent[] = [
  { id: "1", name: "Jeremy  Padayao", studentId: "NSTP-A", generatedAt: "7:50 AM", scanned: true, scannedAt: "8:15 AM" },
  { id: "2", name: "Tofu Lammard", studentId: "NSTP-B", generatedAt: "7:40 AM", scanned: true, scannedAt: "7:58 AM" },
  { id: "3", name: "Rhona Sharine Lopez", studentId: "NSTP-C", generatedAt: "7:30 AM", scanned: true, scannedAt: "7:45 AM" },
  { id: "4", name: "Kim Mingyu", studentId: "NSTP-D", generatedAt: "8:00 AM", scanned: true, scannedAt: "8:09 AM" },
  { id: "5", name: "Diego Hartono", studentId: "NSTP-E", generatedAt: "8:05 AM", scanned: false },
  { id: "6", name: "Anya Querubin", studentId: "NSTP-F", generatedAt: "8:08 AM", scanned: false },
  { id: "7", name: "Marcus Tibayan", studentId: "NSTP-G", generatedAt: "8:11 AM", scanned: true, scannedAt: "8:20 AM" },
  { id: "8", name: "Liesel Funk", studentId: "NSTP-H", generatedAt: "8:14 AM", scanned: false },
]

export default function ScannedStudents({ students = DEFAULT_STUDENTS, variant = "card" }: ScannedStudentsProps) {
  const [expanded, setExpanded] = useState(variant === "list")

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
          padding: "18px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: COLORS.text, lineHeight: 1.1 }}>
              {scannedCount} / {total}
            </div>
            <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "4px" }}>Logged in and Scanned</div>
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: COLORS.gold,
              color: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-users" style={{ fontSize: "19px" }} />
          </div>
        </div>
        <div style={{ width: "100%", height: "6px", borderRadius: "4px", background: COLORS.surface, overflow: "hidden", marginTop: "12px" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: COLORS.gold, borderRadius: "4px" }} />
        </div>
      </button>
    )
  }

  return <ScannedStudentsList students={students} total={total} scannedCount={scannedCount} pct={pct} onCollapse={variant === "card" ? () => setExpanded(false) : undefined} />
}

/* Expanded List */
function ScannedStudentsList({
  students,
  total,
  scannedCount,
  pct,
  onCollapse,
}: {
  students: GeneratedStudent[]
  total: number
  scannedCount: number
  pct: number
  onCollapse?: () => void
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
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div
            style={{
              fontFamily: "'Cormorant', Georgia, serif",
              fontWeight: 700,
              fontSize: "20px",
              color: COLORS.maroonBase,
              letterSpacing: "0.5px",
            }}
          >
            SCANNED STUDENTS
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: COLORS.surface,
              borderRadius: "999px",
              padding: "8px 16px",
            }}
          >
            <i className="ti ti-users" style={{ fontSize: "16px", color: COLORS.gold }} />
            <span style={{ fontSize: "14px", fontWeight: 700, color: COLORS.text }}>
              {scannedCount} / {total}
            </span>
            <span style={{ fontSize: "11px", color: COLORS.muted }}>scanned</span>
          </div>
          {onCollapse && (
            <button
              onClick={onCollapse}
              aria-label="Collapse"
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                border: `1px solid ${COLORS.border}`,
                background: COLORS.white,
                color: COLORS.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="ti ti-x" style={{ fontSize: "14px" }} />
            </button>
          )}
        </div>
      </div>

      <div style={{ width: "100%", height: "8px", borderRadius: "5px", background: COLORS.surface, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: COLORS.gold, borderRadius: "5px", transition: "width 0.3s ease" }} />
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "999px",
            padding: "7px 14px",
            flex: 1,
            minWidth: "180px",
          }}
        >
          <i className="ti ti-search" style={{ fontSize: "14px", color: COLORS.disabled }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student name..."
            style={{ border: "none", outline: "none", fontSize: "13px", flex: 1, color: COLORS.text, background: "transparent" }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {([
            { key: "all", label: "All" },
            { key: "scanned", label: "Scanned" },
            { key: "pending", label: "Pending" },
          ] as const).map((opt) => {
            const active = filter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${active ? COLORS.maroonBase : COLORS.border}`,
                  background: active ? "rgba(123,17,19,0.08)" : COLORS.white,
                  color: active ? COLORS.maroonBase : COLORS.muted,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        {visible.length === 0 && (
          <div style={{ fontSize: "12px", color: COLORS.disabled, textAlign: "center", padding: "30px 0" }}>
            No students match this view.
          </div>
        )}
        {visible.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
            }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                flexShrink: 0,
                borderRadius: "50%",
                background: COLORS.maroonBase,
                color: COLORS.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {initials(s.name)}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.name}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                {s.studentId} · QR generated {s.generatedAt}
              </div>
            </div>

            {s.scanned ? (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: COLORS.forestLight,
                    background: "rgba(45,106,79,0.10)",
                    padding: "4px 10px",
                    borderRadius: "999px",
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: "11px" }} />
                  Scanned
                </span>
                {s.scannedAt && <span style={{ fontSize: "10px", color: COLORS.muted }}>{s.scannedAt}</span>}
              </span>
            ) : (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: COLORS.gold,
                  background: "rgba(243,170,44,0.12)",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-clock" style={{ fontSize: "11px" }} />
                Pending
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}