"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AddGpsSiteModal from "@/components/admin/AddGpsSiteModal"
import EditGpsSiteModal from "@/components/admin/EditGpsSiteModal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import { deleteSite } from "@/lib/admin/site-list-actions"
import { validateSiteDelete } from "@/lib/admin/site-edit"
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
import { ADMIN_COLORS as COLORS, ADMIN_FILTER_SELECT_STYLE } from "@/lib/admin-theme"

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

function FilterDropdown({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        ...TYPE.bodyBold,
        fontFamily: FONT_BODY,
        color: "#fff",
        background: COLORS.green,
        borderRadius: 20,
        padding: "5px 13px",
        fontSize: "12.5px",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <span>{label}</span>
      <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={ADMIN_FILTER_SELECT_STYLE}
      >
        {children}
      </select>
    </div>
  )
}

const TABLE_COL_WIDTHS = ["22%", "26%", "10%", "20%", "10%", "12%"]

function TableColGroup() {
  return (
    <colgroup>
      {TABLE_COL_WIDTHS.map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  )
}

function ColumnHeader({
  label,
  align = "left",
  sortable = false,
  sortActive = false,
  sortDirection = "asc",
  onSort,
}: {
  label: string
  align?: "left" | "center" | "right"
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
        justifyContent:
          align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        width: align !== "left" ? "100%" : undefined,
      }}
    >
      <span style={{ ...TYPE.sectionLabel, color: COLORS.textGray }}>{label}</span>
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

function SiteStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        ...TYPE.caption,
        fontWeight: 700,
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        background: isActive ? COLORS.greenBgLight : COLORS.maroonBgLight,
        color: isActive ? COLORS.green : COLORS.maroon,
        whiteSpace: "nowrap",
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  )
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

  const visibleSites = useMemo(
    () => filterSiteListRows(sites, { ...query, search: searchInput }),
    [sites, query, searchInput]
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
  }, [query.page, query.search, query.status, query.sectionId, query.adviserId, query.sort, query.dir])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  const statusLabel =
    SITE_STATUS_FILTER_OPTIONS.find((o) => o.value === query.status)?.label ??
    "All Status"

  const sectionLabel =
    query.sectionId !== SITE_LIST_ALL_SECTIONS
      ? sections.find((s) => s.sectionId === query.sectionId)?.label ?? "All Sections"
      : "All Sections"

  const adviserLabel =
    query.adviserId !== SITE_LIST_ALL_ADVISERS
      ? advisers.find((a) => a.adviserUserId === query.adviserId)?.fullName ?? "All Advisers"
      : "All Advisers"

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
      onClick: () => pushParams({ status: null, page: "1" }),
      isActive: query.status === "all",
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
      onClick: () => pushParams({ status: "active", page: "1" }),
      isActive: query.status === "active",
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
      onClick: () => pushParams({ status: "inactive", page: "1" }),
      isActive: query.status === "inactive",
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
      <style>{`
        .site-list-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .site-list-scroll::-webkit-scrollbar { width: 5px; }
        .site-list-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
      `}</style>

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
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {filteredCount} GPS geofence {filteredCount === 1 ? "site" : "sites"}
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div className="admin-list-pre-table">
        <div className="admin-list-kpi-sticky">
          <KpiStatCardGrid columns={4}>
            {statCards.map((card, index) => (
              <KpiStatCard key={index} {...card} />
            ))}
          </KpiStatCardGrid>
        </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ position: "relative" }}>
          <i
            className="ti ti-search"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 14,
              color: COLORS.light,
            }}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search sites, sections, or advisers"
            style={{
              width: "100%",
              fontFamily: FONT_BODY,
              fontSize: "13.5px",
              color: COLORS.text,
              border: `1.5px solid ${COLORS.border}`,
              borderRadius: 24,
              padding: "8px 16px 8px 40px",
              outline: "none",
              background: COLORS.white,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <FilterDropdown
            label={statusLabel}
            value={query.status}
            onChange={(value) =>
              pushParams({
                status: value === SITE_LIST_ALL_STATUSES ? null : value,
                page: "1",
              })
            }
          >
            {SITE_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label={sectionLabel}
            value={query.sectionId}
            onChange={(value) =>
              pushParams({
                sectionId: value === SITE_LIST_ALL_SECTIONS ? null : value,
                page: "1",
              })
            }
          >
            <option value={SITE_LIST_ALL_SECTIONS}>All Sections</option>
            {sections.map((section) => (
              <option key={section.sectionId} value={section.sectionId}>
                {section.label}
              </option>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label={adviserLabel}
            value={query.adviserId}
            onChange={(value) =>
              pushParams({
                adviserId: value === SITE_LIST_ALL_ADVISERS ? null : value,
                page: "1",
              })
            }
          >
            <option value={SITE_LIST_ALL_ADVISERS}>All Advisers</option>
            {advisers.map((adviser) => (
              <option key={adviser.adviserUserId} value={adviser.adviserUserId}>
                {adviser.fullName}
              </option>
            ))}
          </FilterDropdown>
        </div>

        <AdminAddButton label="Add site" onClick={() => setAddOpen(true)} />
      </div>
      </div>

      <div
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: COLORS.radius,
          boxShadow: COLORS.cardShadow,
        }}
      >
        <div className="admin-list-thead-wrap" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 880,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <thead>
              <tr style={{ background: COLORS.tableHeadBg }}>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="NSTP Site"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Section Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Radius"
                    sortable
                    sortActive={query.sort === "radius"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("radius")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Coordinates" />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "center" }}>
                  <ColumnHeader
                    label="Status"
                    align="center"
                    sortable
                    sortActive={query.sort === "status"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("status")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "center" }}>
                  <ColumnHeader label="Actions" align="center" />
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="site-list-scroll admin-list-table-scroll">
          <table
            style={{
              width: "100%",
              minWidth: 880,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <tbody key={animKey}>
              {pageSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...TYPE.body,
                      color: COLORS.textGray,
                      textAlign: "center",
                      padding: "40px 18px",
                    }}
                  >
                    No GPS sites match your filters.
                  </td>
                </tr>
              ) : (
                pageSites.map((site) => (
                  <tr
                    key={site.geofenceId}
                    className="anim-list-item"
                    style={{ borderTop: `1px solid ${COLORS.border}` }}
                  >
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          ...TYPE.bodyBold,
                          color: COLORS.textDark,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {site.siteName}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          ...TYPE.bodyBold,
                          color: COLORS.textDark,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {sectionLabelById.get(site.sectionId) ?? site.sectionName}
                      </div>
                      <div
                        style={{
                          ...TYPE.caption,
                          color: COLORS.textGray,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {site.supervisorName}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                        {site.radiusMeters} m
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          ...TYPE.bodyBold,
                          color: COLORS.textDark,
                          fontVariantNumeric: "tabular-nums",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {formatSiteCoordinates(site)}
                      </div>
                    </td>
                    <td style={{ padding: "16px 18px", verticalAlign: "middle", textAlign: "center" }}>
                      <SiteStatusBadge isActive={site.isActive} />
                    </td>
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
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
