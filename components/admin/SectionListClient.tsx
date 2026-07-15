"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import DeleteImpactModal from "@/components/admin/DeleteImpactModal"
import ReassignClassModal from "@/components/admin/ReassignClassModal"
import { NstpModal, ModalField, ModalRow } from "@/components/shared/Modal"
import AdminAddButton from "@/components/admin/AdminAddButton"
import SectionFormModal from "@/components/admin/SectionFormModal"
import { adminClickableRowProps } from "@/components/admin/admin-list-row"
import {
  archiveSection,
  deleteSection,
  getSectionDeleteImpactAction,
} from "@/lib/admin/section-list-actions"
import { getClassReassignmentDataAction } from "@/lib/admin/adviser-list-actions"
import type { ClassReassignmentData } from "@/lib/admin/class-reassign"
import type { DeleteImpact } from "@/lib/admin/dependent-checks"
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
import {
  buildClassDimensionFilterGroups,
  matchesActiveFilters,
  matchesClassDimensionFilters,
  withoutClassDimensionFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import { FONT_BODY, PAGE_TITLE, PROFILE_PILL, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function needsFacilitatorReassignment(section: SectionListRow): boolean {
  return (
    !section.adviserIsActive &&
    section.statusCode !== "completed" &&
    section.statusCode !== "archived"
  )
}

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

function initialFiltersFromQuery(query: SectionListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.status !== SECTION_LIST_ALL_STATUSES) {
    filters.statusCode = [query.status]
  }
  if (query.adviserId !== SECTION_LIST_ALL_ADVISERS) {
    filters.adviserUserId = [query.adviserId]
  }
  return filters
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
  const [detailSection, setDetailSection] = useState<SectionListRow | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<SectionListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SectionListRow | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)
  const [pageSize, setPageSize] = useState(SECTION_LIST_PAGE_SIZE)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignData, setReassignData] = useState<ClassReassignmentData | null>(null)
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [isLoadingReassign, startReassignLoad] = useTransition()

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

  const filterGroups: FilterGroupDef[] = useMemo(
    () => [
      {
        label: "Status",
        field: "statusCode",
        singleSelect: true,
        options: SECTION_STATUS_FILTER_OPTIONS.filter((o) => o.value !== SECTION_LIST_ALL_STATUSES).map(
          (o) => ({ value: o.value, label: o.label })
        ),
      },
      ...buildClassDimensionFilterGroups(sections),
    ],
    [sections]
  )

  const searchFiltered = useMemo(
    () =>
      filterSectionListRows(sections, {
        ...query,
        search: searchInput,
        status: SECTION_LIST_ALL_STATUSES,
        adviserId: SECTION_LIST_ALL_ADVISERS,
      }),
    [sections, query, searchInput]
  )

  const visibleSections = useMemo(
    () =>
      searchFiltered.filter(
        (section) =>
          matchesActiveFilters(
            { statusCode: section.statusCode },
            withoutClassDimensionFilters(activeFilters)
          ) &&
          matchesClassDimensionFilters(
            {
              courseCode: section.courseCode,
              adviserUserId: section.adviserUserId,
              schoolYear: section.schoolYear,
            },
            activeFilters
          )
      ),
    [searchFiltered, activeFilters]
  )

  const {
    rows: pageSections,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateSectionListRows(visibleSections, query.page, pageSize),
    [visibleSections, query.page, pageSize]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.sort, query.dir, activeFilters, pageSize])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize)
    pushParams({ page: "1" })
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

  /** Status-dependent danger action: non-archived classes archive; archived classes hard-delete. */
  function openDangerAction(section: SectionListRow) {
    setDeleteError(null)
    if (section.statusCode !== "archived") {
      setArchiveTarget(section)
      return
    }
    setDeleteImpact(null)
    setDeleteTarget(section)
    getSectionDeleteImpactAction(section.sectionId).then((res) => {
      if (res.ok) {
        setDeleteImpact(res.impact)
      } else {
        setDeleteImpact({
          state: "blocked",
          lifecycleBlocked: res.error,
          blockers: [],
          cascades: [],
          notes: [],
        })
      }
    })
  }

  function closeArchiveConfirm() {
    if (isDeleting) return
    setArchiveTarget(null)
    setDeleteError(null)
  }

  function confirmArchive() {
    if (!archiveTarget) return

    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await archiveSection(archiveTarget.sectionId)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      setArchiveTarget(null)
      window.location.reload()
    })
  }

  function closeDeleteConfirm() {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteImpact(null)
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

  function openReassign(section: SectionListRow) {
    setReassignError(null)
    startReassignLoad(async () => {
      const res = await getClassReassignmentDataAction(section.adviserUserId)
      if (!res.ok) {
        setReassignError(res.error)
        return
      }

      // Prefer the clicked class, then any other current-term classes that
      // still need a facilitator for this inactive adviser.
      const needingIds = new Set(
        sections
          .filter(
            (row) =>
              row.adviserUserId === section.adviserUserId &&
              needsFacilitatorReassignment(row)
          )
          .map((row) => row.sectionId)
      )
      const byId = new Map(res.data.classes.map((c) => [c.sectionId, c]))
      const orderedIds = [
        section.sectionId,
        ...[...needingIds].filter((id) => id !== section.sectionId),
      ]
      const classes = orderedIds
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))

      if (classes.length === 0) {
        setReassignError("No classes left to reassign for this facilitator.")
        return
      }

      setDetailSection(null)
      setReassignData({ classes })
      setReassignOpen(true)
    })
  }

  function closeReassignModal() {
    setReassignOpen(false)
    setReassignData(null)
    setReassignError(null)
  }

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-layout-grid",
      label: "Total Classes",
      value: summary.total,
      note: "this term",
      onClick: () => setStatusFilter(null),
      isActive: !activeFilters.statusCode?.length,
    },
    {
      icon: "ti-circle-check",
      label: "Active Classes",
      value: summary.active,
      badge: {
        text: pctOfTotal(summary.active),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all classes",
      onClick: () => setStatusFilter("active"),
      isActive: activeFilters.statusCode?.includes("active") ?? false,
    },
    {
      icon: "ti-flag",
      label: "Completed Classes",
      value: summary.completed,
      badge: {
        text: pctOfTotal(summary.completed),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all classes",
      onClick: () => setStatusFilter("completed"),
      isActive: activeFilters.statusCode?.includes("completed") ?? false,
    },
    {
      icon: "ti-archive",
      label: "Archived Classes",
      value: summary.archived,
      badge: {
        text: pctOfTotal(summary.archived),
        bg: COLORS.iconBg,
        color: COLORS.textGray,
      },
      note: "of all classes",
      onClick: () => setStatusFilter("archived"),
      isActive: activeFilters.statusCode?.includes("archived") ?? false,
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Classes</h1>
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
          title="All Classes"
          count={`${filteredCount} class${filteredCount !== 1 ? "es" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search classes, course codes, or advisers"
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            pushParams({ page: "1" })
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ status: null, page: "1" })
          }}
          actions={<AdminAddButton label="Add class" onClick={openCreate} />}
        />

        {reassignError && !detailSection && (
          <p
            role="alert"
            style={{
              ...TYPE.caption,
              color: COLORS.maroon,
              margin: "0 20px 12px",
              fontWeight: 600,
            }}
          >
            {reassignError}
          </p>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th style={{ width: "22%" }}>
                  <AdminSortHeader
                    label="Class"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ width: "18%" }}>
                  <AdminSortHeader
                    label="Course"
                    sortable
                    sortActive={query.sort === "course"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("course")}
                  />
                </th>
                <th style={{ width: "24%" }}>
                  <AdminSortHeader
                    label="Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ width: "14%", textAlign: "center" }}>
                  <AdminSortHeader
                    label="Students"
                    align="center"
                    sortable
                    sortActive={query.sort === "students"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("students")}
                  />
                </th>
                <th style={{ width: "14%" }}>
                  <AdminSortHeader
                    label="Status"
                    sortable
                    sortActive={query.sort === "status"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("status")}
                  />
                </th>
              </tr>
            </thead>
            <tbody key={animKey}>
              {pageSections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    No classes match your filters.
                  </td>
                </tr>
              ) : (
                pageSections.map((section) => {
                  const badge = SECTION_STATUS_BADGE[section.statusCode]
                  const showReassignNotice = needsFacilitatorReassignment(section)
                  return (
                    <tr
                      key={section.sectionId}
                      {...adminClickableRowProps(() => setDetailSection(section))}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                          {section.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {section.courseCode}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {section.adviserName}
                        </div>
                        {showReassignNotice && (
                          <div
                            role="status"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 6,
                              marginTop: 5,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 5,
                                color: COLORS.maroon,
                                fontSize: 12,
                                fontWeight: 600,
                                lineHeight: 1.35,
                              }}
                            >
                              <i
                                className="ti ti-alert-triangle"
                                aria-hidden="true"
                                style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}
                              />
                              <span>Facilitator is inactive — reassign required.</span>
                            </div>
                            <button
                              type="button"
                              disabled={isLoadingReassign}
                              onClick={(e) => {
                                e.stopPropagation()
                                openReassign(section)
                              }}
                              style={{
                                ...TYPE.caption,
                                fontWeight: 700,
                                color: COLORS.green,
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: isLoadingReassign ? "not-allowed" : "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              Reassign facilitator
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ color: COLORS.textDark }}>
                          {section.studentCount}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {section.statusLabel}
                        </span>
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
          pageSize={pageSize}
          totalCount={filteredCount}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
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

      {detailSection && (
        <NstpModal
          open
          onClose={() => setDetailSection(null)}
          title={detailSection.name}
          subtitle={detailSection.adviserName}
          size="md"
          actions={[
            ...(needsFacilitatorReassignment(detailSection)
              ? [
                  {
                    label: isLoadingReassign ? "Loading…" : "Reassign facilitator",
                    variant: "primary" as const,
                    disabled: isLoadingReassign,
                    onClick: () => openReassign(detailSection),
                  },
                ]
              : [
                  {
                    label: "Edit",
                    variant: "primary" as const,
                    onClick: () => {
                      openEdit(detailSection)
                      setDetailSection(null)
                    },
                  },
                ]),
            ...(needsFacilitatorReassignment(detailSection)
              ? [
                  {
                    label: "Edit",
                    variant: "secondary" as const,
                    onClick: () => {
                      openEdit(detailSection)
                      setDetailSection(null)
                    },
                  },
                ]
              : []),
            {
              label: detailSection.statusCode === "archived" ? "Delete" : "Archive",
              variant: "danger",
              disabled: isDeleting,
              onClick: () => {
                openDangerAction(detailSection)
                setDetailSection(null)
              },
            },
          ]}
        >
          {needsFacilitatorReassignment(detailSection) && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(123, 29, 29, 0.08)",
                color: COLORS.maroon,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              <i
                className="ti ti-alert-triangle"
                aria-hidden="true"
                style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}
              />
              <span>
                This facilitator is inactive. Reassign a new facilitator for this class.
              </span>
            </div>
          )}
          {reassignError && (
            <p style={{ ...TYPE.caption, color: COLORS.maroon, margin: "0 0 12px" }}>
              {reassignError}
            </p>
          )}
          <ModalRow>
            <ModalField label="Adviser" value={detailSection.adviserName} />
            <ModalField label="Students" value={`${detailSection.studentCount} enrolled`} />
          </ModalRow>
          <ModalRow>
            <ModalField
              label="Required Hours"
              value={`${detailSection.requiredHourTotal} hours`}
            />
            <ModalField label="Daily Cutoff" value={detailSection.dailyCutoffTime} />
          </ModalRow>
          <ModalRow>
            <ModalField label="Status">
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: SECTION_STATUS_BADGE[detailSection.statusCode].bg,
                  color: SECTION_STATUS_BADGE[detailSection.statusCode].color,
                }}
              >
                {detailSection.statusLabel}
              </span>
            </ModalField>
          </ModalRow>
        </NstpModal>
      )}

      <ReassignClassModal
        open={reassignOpen}
        classes={reassignData?.classes ?? []}
        onClose={closeReassignModal}
        onReassigned={() => {
          closeReassignModal()
          window.location.reload()
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(archiveTarget)}
        title="Archive Class"
        message="The class will be archived. Enrollments and history are kept; you can restore it by changing its status back to Active."
        subjectName={archiveTarget?.name}
        confirmLabel="Archive Class"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeArchiveConfirm}
        onConfirm={confirmArchive}
      />

      <DeleteImpactModal
        open={Boolean(deleteTarget)}
        title="Delete Class"
        subjectName={deleteTarget?.name}
        impact={deleteImpact}
        requireTypedConfirm
        confirmLabel="Delete Permanently"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}