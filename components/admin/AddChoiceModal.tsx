"use client"

import { useCallback, useEffect } from "react"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  uploadBtnBg: "#D4E4DA",
}

export default function AddChoiceModal({
  open,
  onClose,
  title,
  entityLabel,
  onAddManually,
  onImport,
}: {
  open: boolean
  onClose: () => void
  title: string
  entityLabel: string
  onAddManually: () => void
  onImport: () => void
}) {
  const close = useCallback(() => {
    onClose()
  }, [onClose])

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

  if (!open) return null

  return (
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
        aria-labelledby="add-choice-title"
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
          <h2 id="add-choice-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            {title}
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
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div
          style={{
            padding: "24px 22px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              close()
              onAddManually()
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              textAlign: "left",
              background: COLORS.fieldBg,
              border: "none",
              borderRadius: 10,
              padding: "16px 18px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: COLORS.headerGreen,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-user-plus" style={{ fontSize: 20 }} />
            </span>
            <span>
              <span
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_HEADING,
                  color: COLORS.textDark,
                  display: "block",
                }}
              >
                Add {entityLabel} manually
              </span>
              <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
                Enter details one at a time
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              close()
              onImport()
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              textAlign: "left",
              background: COLORS.uploadBtnBg,
              border: "none",
              borderRadius: 10,
              padding: "16px 18px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: COLORS.headerGreen,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-file-import" style={{ fontSize: 20 }} />
            </span>
            <span>
              <span
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_HEADING,
                  color: COLORS.textDark,
                  display: "block",
                }}
              >
                Import from CSV
              </span>
              <span style={{ ...TYPE.caption, color: COLORS.textGray }}>
                Upload a spreadsheet of {entityLabel}s
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
