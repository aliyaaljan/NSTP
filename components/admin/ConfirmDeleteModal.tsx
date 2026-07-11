"use client"

import { useEffect } from "react"
import { TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  border: "#ECECEA",
}

export default function ConfirmDeleteModal({
  open,
  title,
  message,
  subjectName,
  confirmLabel = "Delete",
  isPending = false,
  error = null,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  message: string
  subjectName?: string
  confirmLabel?: string
  isPending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void
}) {
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
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-message"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
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
          <h2 id="confirm-delete-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
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
          <p
            id="confirm-delete-message"
            style={{ ...TYPE.body, color: COLORS.textGray, margin: 0 }}
          >
            {message}
          </p>
          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: "12px 0 0" }}>
              {error}
            </p>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            aria-label={isPending ? "Deleting…" : confirmLabel}
            title={isPending ? "Deleting…" : confirmLabel}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "none",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
              background: isPending ? "#A8B5AD" : COLORS.headerGreen,
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 18 }} />
          </button>
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
        </div>
      </div>
    </div>
  )
}
