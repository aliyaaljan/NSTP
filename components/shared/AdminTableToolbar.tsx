"use client"

import { useState } from "react"
import {
  AdminFilterButton,
  AdminFilterPanel,
  useFilterPanelDismiss,
} from "@/components/shared/AdminFilterPanel"
import { countActiveFilters, type ActiveFilters, type FilterGroupDef } from "@/lib/admin/filter-utils"

export function AdminTableToolbar({
  title,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterGroups,
  activeFilters,
  onFiltersChange,
  onClearFilters,
  actions,
}: {
  title: string
  count: string
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterGroups: FilterGroupDef[]
  activeFilters: ActiveFilters
  onFiltersChange: (next: ActiveFilters) => void
  onClearFilters: () => void
  actions?: React.ReactNode
}) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useFilterPanelDismiss(filterOpen, () => setFilterOpen(false))
  const hasFilters = countActiveFilters(activeFilters) > 0

  return (
    <div className="admin-table-toolbar">
      <div>
        <div className="admin-table-title">{title}</div>
        <div className="admin-table-count">{count}</div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginLeft: "auto",
          flexWrap: "wrap",
        }}
      >
        <div className="admin-search-bar">
          <i className="ti ti-search" style={{ fontSize: 16, color: "var(--muted)" }} />
          <input
            type="search"
            className="admin-search-input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <div ref={filterRef} style={{ position: "relative" }}>
          <AdminFilterButton
            activeFilters={activeFilters}
            open={filterOpen}
            onToggle={() => setFilterOpen((v) => !v)}
          />
          {filterOpen && (
            <AdminFilterPanel
              groups={filterGroups}
              activeFilters={activeFilters}
              onChange={onFiltersChange}
              onClear={() => {
                onClearFilters()
                setFilterOpen(false)
              }}
            />
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            className="admin-filter-btn admin-filter-btn-active"
            onClick={onClearFilters}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
            Clear
          </button>
        )}

        {actions}
      </div>
    </div>
  )
}
