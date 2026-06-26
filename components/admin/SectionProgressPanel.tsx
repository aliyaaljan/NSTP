"use client"

import { useEffect, useState } from "react"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"

const PAGE_SIZE = 10

interface SectionProgressRow {
  id: string
  section: string
  pct: number
}

const SECTION_PROGRESS_GRID = {
  display: "grid",
  gridTemplateColumns: "150px 1fr auto",
  columnGap: 14,
  alignItems: "center",
} as const

function progressColor(pct: number) {
  if (pct >= 81) return COLORS.green
  if (pct >= 51) return COLORS.amber
  return COLORS.maroon
}

function SectionProgressHeader() {
  return (
    <div style={{ ...SECTION_PROGRESS_GRID, marginBottom: 10 }}>
      <span style={{ ...TYPE.body, color: COLORS.textDark }}>Section</span>
      <span />
      <span
        style={{ ...TYPE.body, color: COLORS.textDark, textAlign: "right" }}
      >
        Progress
      </span>
    </div>
  )
}

function SectionProgressRowItem({ section, pct }: SectionProgressRow) {
  return (
    <div style={SECTION_PROGRESS_GRID}>
      <div style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>{section}</div>
      <div
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
      <div
        style={{
          ...TYPE.bodyBold,
          color: COLORS.textGray,
          textAlign: "right",
          paddingLeft: 12,
        }}
      >
        {pct}%
      </div>
    </div>
  )
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    padding: "2px 6px",
    color: disabled ? COLORS.light : COLORS.textGray,
    fontSize: 15,
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontFamily: FONT_BODY,
  }
}

function pageNumStyle(active: boolean): React.CSSProperties {
  return {
    background: "none",
    border: "none",
    minWidth: 22,
    padding: "2px 4px",
    color: active ? COLORS.textDark : COLORS.textGray,
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: FONT_BODY,
    opacity: active ? 1 : 0.75,
  }
}

export default function SectionProgressPanel({
  rows,
  rowLabel = "sections",
}: {
  rows: SectionProgressRow[]
  rowLabel?: string
}) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const start = totalRows === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const end = Math.min(currentPage * PAGE_SIZE, totalRows)
  const paginatedRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const rangeLabel =
    totalRows === 0
      ? `No ${rowLabel} to show`
      : totalRows === 1
        ? `Showing 1 of 1 ${rowLabel.slice(0, -1)}`
        : `Showing ${start}–${end} of ${totalRows} ${rowLabel}`

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <SectionProgressHeader />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            <SectionProgressRowItem key={row.id} {...row} />
          ))
        )}
      </div>

      {totalRows > 0 && (
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            marginTop: 16,
            borderTop: `1px solid ${COLORS.border}`,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
            {rangeLabel} · Page {currentPage} of {totalPages}
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={navBtnStyle(currentPage === 1)}
              aria-label="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                style={pageNumStyle(p === currentPage)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              style={navBtnStyle(currentPage === totalPages)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
