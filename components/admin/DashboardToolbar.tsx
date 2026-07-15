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
  buildClassDimensionFilterGroups,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import type { ExportSectionOption } from "@/lib/admin/export-analytics"
import { extractNstpType } from "@/lib/shared/class-label"

export type DashboardFilterParams = {
  nstpType?: string
  adviserUserId?: string
  schoolYear?: string
  /** Legacy single `filter=` value — still restored into checkboxes when present. */
  legacyFilter?: string
}

function filtersFromLegacyParam(
  currentFilter: string,
  sections: DashboardFilterSectionOption[]
): ActiveFilters {
  if (currentFilter.startsWith("section:")) {
    const sectionId = currentFilter.slice("section:".length)
    const section = sections.find((s) => s.sectionId === sectionId)
    if (!section) return { section: [sectionId] }
    const next: ActiveFilters = {}
    const nstp = extractNstpType(section.courseCode)
    if (nstp) next.nstpType = [nstp]
    if (section.adviserUserId) next.adviserUserId = [section.adviserUserId]
    if (section.schoolYear) next.schoolYear = [section.schoolYear]
    return next
  }
  if (currentFilter.startsWith("adviser:")) {
    const name = currentFilter.slice("adviser:".length)
    const section = sections.find((s) => s.adviserName === name)
    if (section?.adviserUserId) {
      return { adviserUserId: [section.adviserUserId] }
    }
    return {}
  }
  if (currentFilter.startsWith("nstp:")) {
    return { nstpType: [currentFilter.slice("nstp:".length)] }
  }
  if (currentFilter.startsWith("year:")) {
    return { schoolYear: [currentFilter.slice("year:".length)] }
  }
  return {}
}

function activeFiltersFromParams(
  params: DashboardFilterParams,
  sections: DashboardFilterSectionOption[]
): ActiveFilters {
  const next: ActiveFilters = {}
  if (params.nstpType) next.nstpType = [params.nstpType]
  if (params.adviserUserId) next.adviserUserId = [params.adviserUserId]
  if (params.schoolYear) next.schoolYear = [params.schoolYear]

  if (Object.keys(next).length > 0) return next
  if (params.legacyFilter) {
    return filtersFromLegacyParam(params.legacyFilter, sections)
  }
  return {}
}

function buildFilterQuery(filters: ActiveFilters): string {
  const params = new URLSearchParams()
  const nstp = filters.nstpType?.[0]
  const adviserId = filters.adviserUserId?.[0]
  const year = filters.schoolYear?.[0]
  if (nstp) params.set("nstp", nstp)
  if (adviserId) params.set("adviser", adviserId)
  if (year) params.set("year", year)
  const qs = params.toString()
  return qs ? `/admin/dashboard?${qs}` : "/admin/dashboard"
}

export default function DashboardToolbar({
  filterParams,
  sections,
  advisers: _advisers,
  exportSections,
}: {
  filterParams: DashboardFilterParams
  sections: DashboardFilterSectionOption[]
  advisers: string[]
  exportSections: ExportSectionOption[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useFilterPanelDismiss(filterOpen, () => setFilterOpen(false))
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    activeFiltersFromParams(filterParams, sections)
  )

  useEffect(() => {
    setActiveFilters(activeFiltersFromParams(filterParams, sections))
  }, [
    filterParams.nstpType,
    filterParams.adviserUserId,
    filterParams.schoolYear,
    filterParams.legacyFilter,
    sections,
  ])

  const searchLower = search.trim().toLowerCase()

  const filteredSources = useMemo(() => {
    const sources = sections.map((s) => ({
      courseCode: s.courseCode,
      adviserUserId: s.adviserUserId,
      adviserName: s.adviserName,
      schoolYear: s.schoolYear,
    }))
    if (!searchLower) return sources
    return sources.filter(
      (s) =>
        (s.courseCode ?? "").toLowerCase().includes(searchLower) ||
        (s.adviserName ?? "").toLowerCase().includes(searchLower) ||
        (s.schoolYear ?? "").toLowerCase().includes(searchLower) ||
        extractNstpType(s.courseCode).toLowerCase().includes(searchLower)
    )
  }, [sections, searchLower])

  const filterGroups: FilterGroupDef[] = useMemo(
    () => buildClassDimensionFilterGroups(filteredSources),
    [filteredSources]
  )

  function handleFiltersChange(next: ActiveFilters) {
    setActiveFilters(next)
    router.push(buildFilterQuery(next))
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
