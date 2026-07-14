"use client"

import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { FONT_BODY } from "@/lib/admin-typography"

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
      className="px-4 py-2 gap-1 capitalize"
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        fontFamily: FONT_BODY,
        fontSize: "13.5px",
        fontWeight: 600,
        width: "auto",
        height: "",
        borderRadius: 999,
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
      <i className="ti ti-plus " style={{ fontSize: ICON_SIZE }} />
      {label}
    </button>
  )
}
