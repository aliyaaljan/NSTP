"use client"

import { useEffect } from "react"
import { TYPE } from "@/lib/admin-typography"
import type { TermCloseoutSummary } from "@/lib/admin/settings"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

export default function TermCloseoutConfirmModal({
  open,
  summary,
  isPending,
  error,
  onSwitchOnly,
  onCloseOutAndSwitch,
  onClose,
}: {
  open: boolean
  summary: TermCloseoutSummary | null
  isPending: boolean
  error: string | null
  onSwitchOnly: () => void
  onCloseOutAndSwitch: () => void
  onClose: () => void
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

  if (!open || !summary) return null

  return (
    <div
      role="presentation"
      onClick={() => !isPending && onClose()}
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
        aria-labelledby="term-closeout-title"
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
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            background: COLORS.headerGreen,
          }}
        >
          <h2 id="term-closeout-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Close out previous term?
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
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ padding: "24px 22px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ ...TYPE.body, color: COLORS.textDark, margin: 0 }}>
            {summary.total} enrollment{summary.total !== 1 ? "s are" : " is"} still active in the
            outgoing term.
          </p>
          <div style={{ ...TYPE.caption, color: COLORS.textGray, display: "flex", flexDirection: "column", gap: 4 }}>
            <span>
              {summary.meetHours} met their required hours → will be marked <b>Completed</b>
            </span>
            <span>
              {summary.belowHours} did not → will be marked <b>Dropped</b>
            </span>
          </div>

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onSwitchOnly}
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
            Switch only
          </button>
          <button
            type="button"
            onClick={onCloseOutAndSwitch}
            disabled={isPending}
            style={{
              ...TYPE.bodyBold,
              color: "#fff",
              background: COLORS.headerGreen,
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Working…" : error ? "Retry close-out" : "Close out & switch"}
          </button>
        </div>
      </div>
    </div>
  )
}
