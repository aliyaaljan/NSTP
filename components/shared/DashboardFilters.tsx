"use client"

import { useRouter } from "next/navigation"
import { FONT_BODY } from "@/lib/admin-typography"
import { ADMIN_COLORS, ADMIN_FILTER_SELECT_STYLE } from "@/lib/admin-theme"

export interface DashboardFilterSectionOption {
  sectionId: string
  /** Derived: "{courseCode} — {facilitator surname}" — sections have no name. */
  label: string
}

interface FilterProps {
  currentFilter: string
  sections: DashboardFilterSectionOption[]
  advisers: string[]
}

export default function DashboardFilters({
  currentFilter,
  sections,
  advisers,
}: FilterProps) {
  const router = useRouter()

  const handleFilterChange = (value: string) => {
    if (value) {
      router.push(`/admin/dashboard?filter=${encodeURIComponent(value)}`)
    } else {
      router.push("/admin/dashboard")
    }
  }

  const buttonWrapperStyle: React.CSSProperties = {
    fontFamily: FONT_BODY,
    fontSize: "12.5px",
    fontWeight: 600,
    color: "#fff",
    background: ADMIN_COLORS.green,
    borderRadius: 20,
    padding: "5px 13px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    position: "relative",
    border: "none",
  }

  const hiddenSelectStyle: React.CSSProperties = {
    ...ADMIN_FILTER_SELECT_STYLE,
    top: 0,
    left: 0,
    height: "100%",
    appearance: "none",
  }

  let selectedLabel = "All Filters"
  if (currentFilter.startsWith("section:")) {
    const sectionId = currentFilter.replace("section:", "")
    const match = sections.find((s) => s.sectionId === sectionId)
    selectedLabel = match ? `Class: ${match.label}` : "Class"
  } else if (currentFilter.startsWith("adviser:")) {
    selectedLabel = currentFilter.replace("adviser:", "")
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={buttonWrapperStyle}>
        <span>{selectedLabel}</span>
        <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />

        <select
          value={currentFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          style={hiddenSelectStyle}
        >
          <option value="" style={{ color: ADMIN_COLORS.text }}>
            All Sections & Advisers
          </option>

          <optgroup label="Classes" style={{ color: ADMIN_COLORS.muted }}>
            {sections.map((s) => (
              <option
                key={s.sectionId}
                value={`section:${s.sectionId}`}
                style={{ color: ADMIN_COLORS.text }}
              >
                {s.label}
              </option>
            ))}
          </optgroup>

          <optgroup label="Advisers" style={{ color: ADMIN_COLORS.muted }}>
            {advisers.map((name) => (
              <option
                key={name}
                value={`adviser:${name}`}
                style={{ color: ADMIN_COLORS.text }}
              >
                {name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {currentFilter && (
        <button
          onClick={() => handleFilterChange("")}
          style={{
            background: "none",
            border: "none",
            color: ADMIN_COLORS.maroon,
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: "inherit",
            padding: "0 4px",
          }}
        >
          Clear Filter
        </button>
      )}
    </div>
  )
}
