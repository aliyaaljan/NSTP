"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_DATE_RANGE_OPTIONS,
  filterAuditLogRows,
  type AuditLogDateRange,
  type AuditLogQuery,
  type AuditLogRow,
} from "@/lib/admin/audit-log"
import {
  buildAuditLogExportRequest,
  EXPORT_FILE_TYPE_OPTIONS,
} from "@/lib/admin/audit-log-export"
import AdminExportTriggerButton from "@/components/admin/AdminExportTriggerButton"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS } from "@/lib/admin-theme"

const COLORS = {
  textDark: ADMIN_COLORS.text,
  textGray: ADMIN_COLORS.muted,
  headerGreen: ADMIN_COLORS.green,
  fieldBg: "#F3F4F6",
  error: ADMIN_COLORS.maroon,
}

function ExportSelect({
  label,
  value,
  placeholder,
  onChange,
  children,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          ...TYPE.bodyBold,
          color: COLORS.textDark,
          display: "block",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            ...TYPE.body,
            fontStyle: "normal",
            color: value ? COLORS.textDark : COLORS.textGray,
            background: COLORS.fieldBg,
            border: "none",
            borderRadius: 6,
            padding: "12px 40px 12px 14px",
            appearance: "none",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {children}
        </select>
        <i
          className="ti ti-chevron-down"
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: 16,
            color: COLORS.textGray,
          }}
        />
      </div>
    </div>
  )
}

export default function AuditLogExportButton({
  entries,
  search,
  defaultAction,
  defaultDateRange,
}: {
  /** All audit rows available on the page (before client pagination). */
  entries: AuditLogRow[]
  search: string
  defaultAction: AuditLogQuery["action"]
  defaultDateRange: AuditLogDateRange
}) {
  const [open, setOpen] = useState(false)
  const [fileType, setFileType] = useState("")
  const [action, setAction] = useState(defaultAction)
  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [error, setError] = useState<string | null>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, close])

  const exportRows = useMemo(
    () =>
      filterAuditLogRows(entries, {
        search,
        action,
        dateRange,
        page: 1,
      }),
    [entries, search, action, dateRange]
  )

  function resetAndOpen() {
    setFileType("")
    setAction(defaultAction)
    setDateRange(defaultDateRange)
    setError(null)
    setOpen(true)
  }

  function handleExport() {
    const request = buildAuditLogExportRequest({ fileType, action, dateRange })
    if (!request) {
      setError("Select a file type to continue.")
      return
    }

    if (exportRows.length === 0) {
      setError("No audit events match the selected filters.")
      return
    }

    // Offload export generation completely to the server (supports CSV, XLSX, PDF)
    const params = new URLSearchParams({
      content: "activity",
      fileType: request.fileType,
    })

    if (request.action && request.action !== "all") {
      params.set("action", request.action)
    }
    if (request.dateRange && request.dateRange !== "all") {
      params.set("dateRange", request.dateRange)
    }
    if (search && search.trim()) {
      params.set("q", search.trim())
    }

    window.location.href = `/api/export?${params.toString()}`
    close()
  }

  const canExport = Boolean(
    fileType && action && dateRange && exportRows.length > 0
  )

  return (
    <>
      <AdminExportTriggerButton onClick={resetAndOpen} />

      {open && (
        <div
          role="presentation"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(44, 44, 42, 0.35)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-audit-log-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 16,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 22px",
                background: COLORS.headerGreen,
              }}
            >
              <h2
                id="export-audit-log-title"
                style={{ ...TYPE.h2, color: "#fff", margin: 0 }}
              >
                Export Audit Log
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 20 }} />
              </button>
            </div>

            <div
              style={{
                padding: "24px 22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <ExportSelect
                label="File Type:"
                value={fileType}
                placeholder="Select File Type"
                onChange={(value) => {
                  setFileType(value)
                  setError(null)
                }}
              >
                {EXPORT_FILE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ExportSelect>

              <ExportSelect
                label="Action:"
                value={action}
                placeholder="Select Action"
                onChange={(value) => {
                  setAction(value as AuditLogQuery["action"])
                  setError(null)
                }}
              >
                {AUDIT_ACTION_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ExportSelect>

              <ExportSelect
                label="Date Range:"
                value={dateRange}
                placeholder="Select Date Range"
                onChange={(value) => {
                  setDateRange(value as AuditLogDateRange)
                  setError(null)
                }}
              >
                {AUDIT_DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ExportSelect>

              <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
                {exportRows.length === 0
                  ? "No events match the selected filters."
                  : `${exportRows.length} event${
                      exportRows.length === 1 ? "" : "s"
                    } will be exported`}
                {search.trim()
                  ? ` (includes current search: "${search.trim()}")`
                  : ""}
              </p>

              {error && (
                <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>
                  {error}
                </p>
              )}
            </div>

            <div
              style={{
                padding: "0 22px 22px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport}
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_BODY,
                  color: "#fff",
                  background: canExport ? COLORS.headerGreen : "#A8B5AD",
                  border: "none",
                  borderRadius: 999,
                  padding: "10px 28px",
                  cursor: canExport ? "pointer" : "not-allowed",
                }}
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
