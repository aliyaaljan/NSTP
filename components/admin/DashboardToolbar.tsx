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

function filtersFromParam(currentFilter: string): ActiveFilters {
  if (currentFilter.startsWith("section:")) {
    return { section: [currentFilter.slice("section:".length)] }
  }
  if (currentFilter.startsWith("adviser:")) {
    return { adviserUserId: [currentFilter.slice("adviser:".length)] }
  }
  if (currentFilter.startsWith("nstp:")) {
    return { nstpType: [currentFilter.slice("nstp:".length)] }
  }
  if (currentFilter.startsWith("year:")) {
    return { schoolYear: [currentFilter.slice("year:".length)] }
  }
  return {}
}

/**
 * Resolve dimension filters to a single dashboard URL filter param.
 * Prefers a concrete section when dimensions pin one class; otherwise adviser /
 * nstp / year sentinels the page understands.
 */
function filterToParam(
  filters: ActiveFilters,
  sections: DashboardFilterSectionOption[]
): string | null {
  const nstp = filters.nstpType?.[0]
  const adviserId = filters.adviserUserId?.[0]
  const year = filters.schoolYear?.[0]
  const legacySection = filters.section?.[0]

  if (legacySection && !nstp && !adviserId && !year) {
    return `section:${legacySection}`
  }

  const matched = sections.filter((section) => {
    if (nstp && extractNstpType(section.courseCode) !== nstp) return false
    if (adviserId && section.adviserUserId !== adviserId) return false
    if (year && section.schoolYear !== year) return false
    return Boolean(nstp || adviserId || year)
  })

  if (matched.length === 1) {
    return `section:${matched[0].sectionId}`
  }

  if (adviserId && !nstp && !year) {
    const name = sections.find((s) => s.adviserUserId === adviserId)?.adviserName
    if (name) return `adviser:${name}`
  }

  if (nstp && !adviserId && !year) {
    return `nstp:${nstp}`
  }

  if (year && !nstp && !adviserId) {
    return `year:${year}`
  }

  // Multiple dimensions that don't pin a single section: keep the tightest
  // match the page can apply (prefer section list via nstp/year on the server).
  if (matched.length > 1 && nstp) {
    return `nstp:${nstp}`
  }
  if (matched.length > 1 && year) {
    return `year:${year}`
  }
  if (adviserId) {
    const name = sections.find((s) => s.adviserUserId === adviserId)?.adviserName
    if (name) return `adviser:${name}`
  }

  return null
}

function activeFiltersFromSections(
  currentFilter: string,
  sections: DashboardFilterSectionOption[]
): ActiveFilters {
  if (currentFilter.startsWith("section:")) {
    const sectionId = currentFilter.slice("section:".length)
    const section = sections.find((s) => s.sectionId === sectionId)
    if (!section) return filtersFromParam(currentFilter)
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
  return filtersFromParam(currentFilter)
}

export default function DashboardToolbar({
  currentFilter,
  sections,
  advisers: _advisers,
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
    activeFiltersFromSections(currentFilter, sections)
  )

  useEffect(() => {
    setActiveFilters(activeFiltersFromSections(currentFilter, sections))
  }, [currentFilter, sections])

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

  function pushFilters(filters: ActiveFilters) {
    const param = filterToParam(filters, sections)
    if (param) {
      router.push(`/admin/dashboard?filter=${encodeURIComponent(param)}`)
    } else {
      router.push("/admin/dashboard")
    }
  }

  function handleFiltersChange(next: ActiveFilters) {
    setActiveFilters(next)
    pushFilters(next)
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
