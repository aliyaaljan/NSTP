"use client"

import { useEffect, useState } from "react"
import { ChartStyles } from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { TYPE } from "@/lib/admin-typography"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 20

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

interface SectionProgressRow {
  id: string
  section: string
  pct: number
}

const ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 10,
} as const

function progressColor(pct: number) {
  if (pct >= 81) return COLORS.green
  if (pct >= 51) return COLORS.amber
  return COLORS.maroon
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function RowAvatar({ name }: { name: string }) {
  const size = 36
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#D1D5DB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        color: "#4B5563",
        flexShrink: 0,
        letterSpacing: "0.3px",
      }}
    >
      {initialsFromName(name)}
    </div>
  )
}

function SectionProgressRowItem({
  section,
  pct,
  showAvatar = false,
}: SectionProgressRow & { showAvatar?: boolean }) {
  return (
    <div className="anim-list-item" style={ROW_STYLE}>
      {showAvatar && <RowAvatar name={section} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...TYPE.body,
            fontWeight: 500,
            color: COLORS.textDark,
            marginBottom: 5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={section}
        >
          {section}
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${section}: ${pct}%`}
          style={{
            height: 8,
            borderRadius: 999,
            background: COLORS.track,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: 999,
              background: progressColor(pct),
            }}
          />
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.textGray,
          textAlign: "right",
          width: 40,
          flexShrink: 0,
        }}
      >
        {pct}%
      </div>
    </div>
  )
}

export default function SectionProgressPanel({
  rows,
  rowLabel = "sections",
}: {
  rows: SectionProgressRow[]
  rowLabel?: string
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [animKey, setAnimKey] = useState(0)

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  useEffect(() => {
    setCurrentPage(1)
    setAnimKey((k) => k + 1)
  }, [rows])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  function goToPage(page: number) {
    setCurrentPage(page)
    setAnimKey((k) => k + 1)
  }

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize)
    setCurrentPage(1)
    setAnimKey((k) => k + 1)
  }

  const showAvatars = rowLabel === "students"

  return (
    <>
      <ChartStyles />
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          key={animKey}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {paginatedRows.length === 0 ? (
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No progress data available
            </div>
          ) : (
            paginatedRows.map((row) => (
              <SectionProgressRowItem
                key={row.id}
                {...row}
                showAvatar={showAvatars}
              />
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
            Showing {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalRows)} of {totalRows}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => goToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${COLORS.border}`,
                background: "#fff",
                color: COLORS.textGray,
                cursor: currentPage === 1 ? "default" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1,
                fontSize: 14,
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
                    color: COLORS.textGray,
                  }}
                >
                  &#8230;
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: `1px solid ${COLORS.border}`,
                    background: p === currentPage ? COLORS.maroon : "#fff",
                    color: p === currentPage ? "#fff" : COLORS.textDark,
                    fontWeight: p === currentPage ? 700 : 500,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${COLORS.border}`,
                background: "#fff",
                color: COLORS.textGray,
                cursor: currentPage === totalPages ? "default" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1,
                fontSize: 14,
              }}
            >
              &#8250;
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
              Rows per page:
            </span>
            <select
              value={pageSize}
              onChange={(e) =>
                handlePageSizeChange(Number(e.target.value))
              }
              style={{
                ...TYPE.body,
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: "5px 10px",
                color: COLORS.textDark,
                background: "#fff",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  )
}