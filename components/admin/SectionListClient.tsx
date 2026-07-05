"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import AdminAddButton from "@/components/admin/AdminAddButton"
import SectionFormModal from "@/components/admin/SectionFormModal"
import { deleteSection } from "@/lib/admin/section-list-actions"
import { sectionRowToEditPayload } from "@/lib/admin/section-edit"
import {
  SECTION_LIST_ALL_ADVISERS,
  SECTION_LIST_ALL_STATUSES,
  SECTION_LIST_PAGE_SIZE,
  SECTION_STATUS_BADGE,
  SECTION_STATUS_FILTER_OPTIONS,
  filterSectionListRows,
  paginateSectionListRows,
  type AdminCurrentUser,
  type SectionListAdviserOption,
  type SectionListMeta,
  type SectionListQuery,
  type SectionListRow,
  type SectionListSortKey,
  type SectionListStatusOption,
  type SectionListSummary,
} from "@/lib/admin/section-list"
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

const TABLE_COL_WIDTHS = ["22%", "18%", "24%", "14%", "14%", "8%"]

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

export default function SectionListClient({
  sections,
  advisers,
  statuses,
  summary,
  meta,
  currentUser,
  query,
}: {
  sections: SectionListRow[]
  advisers: SectionListAdviserOption[]
  statuses: SectionListStatusOption[]
  summary: SectionListSummary
  meta: SectionListMeta
  currentUser: AdminCurrentUser
  query: SectionListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editSection, setEditSection] = useState<SectionListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SectionListRow | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (
        !value ||
        value === SECTION_LIST_ALL_STATUSES ||
        value === SECTION_LIST_ALL_ADVISERS
      ) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`/admin/sections?${params.toString()}`)
  }

  function toggleSort(key: SectionListSortKey) {
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

  const visibleSections = useMemo(
    () => filterSectionListRows(sections, { ...query, search: searchInput }),
    [sections, query, searchInput]
  )

  const {
    rows: pageSections,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateSectionListRows(visibleSections, query.page),
    [visibleSections, query.page]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.status, query.adviserId, query.sort, query.dir])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  const statusLabel =
    SECTION_STATUS_FILTER_OPTIONS.find((o) => o.value === query.status)?.label ??
    "All Status"

  const adviserLabel =
    query.adviserId !== SECTION_LIST_ALL_ADVISERS
      ? advisers.find((a) => a.adviserUserId === query.adviserId)?.fullName ?? "All Advisers"
      : "All Advisers"

  function openCreate() {
    setFormMode("create")
    setEditSection(null)
    setFormOpen(true)
  }

  function openEdit(section: SectionListRow) {
    setFormMode("edit")
    setEditSection(section)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditSection(null)
  }

  function openDeleteConfirm(section: SectionListRow) {
    setDeleteError(null)
    setDeleteTarget(section)
  }

  function closeDeleteConfirm() {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return

    setDeleteError(null)

    startDeleteTransition(async () => {
      const result = await deleteSection(deleteTarget.sectionId)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      setDeleteTarget(null)
      window.location.reload()
    })
  }

  const deleteMessage = deleteTarget?.studentCount
    ? "This section has enrolled students and will be archived instead of permanently deleted. You can restore it later by changing its status."
    : "This section has no enrolled students and will be permanently removed. This action cannot be undone."

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-layout-grid",
      label: "Total Sections",
      value: summary.total,
      note: "this term",
      onClick: () => pushParams({ status: null, page: "1" }),
      isActive: query.status === SECTION_LIST_ALL_STATUSES,
    },
    {
      icon: "ti-circle-check",
      label: "Active Sections",
      value: summary.active,
      badge: {
        text: pctOfTotal(summary.active),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all sections",
      onClick: () => pushParams({ status: "active", page: "1" }),
      isActive: query.status === "active",
    },
    {
      icon: "ti-flag",
      label: "Completed Sections",
      value: summary.completed,
      badge: {
        text: pctOfTotal(summary.completed),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all sections",
      onClick: () => pushParams({ status: "completed", page: "1" }),
      isActive: query.status === "completed",
    },
    {
      icon: "ti-archive",
      label: "Archived Sections",
      value: summary.archived,
      badge: {
        text: pctOfTotal(summary.archived),
        bg: COLORS.iconBg,
        color: COLORS.textGray,
      },
      note: "of all sections",
      onClick: () => pushParams({ status: "archived", page: "1" }),
      isActive: query.status === "archived",
    },
  ]

  return (
    <>
      <ChartStyles />
      <style>{`
        .section-list-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .section-list-scroll::-webkit-scrollbar { width: 5px; }
        .section-list-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Section List</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {filteredCount} total sections
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
            placeholder="Search sections, course codes, or advisers"
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
                status: value === SECTION_LIST_ALL_STATUSES ? null : value,
                page: "1",
              })
            }
          >
            {SECTION_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label={adviserLabel}
            value={query.adviserId}
            onChange={(value) =>
              pushParams({
                adviserId: value === SECTION_LIST_ALL_ADVISERS ? null : value,
                page: "1",
              })
            }
          >
            <option value={SECTION_LIST_ALL_ADVISERS}>All Advisers</option>
            {advisers.map((adviser) => (
              <option key={adviser.adviserUserId} value={adviser.adviserUserId}>
                {adviser.fullName}
              </option>
            ))}
          </FilterDropdown>
        </div>

        <AdminAddButton label="Add section" onClick={openCreate} />
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
                    label="Section"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Course"
                    sortable
                    sortActive={query.sort === "course"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("course")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Students"
                    sortable
                    sortActive={query.sort === "students"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("students")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Status"
                    sortable
                    sortActive={query.sort === "status"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("status")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Actions" />
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div
          className="section-list-scroll admin-list-table-scroll"
        >
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
              {pageSections.length === 0 ? (
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
                    No sections match your filters.
                  </td>
                </tr>
              ) : (
                pageSections.map((section) => {
                  const badge = SECTION_STATUS_BADGE[section.statusCode]
                  return (
                    <tr
                      key={section.sectionId}
                      className="anim-list-item"
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          Section {section.name}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {section.courseCode}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {section.adviserName}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {section.studentCount}
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          enrolled
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            ...TYPE.caption,
                            fontWeight: 600,
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {section.statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => openEdit(section)}
                            aria-label={`Edit section ${section.name}`}
                            title="Edit section"
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
                            onClick={() => openDeleteConfirm(section)}
                            aria-label={`Delete section ${section.name}`}
                            title="Delete section"
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <ListPagination
          page={query.page}
          totalPages={totalPages}
          pageSize={SECTION_LIST_PAGE_SIZE}
          totalCount={filteredCount}
          onPageChange={goToPage}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <SectionFormModal
        open={formOpen}
        mode={formMode}
        advisers={advisers}
        statuses={statuses}
        activeTermId={meta.activeTermId}
        initialEdit={editSection ? sectionRowToEditPayload(editSection) : null}
        onClose={closeForm}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Section"
        message={deleteMessage}
        subjectName={
          deleteTarget
            ? `Section ${deleteTarget.name} — ${deleteTarget.courseCode}`
            : undefined
        }
        confirmLabel={deleteTarget?.studentCount ? "Archive Section" : "Delete Section"}
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}
