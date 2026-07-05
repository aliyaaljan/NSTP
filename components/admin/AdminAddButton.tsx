"use client"

import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const BUTTON_SIZE = 44
const ICON_SIZE = 22

export default function AdminAddButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: "50%",
        border: "none",
        background: COLORS.green,
        color: "#fff",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <i className="ti ti-plus" style={{ fontSize: ICON_SIZE }} />
    </button>
  )
}
