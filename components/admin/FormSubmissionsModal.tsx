"use client"

import { useEffect, useState, useTransition } from "react"
import {
  getFormSubmissionsForAdmin,
  getSubmissionDownloadUrlForAdmin,
  type FormSubmissionListEntry,
} from "@/lib/admin/form-list-actions"
import { formatFormDeadline, type FormListRow } from "@/lib/admin/form-list"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const STATUS_STYLE: Record<
  FormSubmissionListEntry["status"],
  { label: string; bg: string; color: string }
> = {
  missing: { label: "Not submitted", bg: "#FEE2E2", color: "#991B1B" },
  submitted: { label: "Submitted", bg: "#DBEAFE", color: "#1E40AF" },
  approved: { label: "Approved", bg: "#D1FAE5", color: "#065F46" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#991B1B" },
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function FormSubmissionsModal({
  form,
  onClose,
}: {
  form: FormListRow
  onClose: () => void
}) {
  const [entries, setEntries] = useState<FormSubmissionListEntry[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, startLoad] = useTransition()
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

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

  useEffect(() => {
    if (form.isSample) return
    startLoad(async () => {
      const result = await getFormSubmissionsForAdmin(
        form.formRequirementId,
        form.sectionId
      )
      if (!result.ok) {
        setLoadError(result.error)
        return
      }
      setEntries(result.data)
    })
  }, [form.formRequirementId, form.sectionId, form.isSample])

  function handleDownload(submissionId: string) {
    setDownloadError(null)
    setDownloadingId(submissionId)
    void (async () => {
      const result = await getSubmissionDownloadUrlForAdmin(submissionId)
      setDownloadingId(null)
      if (!result.ok) {
        setDownloadError(result.error)
        return
      }
      window.open(result.url, "_blank", "noopener,noreferrer")
    })()
  }

  const submittedCount = entries.filter((entry) => entry.status !== "missing").length

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
        aria-labelledby="form-submissions-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "min(88vh, 720px)",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
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
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 id="form-submissions-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
              Submissions
            </h2>
            <p style={{ ...TYPE.caption, color: "rgba(255,255,255,0.85)", margin: "6px 0 0" }}>
              {form.formName} · {form.sectionName} Section
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

        <div style={{ padding: "16px 22px 0", flexShrink: 0 }}>
          <div style={{ ...TYPE.body, color: COLORS.textDark, fontWeight: 600 }}>
            {form.isSample ? (
              "Sample preview row — submissions are not available."
            ) : (
              <>
                <span style={{ fontWeight: 700 }}>{submittedCount}</span>
                {" of "}
                <span style={{ fontWeight: 700 }}>{form.totalStudents}</span>
                {" students submitted"}
              </>
            )}
          </div>
          {form.dueDate && (
            <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 4 }}>
              Deadline: {formatFormDeadline(form.dueDate).date}
              {formatFormDeadline(form.dueDate).time
                ? ` at ${formatFormDeadline(form.dueDate).time}`
                : ""}
            </div>
          )}
          {downloadError && (
            <div style={{ ...TYPE.caption, color: COLORS.maroon, marginTop: 8 }}>
              {downloadError}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 22px" }}>
          {form.isSample ? (
            <div style={{ ...TYPE.body, color: COLORS.textGray, textAlign: "center", padding: "32px 0" }}>
              Import or create a real form to review student submissions here.
            </div>
          ) : isLoading ? (
            <div style={{ ...TYPE.body, color: COLORS.textGray, textAlign: "center", padding: "32px 0" }}>
              Loading submissions…
            </div>
          ) : loadError ? (
            <div style={{ ...TYPE.body, color: COLORS.maroon, textAlign: "center", padding: "32px 0" }}>
              {loadError}
            </div>
          ) : entries.length === 0 ? (
            <div style={{ ...TYPE.body, color: COLORS.textGray, textAlign: "center", padding: "32px 0" }}>
              No enrolled students in this section.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: FONT_BODY,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {["Student", "Status", "Submitted", ""].map((label) => (
                    <th
                      key={label || "actions"}
                      style={{
                        ...TYPE.caption,
                        textAlign: "left",
                        color: COLORS.textGray,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                        padding: "10px 8px",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const statusStyle = STATUS_STYLE[entry.status]
                  return (
                    <tr key={entry.enrollmentId} style={{ borderBottom: `1px solid ${COLORS.track}` }}>
                      <td style={{ padding: "12px 8px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.body, color: COLORS.textDark, fontWeight: 700 }}>
                          {entry.studentName}
                        </div>
                        {entry.studentNumber && (
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            {entry.studentNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 8px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {statusStyle.label}
                          {entry.isLate && entry.status !== "missing" ? " · Late" : ""}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", verticalAlign: "middle", color: COLORS.textGray, fontSize: 13 }}>
                        {formatSubmittedAt(entry.submittedAt)}
                      </td>
                      <td style={{ padding: "12px 8px", verticalAlign: "middle", textAlign: "right" }}>
                        {entry.submissionId ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(entry.submissionId!)}
                            disabled={downloadingId === entry.submissionId}
                            style={{
                              ...TYPE.caption,
                              fontWeight: 700,
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: 8,
                              padding: "6px 10px",
                              background: "#fff",
                              color: COLORS.textDark,
                              cursor: downloadingId === entry.submissionId ? "wait" : "pointer",
                            }}
                            title={entry.fileName ?? "Download submission"}
                          >
                            <i className="ti ti-download" style={{ marginRight: 4 }} />
                            {downloadingId === entry.submissionId ? "…" : "Download"}
                          </button>
                        ) : (
                          <span style={{ ...TYPE.caption, color: COLORS.textGray }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
