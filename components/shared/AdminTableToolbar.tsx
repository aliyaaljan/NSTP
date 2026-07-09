"use client"

import { useState } from "react"
import {
  AdminFilterPanel,
  AdminIconFilterButton,
  useFilterPanelDismiss,
} from "@/components/shared/AdminFilterPanel"
import { type ActiveFilters, type FilterGroupDef } from "@/lib/admin/filter-utils"

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
          flex: "1 1 320px",
          justifyContent: "flex-end",
          minWidth: 0,
        }}
      >
        <div
          className="admin-search-bar"
          style={{ flex: "1 1 280px", minWidth: 0, maxWidth: 420 }}
        >
          <i
            className="ti ti-search"
            style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
          />
          <input
            type="search"
            className="admin-search-input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <div ref={filterRef} style={{ position: "relative", flexShrink: 0 }}>
          <AdminIconFilterButton
            activeFilters={activeFilters}
            open={filterOpen}
            onToggle={() => setFilterOpen((open) => !open)}
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

        {actions}
      </div>
    </div>
  )
}
