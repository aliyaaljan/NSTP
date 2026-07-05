"use client"

import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

export function AdminSortHeader({
  label,
  align = "left",
  sortable = false,
  sortActive = false,
  sortDirection = "asc",
  onSort,
}: {
  label: string
  align?: "left" | "center"
  sortable?: boolean
  sortActive?: boolean
  sortDirection?: "asc" | "desc"
  onSort?: () => void
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        justifyContent: align === "center" ? "center" : "flex-start",
        width: align === "center" ? "100%" : undefined,
      }}
    >
      <span>{label}</span>
      {sortable && (
        <button
          type="button"
          onClick={onSort}
          aria-label={`Sort by ${label}`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            flexDirection: "column",
            lineHeight: 0.8,
          }}
        >
          <i
            className="ti ti-chevron-up"
            style={{
              fontSize: 10,
              color: sortActive && sortDirection === "asc" ? COLORS.textDark : "#C4C4C0",
            }}
          />
          <i
            className="ti ti-chevron-down"
            style={{
              fontSize: 10,
              color: sortActive && sortDirection === "desc" ? COLORS.textDark : "#C4C4C0",
            }}
          />
        </button>
      )}
    </div>
  )
}
