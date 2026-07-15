"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import AdminAddButton from "@/components/admin/AdminAddButton"
import { NstpModal, ModalField, ModalRow } from "@/components/shared/Modal"
import FormDetailModal from "@/components/admin/FormDetailModal"
import FormSubmissionsModal from "@/components/admin/FormSubmissionsModal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import CreateFormModal from "@/components/admin/CreateFormModal"
import ImportFormsModal from "@/components/admin/ImportFormsModal"
import { adminClickableRowProps } from "@/components/admin/admin-list-row"
import { deleteForm } from "@/lib/admin/form-list-actions"
import { formRowToEditPayload } from "@/lib/admin/form-edit"
import {
  buildClassDimensionFilterGroups,
  matchesActiveFilters,
  matchesClassDimensionFilters,
  withoutClassDimensionFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import {
  FORM_LIST_ALL_SECTIONS,
  FORM_LIST_PAGE_SIZE,
  filterFormListRows,
  formatFormDeadline,
  paginateFormListRows,
  type AdminCurrentUser,
  type FormListMeta,
  type FormListQuery,
  type FormListRow,
  type FormListSectionOption,
  type FormListSortKey,
  type FormListSummary,
} from "@/lib/admin/form-list"
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

function initialFiltersFromQuery(query: FormListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.scope !== "all") {
    filters.scope = [query.scope]
  }
  return filters
}

