"use client"

import { TYPE } from "@/lib/admin-typography"
import { COLORS } from "@/components/admin/import/import-ui"
import { buildErrorCsv } from "@/lib/admin/import/error-csv"
import type { ImportColumnSpec, ErrorRow } from "@/lib/admin/import/types"

export default function ImportErrorCsvButton({
  columns,
  rows,
  fileName,
}: {
  columns: readonly ImportColumnSpec[]
  rows: ErrorRow[]
  fileName: string
}) {
  if (rows.length === 0) return null

  function handleDownload() {
    const csv = buildErrorCsv(columns, rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      style={{
        ...TYPE.caption,
        fontWeight: 700,
        color: COLORS.headerGreen,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <i className="ti ti-download" style={{ fontSize: 14 }} />
      Download error rows (.csv)
    </button>
  )
}
