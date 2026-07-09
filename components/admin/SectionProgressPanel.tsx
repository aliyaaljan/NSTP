"use client"

import { useEffect, useState } from "react"
import ListPagination from "@/components/shared/ListPagination"
import { ChartStyles } from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { TYPE } from "@/lib/admin-typography"

const PAGE_SIZE = 20

interface SectionProgressRow {
  id: string
  section: string
  pct: number
}

const SECTION_PROGRESS_GRID = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1fr) 2fr auto",
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
    <div className="anim-list-item" style={SECTION_PROGRESS_GRID}>
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

export default function SectionProgressPanel({
  rows,
  rowLabel = "sections",
}: {
  rows: SectionProgressRow[]
  rowLabel?: string
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [animKey, setAnimKey] = useState(0)

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

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
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  function goToPage(page: number) {
    setCurrentPage(page)
    setAnimKey((k) => k + 1)
  }

  return (
    <>
      <ChartStyles />
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <SectionProgressHeader />
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
              <SectionProgressRowItem key={row.id} {...row} />
            ))
          )}
        </div>

        <ListPagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalRows}
          pageSize={PAGE_SIZE}
          onPageChange={goToPage}
        />
      </div>
    </>
  )
}
