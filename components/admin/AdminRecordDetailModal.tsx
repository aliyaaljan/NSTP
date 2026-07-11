"use client"

import { useEffect, type ReactNode } from "react"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

// Map
import dynamic from "next/dynamic"
const Map = dynamic(() => import("@/components/admin/AdminMapNoDrag"), { ssr: false })

export type AdminDetailField = {
  label: string
  value: ReactNode
  align?: "start" | "center"
}

const DELETE_ICON_BTN = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const

const BTN_BASE = {
  ...TYPE.bodyBold,
  border: "none",
  borderRadius: 999,
  padding: "10px 20px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
} as const

export default function AdminRecordDetailModal({
  open,
  title,
  subtitle,
  fields,
  mapConfig,
  onClose,
  onEdit,
  onDelete,
  onView,
  onViewSecondary,
  editLabel = "Edit",
  deleteLabel = "Delete",
  viewLabel = "View",
  viewSecondaryLabel = "View more",
  editDisabled = false,
  deleteDisabled = false,
  viewDisabled = false,
  viewSecondaryDisabled = false,
  maxWidth = 520,
  footerNoWrap = false,
  fieldColumns = 1,
}: {
  open: boolean
  title: string
  subtitle?: string
  fields: AdminDetailField[]
  mapConfig?: {
    center: [number, number]
    radius: number
  }
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  onViewSecondary?: () => void
  editLabel?: string
  deleteLabel?: string
  viewLabel?: string
  viewSecondaryLabel?: string
  editDisabled?: boolean
  deleteDisabled?: boolean
  viewDisabled?: boolean
  viewSecondaryDisabled?: boolean
  maxWidth?: number
  footerNoWrap?: boolean
  fieldColumns?: 1 | 2
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const hasActions = onEdit || onDelete || onView || onViewSecondary

  return (
    <div
      role="presentation"
      onClick={onClose}
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
        aria-labelledby="admin-record-detail-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
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
            background: COLORS.green,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id="admin-record-detail-title"
              style={{ ...TYPE.h2, color: "#fff", margin: 0 }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ ...TYPE.caption, color: "rgba(255,255,255,0.85)", margin: "6px 0 0" }}>
                {subtitle}
              </p>
            )}
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
        
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns:
                fieldColumns === 2 ? "repeat(2, minmax(0, 1fr))" : "1fr",
              gap: 14,
              columnGap: fieldColumns === 2 ? 24 : undefined,
            }}
          >
            {fields.map((field) => (
              <div
                key={field.label}
                style={
                  field.align === "center" && fieldColumns === 2
                    ? { textAlign: "center", gridColumn: "1 / -1" }
                    : field.align === "center"
                      ? { textAlign: "center" }
                      : undefined
                }
              >
                <dt
                  style={{
                    ...TYPE.caption,
                    color: COLORS.textGray,
                    margin: "0 0 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    fontWeight: 700,
                  }}
                >
                  {field.label}
                </dt>
                <dd
                  style={{
                    ...TYPE.body,
                    color: COLORS.textDark,
                    margin: 0,
                    fontWeight: 600,
                    display: field.align === "center" ? "flex" : undefined,
                    justifyContent: field.align === "center" ? "center" : undefined,
                  }}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>

          {mapConfig && (
            <div style={{ height: 300, borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
              <Map
                center={mapConfig.center}
                radius={mapConfig.radius}
                onCenterChange={() => {}} 
              />
            </div>
          )}
        </div>

        {hasActions && (
          <div
            style={{
              padding: "0 22px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: footerNoWrap ? "nowrap" : "wrap",
            }}
          >
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteDisabled}
                aria-label={deleteLabel}
                title={deleteLabel}
                style={{
                  ...DELETE_ICON_BTN,
                  color: deleteDisabled ? COLORS.textGray : COLORS.green,
                  background: deleteDisabled ? COLORS.track : COLORS.greenBgLight,
                  cursor: deleteDisabled ? "not-allowed" : "pointer",
                  opacity: deleteDisabled ? 0.7 : 1,
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 18 }} />
              </button>
            ) : (
              <span />
            )}

            <div style={{ display: "flex", gap: 10, marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  disabled={viewDisabled}
                  style={{
                    ...BTN_BASE,
                    color: viewDisabled ? COLORS.textGray : COLORS.textDark,
                    background: viewDisabled ? COLORS.track : "#EBEBE8",
                    cursor: viewDisabled ? "not-allowed" : "pointer",
                    opacity: viewDisabled ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-file-text" style={{ fontSize: 16 }} />
                  {viewLabel}
                </button>
              )}
              {onViewSecondary && (
                <button
                  type="button"
                  onClick={onViewSecondary}
                  disabled={viewSecondaryDisabled}
                  style={{
                    ...BTN_BASE,
                    color: viewSecondaryDisabled ? COLORS.textGray : COLORS.textDark,
                    background: viewSecondaryDisabled ? COLORS.track : "#EBEBE8",
                    cursor: viewSecondaryDisabled ? "not-allowed" : "pointer",
                    opacity: viewSecondaryDisabled ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-inbox" style={{ fontSize: 16 }} />
                  {viewSecondaryLabel}
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={editDisabled}
                  style={{
                    ...BTN_BASE,
                    fontFamily: FONT_HEADING,
                    color: "#fff",
                    background: editDisabled ? COLORS.light : COLORS.green,
                    cursor: editDisabled ? "not-allowed" : "pointer",
                    opacity: editDisabled ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-pencil" style={{ fontSize: 16 }} />
                  {editLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
