"use client"

import { useRouter } from "next/navigation"

interface FilterProps {
  currentFilter: string
  sections: string[]
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
    fontFamily: "var(--font-montserrat), var(--font-body), sans-serif",
    fontSize: "14px",
    fontWeight: 700,
    color: "#fff",
    background: "#7B1113",
    borderRadius: 24,
    padding: "11px 22px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    position: "relative",
    border: "none",
  }

  const hiddenSelectStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
    appearance: "none",
  }

  let selectedLabel = "All Filters"
  if (currentFilter.startsWith("section:")) {
    selectedLabel = `Section: ${currentFilter.replace("section:", "")}`
  } else if (currentFilter.startsWith("adviser:")) {
    selectedLabel = currentFilter.replace("adviser:", "")
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={buttonWrapperStyle}>
        <span>{selectedLabel}</span>
        <i className="ti ti-chevron-down" style={{ fontSize: 22 }} />

        <select
          value={currentFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          style={hiddenSelectStyle}
        >
          <option value="" style={{ color: "#2C2C2A" }}>
            All Sections & Advisers
          </option>

          <optgroup label="Sections" style={{ color: "#8C8C88" }}>
            {sections.map((name) => (
              <option
                key={name}
                value={`section:${name}`}
                style={{ color: "#2C2C2A" }}
              >
                Section {name}
              </option>
            ))}
          </optgroup>

          <optgroup label="Advisers" style={{ color: "#8C8C88" }}>
            {advisers.map((name) => (
              <option
                key={name}
                value={`adviser:${name}`}
                style={{ color: "#2C2C2A" }}
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
            color: "#7B1113",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
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
