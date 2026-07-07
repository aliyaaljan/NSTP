"use client"

import { useEffect, useState, useTransition } from "react"
import { getFormTemplateUrlForAdmin } from "@/lib/admin/form-list-actions"
import { formatFormDeadline, type FormListRow } from "@/lib/admin/form-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

export default function FormDetailModal({
  form,
  onClose,
}: {
  form: FormListRow
  onClose: () => void
}) {
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, startDownload] = useTransition()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  function handleDownload() {
    if (form.isSample || !form.hasTemplate) return
    setDownloadError(null)
    startDownload(async () => {
      const result = await getFormTemplateUrlForAdmin(form.formRequirementId)
      if (!result.ok) {
        setDownloadError(result.error)
        return
      }
      window.open(result.url, "_blank", "noopener,noreferrer")
    })
  }

  const deadline = formatFormDeadline(form.dueDate)

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
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
        aria-labelledby="form-detail-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "18px 22px",
            background: COLORS.maroon,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 id="form-detail-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
              {form.formName}
            </h2>
            <p style={{ ...TYPE.caption, color: "rgba(255,255,255,0.85)", margin: "6px 0 0" }}>
              {form.sectionName} · {form.adviserName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Description
            </div>
            <div style={{ ...TYPE.body, color: COLORS.textDark, fontWeight: 500 }}>
              {form.description?.trim() || "No description provided."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div
                style={{
                  ...TYPE.caption,
                  color: COLORS.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Deadline
              </div>
              <div style={{ ...TYPE.body, color: COLORS.textDark, fontWeight: 600 }}>
                {deadline.date}
                {deadline.time ? ` at ${deadline.time}` : ""}
              </div>
            </div>
            <div>
              <div
                style={{
                  ...TYPE.caption,
                  color: COLORS.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                Scope
              </div>
              <div style={{ ...TYPE.body, color: COLORS.textDark, fontWeight: 600 }}>
                {form.isGlobal ? "Global default" : "Section-specific"}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Template
            </div>
            {form.isSample ? (
              <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
                Sample preview row — no template file is stored.
              </div>
            ) : form.hasTemplate ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: COLORS.track,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      ...TYPE.body,
                      color: COLORS.textDark,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {form.templateFileName ?? "Form template"}
                  </div>
                  <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                    Official form document
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{
                    ...TYPE.bodyBold,
                    fontFamily: FONT_HEADING,
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 16px",
                    cursor: isDownloading ? "wait" : "pointer",
                    background: COLORS.green,
                    color: "#fff",
                    flexShrink: 0,
                    opacity: isDownloading ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-download" style={{ marginRight: 6 }} />
                  {isDownloading ? "Opening…" : "Download"}
                </button>
              </div>
            ) : (
              <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
                No template file has been uploaded for this form.
              </div>
            )}
            {downloadError && (
              <div style={{ ...TYPE.caption, color: COLORS.maroon, marginTop: 8 }}>
                {downloadError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
