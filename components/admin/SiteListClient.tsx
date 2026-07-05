"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AddGpsSiteModal from "@/components/admin/AddGpsSiteModal"
import EditGpsSiteModal from "@/components/admin/EditGpsSiteModal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import { deleteSite } from "@/lib/admin/site-list-actions"
import { validateSiteDelete } from "@/lib/admin/site-edit"
import {
  matchesActiveFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import {
  SITE_LIST_ALL_ADVISERS,
  SITE_LIST_ALL_SECTIONS,
  SITE_LIST_ALL_STATUSES,
  SITE_LIST_PAGE_SIZE,
  SITE_STATUS_FILTER_OPTIONS,
  filterSiteListRows,
  formatSiteCoordinates,
  paginateSiteListRows,
  type AdminCurrentUser,
  type SiteListAdviserOption,
  type SiteListMeta,
  type SiteListQuery,
  type SiteListRow,
  type SiteListSectionOption,
  type SiteListSortKey,
  type SiteListSummary,
} from "@/lib/admin/site-list"
import { FONT_BODY, PAGE_TITLE, PROFILE_PILL, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function ProfilePill({ user }: { user: AdminCurrentUser }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: PROFILE_PILL.gap,
        background: COLORS.maroon,
        borderRadius: PROFILE_PILL.borderRadius,
        padding: PROFILE_PILL.padding,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: PROFILE_PILL.avatarSize,
          height: PROFILE_PILL.avatarSize,
          borderRadius: "50%",
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : "rgba(255,255,255,0.2)",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...PROFILE_PILL.name, fontFamily: FONT_BODY, color: "#fff" }}>
          {user.name}
        </div>
        <div
          style={{
            ...PROFILE_PILL.role,
            fontFamily: FONT_BODY,
            color: "#fff",
            marginTop: 1,
          }}
        >
          {user.role}
        </div>
      </div>
    </div>
  )
}

function SiteStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? COLORS.greenBgLight : COLORS.maroonBgLight,
        color: isActive ? COLORS.green : COLORS.maroon,
        whiteSpace: "nowrap",
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}

function initialFiltersFromQuery(query: SiteListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.status !== SITE_LIST_ALL_STATUSES) {
    filters.statusCode = [query.status]
  }
  if (query.sectionId !== SITE_LIST_ALL_SECTIONS) {
    filters.sectionId = [query.sectionId]
  }
  if (query.adviserId !== SITE_LIST_ALL_ADVISERS) {
    filters.adviserUserId = [query.adviserId]
  }
  return filters
}

