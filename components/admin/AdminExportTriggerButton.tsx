"use client"

import { FONT_BODY } from "@/lib/admin-typography"
import { ADMIN_COLORS } from "@/lib/admin-theme"

export default function AdminExportTriggerButton({
  onClick,
  label = "Export CSV",
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: FONT_BODY,
        fontSize: "13.5px",
        fontWeight: 600,
        color: "#fff",
        background: ADMIN_COLORS.green,
        border: "none",
        borderRadius: 999,
        padding: "8px 18px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.13s",
      }}
    >
      <i className="ti ti-download" style={{ fontSize: 16 }} />
      {label}
    </button>
  )
}
