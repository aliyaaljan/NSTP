"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import {
  buildExportAnalyticsRequest,
  EXPORT_ALL_SECTIONS_VALUE,
  EXPORT_CONTENT_OPTIONS,
  EXPORT_FILE_TYPE_OPTIONS,
  type ExportSectionOption,
} from "@/lib/admin/export-analytics"
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

export default function DashboardExportButton({
  sections,
}: {
  /** Rows from `section` table — `sectionId` maps to `section.section_id`. */
  sections: ExportSectionOption[]
}) {
  const [open, setOpen] = useState(false)
  const [fileType, setFileType] = useState("")
  const [sectionId, setSectionId] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const close = useCallback(() => {
    if (!isPending) setOpen(false)
  }, [isPending])

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

  function handleExport() {
    setError(null)

    startTransition(async () => {
      try {
        const queryParams = new URLSearchParams()
        queryParams.append("sectionId", sectionId || "all")
        queryParams.append("content", content || "all")
        queryParams.append("fileType", fileType)
        // request file stresm
        const response = await fetch(`/api/export?${queryParams.toString()}`, {
          method: "GET",
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(errorText || "Export failed to generate.")
        }

        // convert response to a blob
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        // extract filename from headers, fallback to a default
        const disposition = response.headers.get("Content-Disposition")
        let filename = `NSTP_Export_${Date.now()}.${fileType}`
        if (disposition && disposition.includes("filename=")) {
          filename = disposition.split("filename=")[1].replace(/["']/g, "")
        }

        // trigger DL
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()

        // cleanup memory
        a.remove()
        window.URL.revokeObjectURL(url)

        close()
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  function resetAndOpen() {
    setFileType("")
    setSectionId("")
    setContent("")
    setError(null)
    setOpen(true)
  }

  const canExport = Boolean(fileType && sectionId && content)

  return (
    <>
      <button
        type="button"
        onClick={resetAndOpen}
        style={{
          fontFamily: FONT_BODY,
          fontSize: "12.5px",
          fontWeight: 600,
          color: "#fff",
          background: ADMIN_COLORS.green,
          border: "none",
          borderRadius: 20,
          padding: "5px 13px",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        <i className="ti ti-upload" style={{ fontSize: 16 }} />
        Export
      </button>

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
            aria-labelledby="export-analytics-title"
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
                id="export-analytics-title"
                style={{ ...TYPE.h2, color: "#fff", margin: 0 }}
              >
                Export Analytics
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
                onChange={setFileType}
              >
                {EXPORT_FILE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ExportSelect>

              <ExportSelect
                label="Section:"
                value={sectionId}
                placeholder="Select Section"
                onChange={setSectionId}
              >
                <option value={EXPORT_ALL_SECTIONS_VALUE}>All Sections</option>
                {sections.map((section) => (
                  <option key={section.sectionId} value={section.sectionId}>
                    Section {section.name}
                  </option>
                ))}
              </ExportSelect>

              <ExportSelect
                label="Content:"
                value={content}
                placeholder="Select Content"
                onChange={setContent}
              >
                {EXPORT_CONTENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ExportSelect>

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
                {isPending ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
