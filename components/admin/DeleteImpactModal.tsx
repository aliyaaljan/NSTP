"use client"

import { useEffect, useState } from "react"
import { TYPE } from "@/lib/admin-typography"
import type { DeleteImpact, DependentItem } from "@/lib/admin/dependent-checks"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  border: "#ECECEA",
  warnBg: "#FDECEC",
}

export default function DeleteImpactModal({
  open,
  title,
  subjectName,
  impact,
  requireTypedConfirm = false,
  confirmLabel = "Delete Permanently",
  isPending,
  error,
  onClose,
  onConfirm,
  renderBlockerAction,
}: {
  open: boolean
  title: string
  subjectName?: string
  /** null = still loading the impact check. */
  impact: DeleteImpact | null
  requireTypedConfirm?: boolean
  confirmLabel?: string
  isPending: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
  renderBlockerAction?: (item: DependentItem) => React.ReactNode
}) {
  const [confirmText, setConfirmText] = useState("")

  // Reset on close so a stale "DELETE" doesn't pre-arm the next open.
  useEffect(() => {
    if (!open) setConfirmText("")
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, isPending, onClose])

  if (!open) return null

  const isLoading = impact === null
  const isBlocked = !isLoading && (impact.lifecycleBlocked !== null || impact.blockers.length > 0)
  const canConfirm =
    !isLoading && !isBlocked && !isPending && (!requireTypedConfirm || confirmText === "DELETE")

  function handleConfirm() {
    if (!canConfirm) return
    onConfirm()
  }

  return (
    <div
      role="presentation"
      onClick={isPending ? undefined : onClose}
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-impact-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
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
          <h2 id="delete-impact-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: isPending ? "not-allowed" : "pointer",
              padding: 4,
              display: "flex",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ padding: "24px 22px 20px" }}>
          {subjectName && (
            <div
              style={{
                ...TYPE.bodyBold,
                color: COLORS.textDark,
                background: "#F9F9F7",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 14,
              }}
            >
              {subjectName}
            </div>
          )}

          {isLoading && (
            <p style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}>
              Checking references…
            </p>
          )}

          {!isLoading && isBlocked && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <i
                  className="ti ti-lock"
                  style={{ fontSize: 20, color: COLORS.error, marginTop: 2 }}
                />
                <p style={{ ...TYPE.body, color: COLORS.textDark, margin: 0 }}>
                  {impact.lifecycleBlocked ??
                    "This record is referenced by historical data that is never deleted. Resolve these first:"}
                </p>
              </div>
              {impact.blockers.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {impact.blockers.map((b) => (
                    <div
                      key={b.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "#F9F9F7",
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <div>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {b.label}
                          <span
                            style={{
                              marginLeft: 8,
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: "#EFE2E2",
                              color: COLORS.error,
                            }}
                          >
                            {b.count}
                          </span>
                        </div>
                        {b.hint && (
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            {b.hint}
                          </div>
                        )}
                      </div>
                      {renderBlockerAction?.(b)}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!isLoading && !isBlocked && (
            <>
              <div
                style={{
                  ...TYPE.body,
                  color: COLORS.error,
                  background: COLORS.warnBg,
                  border: `1px solid ${COLORS.error}33`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                This action is permanent and cannot be undone.
              </div>

              {impact.cascades.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...TYPE.caption, color: COLORS.textGray, marginBottom: 6 }}>
                    Will be removed together with it:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {impact.cascades.map((c) => (
                      <div
                        key={c.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "#F9F9F7",
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <span style={{ ...TYPE.body, color: COLORS.textDark }}>{c.label}</span>
                        <span style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {impact.notes.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {impact.notes.map((n, idx) => (
                    <p key={idx} style={{ ...TYPE.caption, color: COLORS.textGray, margin: "4px 0" }}>
                      {n}
                    </p>
                  ))}
                </div>
              )}

              {requireTypedConfirm && (
                <div style={{ marginBottom: 4 }}>
                  <label
                    style={{
                      ...TYPE.caption,
                      color: COLORS.textGray,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={isPending}
                    autoComplete="off"
                    style={{
                      ...TYPE.body,
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      background: COLORS.fieldBg,
                      color: COLORS.textDark,
                    }}
                  />
                </div>
              )}
            </>
          )}

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: "12px 0 0" }}>{error}</p>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              ...TYPE.bodyBold,
              color: COLORS.textDark,
              background: COLORS.fieldBg,
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              ...TYPE.bodyBold,
              color: "#fff",
              background: canConfirm ? COLORS.error : "#C9B7B7",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: canConfirm ? "pointer" : "not-allowed",
            }}
          >
            {isBlocked ? "Delete blocked" : isPending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