export default function SiteListClient({
  sites,
  sections,
  advisers,
  summary,
  meta,
  currentUser,
  query,
}: {
  sites: SiteListRow[]
  sections: SiteListSectionOption[]
  advisers: SiteListAdviserOption[]
  summary: SiteListSummary
  meta: SiteListMeta
  currentUser: AdminCurrentUser
  query: SiteListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addOpen, setAddOpen] = useState(false)
  const [editSite, setEditSite] = useState<SiteListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SiteListRow | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)

  const sectionLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const section of sections) {
      map.set(section.sectionId, section.label)
    }
    return map
  }, [sections])

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        value === SITE_LIST_ALL_STATUSES ||
        value === SITE_LIST_ALL_SECTIONS ||
        value === SITE_LIST_ALL_ADVISERS
      ) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`/admin/sites?${params.toString()}`)
  }

  function toggleSort(key: SiteListSortKey) {
    const nextDir =
      query.sort === key ? (query.dir === "asc" ? "desc" : "asc") : "asc"
    pushParams({ sort: key, dir: nextDir, page: "1" })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === query.search) return
      pushParams({ q: searchInput.trim() || null, page: "1" })
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const filterGroups: FilterGroupDef[] = useMemo(
    () => [
      {
        label: "Status",
        field: "statusCode",
        options: SITE_STATUS_FILTER_OPTIONS.filter(
          (o) => o.value !== SITE_LIST_ALL_STATUSES
        ).map((o) => ({ value: o.value, label: o.label })),
      },
      {
        label: "Section",
        field: "sectionId",
        options: sections.map((s) => ({ value: s.sectionId, label: s.label })),
      },
      {
        label: "Adviser",
        field: "adviserUserId",
        options: advisers.map((a) => ({ value: a.adviserUserId, label: a.fullName })),
      },
    ],
    [sections, advisers]
  )

  const searchFiltered = useMemo(
    () =>
      filterSiteListRows(sites, {
        ...query,
        search: searchInput,
        status: SITE_LIST_ALL_STATUSES,
        sectionId: SITE_LIST_ALL_SECTIONS,
        adviserId: SITE_LIST_ALL_ADVISERS,
      }),
    [sites, query, searchInput]
  )

  const visibleSites = useMemo(
    () =>
      searchFiltered.filter((site) =>
        matchesActiveFilters(
          {
            statusCode: site.isActive ? "active" : "inactive",
            sectionId: site.sectionId,
            adviserUserId: site.adviserUserId,
          },
          activeFilters
        )
      ),
    [searchFiltered, activeFilters]
  )

  const {
    rows: pageSites,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateSiteListRows(visibleSites, query.page),
    [visibleSites, query.page]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.sort, query.dir, activeFilters])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  function setStatusFilter(status: string | null) {
    setActiveFilters((prev) => {
      if (!status) {
        const { statusCode: _, ...rest } = prev
        return rest
      }
      return { ...prev, statusCode: [status] }
    })
    pushParams({ status, page: "1" })
  }

  function openDeleteConfirm(site: SiteListRow) {
    setDeleteError(null)
    setDeleteTarget(site)
  }

  function closeDeleteConfirm() {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return

    const validationError = validateSiteDelete(deleteTarget)
    if (validationError) {
      setDeleteError(validationError)
      return
    }

    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteSite(deleteTarget.geofenceId)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      setDeleteTarget(null)
      window.location.reload()
    })
  }

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-map-pin",
      label: "Total Sites",
      value: summary.total,
      note: "geofence locations",
      onClick: () => setStatusFilter(null),
      isActive: !activeFilters.statusCode?.length,
    },
    {
      icon: "ti-circle-check",
      label: "Active Sites",
      value: summary.active,
      badge: {
        text: pctOfTotal(summary.active),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all sites",
      onClick: () => setStatusFilter("active"),
      isActive: activeFilters.statusCode?.includes("active") ?? false,
    },
    {
      icon: "ti-circle-x",
      label: "Inactive Sites",
      value: summary.inactive,
      badge: {
        text: pctOfTotal(summary.inactive),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all sites",
      onClick: () => setStatusFilter("inactive"),
      isActive: activeFilters.statusCode?.includes("inactive") ?? false,
    },
    {
      icon: "ti-radar",
      label: "Avg. Radius",
      value: summary.avgRadiusMeters,
      valueSuffix: "m",
      note: "across all sites",
      static: true,
    },
  ]

  return (
    <>
      <ChartStyles />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Site List</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div className="admin-list-kpi-sticky" style={{ marginBottom: 16 }}>
        <KpiStatCardGrid columns={4}>
          {statCards.map((card, index) => (
            <KpiStatCard key={index} {...card} />
          ))}
        </KpiStatCardGrid>
      </div>

      <div className="admin-table-card">
        <AdminTableToolbar
          title="All Sites"
          count={`${filteredCount} site${filteredCount !== 1 ? "s" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search sites, sections, or advisers"
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            pushParams({ page: "1" })
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ status: null, sectionId: null, adviserId: null, page: "1" })
          }}
          actions={<AdminAddButton label="Add site" onClick={() => setAddOpen(true)} />}
        />

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th style={{ width: "22%" }}>
                  <AdminSortHeader
                    label="NSTP Site"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ width: "26%" }}>
                  <AdminSortHeader
                    label="Section Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ width: "10%" }}>
                  <AdminSortHeader
                    label="Radius"
                    sortable
                    sortActive={query.sort === "radius"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("radius")}
                  />
                </th>
                <th style={{ width: "20%" }}>Coordinates</th>
                <th style={{ width: "10%", textAlign: "center" }}>
                  <AdminSortHeader
                    label="Status"
                    align="center"
                    sortable
                    sortActive={query.sort === "status"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("status")}
                  />
                </th>
                <th style={{ width: "12%" }}>Actions</th>
              </tr>
            </thead>
            <tbody key={animKey}>
              {pageSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    No GPS sites match your filters.
                  </td>
                </tr>
              ) : (
                pageSites.map((site) => (
                  <tr key={site.geofenceId} className="anim-list-item">
                    <td>
                      <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                        {site.siteName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                        {sectionLabelById.get(site.sectionId) ?? site.sectionName}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                        {site.supervisorName}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                        {site.radiusMeters} m
                      </div>
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: COLORS.textDark,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatSiteCoordinates(site)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <SiteStatusBadge isActive={site.isActive} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditSite(site)}
                          aria-label={`Edit ${site.siteName}`}
                          title="Edit site"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 4,
                            cursor: "pointer",
                            color: COLORS.maroon,
                          }}
                        >
                          <i className="ti ti-pencil" style={{ fontSize: 18 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(site)}
                          aria-label={`Delete ${site.siteName}`}
                          title="Delete site"
                          disabled={isDeleting}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 4,
                            cursor: isDeleting ? "not-allowed" : "pointer",
                            color: COLORS.maroon,
                            opacity: isDeleting ? 0.5 : 1,
                          }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          page={query.page}
          totalPages={totalPages}
          pageSize={SITE_LIST_PAGE_SIZE}
          totalCount={filteredCount}
          onPageChange={goToPage}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <AddGpsSiteModal
        open={addOpen}
        gpsSections={sections}
        onClose={() => setAddOpen(false)}
      />

      <EditGpsSiteModal
        open={editSite !== null}
        site={editSite}
        gpsSections={sections}
        onClose={() => setEditSite(null)}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete GPS Site"
        subjectName={deleteTarget?.siteName}
        message={
          deleteTarget
            ? `Remove "${deleteTarget.siteName}" from the GPS site list? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}
