"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardExportButton from "@/components/admin/DashboardExportButton"
import {
  AdminFilterPanel,
  AdminIconFilterButton,
  useFilterPanelDismiss,
} from "@/components/shared/AdminFilterPanel"
import type { DashboardFilterSectionOption } from "@/components/shared/DashboardFilters"
import {
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import type { ExportSectionOption } from "@/lib/admin/export-analytics"

function filtersFromParam(currentFilter: string): ActiveFilters {
  if (currentFilter.startsWith("section:")) {
    return { section: [currentFilter.slice("section:".length)] }
  }
  if (currentFilter.startsWith("adviser:")) {
    return { adviser: [currentFilter.slice("adviser:".length)] }
  }
  return {}
}

function filterToParam(filters: ActiveFilters): string | null {
  if (filters.section?.length === 1) {
    return `section:${filters.section[0]}`
  }
  if (filters.adviser?.length === 1) {
    return `adviser:${filters.adviser[0]}`
  }
  return null
}

export default function DashboardToolbar({
  currentFilter,
  sections,
  advisers,
  exportSections,
}: {
  currentFilter: string
  sections: DashboardFilterSectionOption[]
  advisers: string[]
  exportSections: ExportSectionOption[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useFilterPanelDismiss(filterOpen, () => setFilterOpen(false))
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    filtersFromParam(currentFilter)
  )

  useEffect(() => {
    setActiveFilters(filtersFromParam(currentFilter))
  }, [currentFilter])

  const searchLower = search.trim().toLowerCase()

  const filteredSections = useMemo(
    () =>
      searchLower
        ? sections.filter((s) => s.label.toLowerCase().includes(searchLower))
        : sections,
    [sections, searchLower]
  )

  const filteredAdvisers = useMemo(
    () =>
      searchLower
        ? advisers.filter((name) => name.toLowerCase().includes(searchLower))
        : advisers,
    [advisers, searchLower]
  )

  const filterGroups: FilterGroupDef[] = useMemo(
    () => [
      {
        label: "Classes",
        field: "section",
        options: filteredSections.map((s) => ({
          value: s.sectionId,
          label: s.label,
        })),
      },
      {
        label: "Advisers",
        field: "adviser",
        options: filteredAdvisers.map((name) => ({ value: name, label: name })),
      },
    ],
    [filteredSections, filteredAdvisers]
  )

  function pushFilters(filters: ActiveFilters) {
    const param = filterToParam(filters)
    if (param) {
      router.push(`/admin/dashboard?filter=${encodeURIComponent(param)}`)
    } else {
      router.push("/admin/dashboard")
    }
  }

  function handleFiltersChange(next: ActiveFilters) {
    const prevSection = activeFilters.section ?? []
    const prevAdviser = activeFilters.adviser ?? []
    const nextSection = next.section ?? []
    const nextAdviser = next.adviser ?? []

    const addedSection = nextSection.find((id) => !prevSection.includes(id))
    const addedAdviser = nextAdviser.find((name) => !prevAdviser.includes(name))

    let resolved: ActiveFilters = {}

    if (addedSection) {
      resolved = { section: [addedSection] }
    } else if (addedAdviser) {
      resolved = { adviser: [addedAdviser] }
    } else if (nextSection.length === 1) {
      resolved = { section: [nextSection[0]] }
    } else if (nextAdviser.length === 1) {
      resolved = { adviser: [nextAdviser[0]] }
    }

    setActiveFilters(resolved)
    pushFilters(resolved)
  }

  function clearFilters() {
    setActiveFilters({})
    setFilterOpen(false)
    router.push("/admin/dashboard")
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 12,
      }}
    >
      <div className="admin-search-bar" style={{ flex: "1 1 280px", minWidth: 0 }}>
        <i
          className="ti ti-search"
          style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
        />
        <input
          type="search"
          className="admin-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
        />
      </div>

      <div ref={filterRef} style={{ position: "relative", flexShrink: 0 }}>
        <AdminIconFilterButton
          activeFilters={activeFilters}
          open={filterOpen}
          onToggle={() => setFilterOpen((open) => !open)}
          ariaLabel="Filter dashboard"
        />
        {filterOpen && (
          <AdminFilterPanel
            groups={filterGroups}
            activeFilters={activeFilters}
            onChange={handleFiltersChange}
            onClear={clearFilters}
          />
        )}
      </div>

      <DashboardExportButton sections={exportSections} />
    </div>
  )
}