export default function FormListClient({
  forms,
  sections,
  summary,
  meta,
  currentUser,
  query,
}: {
  forms: FormListRow[]
  sections: FormListSectionOption[]
  summary: FormListSummary
  meta: FormListMeta
  currentUser: AdminCurrentUser
  query: FormListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [editForm, setEditForm] = useState<FormListRow | null>(null)
  const [detailForm, setDetailForm] = useState<FormListRow | null>(null)
  const [formDetailView, setFormDetailView] = useState<FormListRow | null>(null)
  const [submissionsView, setSubmissionsView] = useState<FormListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FormListRow | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)
  const [pageSize, setPageSize] = useState(FORM_LIST_PAGE_SIZE)

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === FORM_LIST_ALL_SECTIONS) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/forms?${params.toString()}`)
  }

  function toggleSort(key: FormListSortKey) {
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
    () => [...buildClassDimensionFilterGroups(sections)],
    [sections]
  )

  const searchFiltered = useMemo(
    () =>
      filterFormListRows(forms, {
        ...query,
        search: searchInput,
        sectionId: FORM_LIST_ALL_SECTIONS,
        scope: "all",
      }),
    [forms, query, searchInput]
  )

  const visibleForms = useMemo(
    () =>
      searchFiltered.filter(
        (form) =>
          matchesActiveFilters(
            { scope: form.isGlobal ? "global" : "section" },
            withoutClassDimensionFilters(activeFilters)
          ) &&
          matchesClassDimensionFilters(
            {
              courseCode: form.courseCode,
              adviserUserId: form.adviserUserId,
              schoolYear: form.schoolYear,
            },
            activeFilters
          )
      ),
    [searchFiltered, activeFilters]
  )

  const {
    rows: pageForms,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateFormListRows(visibleForms, query.page, pageSize),
    [visibleForms, query.page, pageSize]
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

  function setScopeFilter(scope: string | null) {
    setActiveFilters((prev) => {
      if (!scope) {
        const { scope: _, ...rest } = prev
        return rest
      }
      return { ...prev, scope: [scope] }
    })
    pushParams({ scope, page: "1" })
  }

  function openDeleteConfirm(form: FormListRow) {
    setDeleteError(null)
    setDeleteTarget(form)
  }

  function closeDeleteConfirm() {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return

    setDeleteError(null)
    setDeletingId(deleteTarget.rowId)

    startDeleteTransition(async () => {
      const result = await deleteForm(
        deleteTarget.formRequirementId,
        deleteTarget.sectionId,
        deleteTarget.isGlobal
      )
      setDeletingId(null)
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
      icon: "ti-clipboard-check",
      label: "Total Forms",
      value: summary.total,
      note: "active requirements",
      onClick: () => setScopeFilter(null),
      isActive: !activeFilters.scope?.length,
    },
    {
      icon: "ti-world",
      label: "Global Forms",
      value: summary.global,
      badge: {
        text: pctOfTotal(summary.global),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all forms",
      onClick: () => setScopeFilter("global"),
      isActive: activeFilters.scope?.includes("global") ?? false,
    },
    {
      icon: "ti-layout-grid",
      label: "Class Forms",
      value: summary.sectionSpecific,
      badge: {
        text: pctOfTotal(summary.sectionSpecific),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all forms",
      onClick: () => setScopeFilter("section"),
      isActive: activeFilters.scope?.includes("section") ?? false,
    },
    {
      icon: "ti-chart-bar",
      label: "Avg. Submission",
      value: summary.avgSubmissionPct,
      valueSuffix: "%",
      note: "across all forms",
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Forms</h1>
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
          title="All Forms"
          count={`${filteredCount} form${filteredCount !== 1 ? "s" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search forms"
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            pushParams({ page: "1" })
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ scope: null, page: "1" })
          }}
          actions={
            <AdminAddButton label="Import form" onClick={() => setImportOpen(true)} />
          }
        />

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ width: "24%" }}>
                  <AdminSortHeader
                    label="Form Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ width: "16%" }}>
                  <AdminSortHeader
                    label="Class"
                    sortable
                    sortActive={query.sort === "section"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("section")}
                  />
                </th>
                <th style={{ width: "18%" }}>
                  <AdminSortHeader
                    label="Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ width: "16%" }}>
                  <AdminSortHeader
                    label="Total Submissions"
                    align="center"
                    sortable
                    sortActive={query.sort === "analytics"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("analytics")}
                  />
                </th>
                <th style={{ width: "16%" }}>
                  <AdminSortHeader
                    label="Deadline"
                    sortable
                    sortActive={query.sort === "deadline"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("deadline")}
                  />
                </th>
              </tr>
            </thead>
            <tbody key={animKey}>
              {pageForms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    No forms match your filters.
                  </td>
                </tr>
              ) : (
                pageForms.map((form) => {
                  const deadline = formatFormDeadline(form.dueDate)
                  return (
                    <tr
                      key={form.rowId}
                      {...adminClickableRowProps(() => setDetailForm(form))}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                          {form.formName}
                        </div>
                        {form.isSample ? (
                          <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                            Sample data
                          </div>
                        ) : (
                          form.isGlobal && (
                            <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                              Global default
                            </div>
                          )
                        )}
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {form.sectionName}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {form.adviserName}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            display: "inline-flex",
                            alignItems: "baseline",
                            justifyContent: "center",
                            gap: 2,
                            lineHeight: 1,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              color: COLORS.textDark,
                            }}
                          >
                            {form.submittedCount}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: COLORS.textGray,
                            }}
                          >
                            /{form.totalStudents}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {deadline.date}
                        </div>
                        {deadline.time && (
                          <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                            {deadline.time}
                          </div>
                        )}
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
          totalCount={filteredCount}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <ImportFormsModal
        open={importOpen}
        sections={sections}
        onClose={() => setImportOpen(false)}
      />
      <CreateFormModal
        open={editForm !== null}
        mode="edit"
        sections={sections}
        initialEdit={editForm ? formRowToEditPayload(editForm) : null}
        onClose={() => setEditForm(null)}
      />

      {detailForm && (
        <NstpModal
          open
          onClose={() => setDetailForm(null)}
          title={detailForm.formName}
          subtitle={`${detailForm.sectionName} · ${detailForm.adviserName}`}
          size="lg"
          actions={[
            {
              label: "View form",
              variant: "secondary",
              onClick: () => {
                setFormDetailView(detailForm)
                setDetailForm(null)
              },
            },
            {
              label: "View submissions",
              variant: "secondary",
              onClick: () => {
                setSubmissionsView(detailForm)
                setDetailForm(null)
              },
            },
            {
              label: "Edit",
              variant: "primary",
              disabled: detailForm.isSample,
              onClick: () => {
                setEditForm(detailForm)
                setDetailForm(null)
              },
            },
            {
              label: "Delete",
              variant: "danger",
              disabled:
                detailForm.isSample || (isDeleting && deletingId === detailForm.rowId),
              onClick: () => {
                openDeleteConfirm(detailForm)
                setDetailForm(null)
              },
            },
          ]}
        >
          <ModalRow>
            <ModalField label="Class" value={detailForm.sectionName} />
            <ModalField label="Submissions">
              {detailForm.submittedCount} of {detailForm.totalStudents} students
            </ModalField>
          </ModalRow>
          <ModalRow>
            <ModalField
              label="Deadline"
              value={
                detailForm.dueDate
                  ? `${formatFormDeadline(detailForm.dueDate).date}${
                      formatFormDeadline(detailForm.dueDate).time
                        ? ` at ${formatFormDeadline(detailForm.dueDate).time}`
                        : ""
                    }`
                  : "No deadline"
              }
            />
            <ModalField
              label="Scope"
              value={detailForm.isGlobal ? "Global default" : "Class-specific"}
            />
          </ModalRow>
          <ModalRow>
            <ModalField label="Status" value={detailForm.isActive ? "Active" : "Inactive"} />
            {detailForm.isSample ? (
              <ModalField label="Note" value="Sample preview row — not stored in the database." />
            ) : (
              <ModalField label="Requirement ID" value={detailForm.formRequirementId} />
            )}
          </ModalRow>
        </NstpModal>
      )}

      {formDetailView && (
        <FormDetailModal form={formDetailView} onClose={() => setFormDetailView(null)} />
      )}

      {submissionsView && (
        <FormSubmissionsModal
          form={submissionsView}
          onClose={() => setSubmissionsView(null)}
        />
      )}

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove Form"
        subjectName={deleteTarget?.formName}
        message={
          deleteTarget?.isGlobal
            ? "Remove this global form from the selected class? Other classes will not be affected."
            : "Remove this form? Students will no longer be required to submit it."
        }
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}