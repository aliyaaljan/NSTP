"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
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
  buildSectionFormGroups,
  filterFormListRows,
  formatFormDeadline,
  formatSectionFormPreview,
  isLowCompletionForm,
  paginateFormListRows,
  type AdminCurrentUser,
  type FormListMeta,
  type FormListQuery,
  type FormListRow,
  type FormListSectionOption,
  type FormListSortKey,
  type FormListSummary,
  type FormListView,
  type SectionFormGroup,
} from "@/lib/admin/form-list"
import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function initialFiltersFromQuery(query: FormListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.scope !== "all") {
    filters.scope = [query.scope]
  }
  if (query.completion === "low") {
    filters.completion = ["low"]
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
  const [detailSection, setDetailSection] = useState<SectionFormGroup | null>(null)
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

  const isSectionsView = query.view === "sections"

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
        value === FORM_LIST_ALL_SECTIONS ||
        (key === "view" && value === "forms")
      ) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`/admin/forms?${params.toString()}`)
  }

  function setView(view: FormListView) {
    pushParams({
      view: view === "forms" ? null : view,
      sort: null,
      dir: null,
      page: "1",
    })
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

  const scopeFilters = useMemo(() => {
    const { completion: _, ...rest } = withoutClassDimensionFilters(activeFilters)
    return rest
  }, [activeFilters])

  const visibleForms = useMemo(
    () =>
      searchFiltered.filter(
        (form) =>
          (!(activeFilters.completion?.includes("low") ?? false) ||
            isLowCompletionForm(form)) &&
          matchesActiveFilters(
            { scope: form.isGlobal ? "global" : "section" },
            scopeFilters
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
    [searchFiltered, activeFilters, scopeFilters]
  )

  const sectionGroups = useMemo(
    () =>
      isSectionsView
        ? buildSectionFormGroups(visibleForms, query.sort, query.dir)
        : [],
    [isSectionsView, visibleForms, query.sort, query.dir]
  )

  const {
    rows: pageForms,
    totalPages: formTotalPages,
    totalCount: formFilteredCount,
  } = useMemo(
    () => paginateFormListRows(visibleForms, query.page, pageSize),
    [visibleForms, query.page, pageSize]
  )

  const {
    rows: pageSections,
    totalPages: sectionTotalPages,
    totalCount: sectionFilteredCount,
  } = useMemo(
    () => paginateFormListRows(sectionGroups, query.page, pageSize),
    [sectionGroups, query.page, pageSize]
  )

  const totalPages = isSectionsView ? sectionTotalPages : formTotalPages
  const filteredCount = isSectionsView ? sectionFilteredCount : formFilteredCount

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.sort, query.dir, query.view, activeFilters, pageSize])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize)
    pushParams({ page: "1" })
  }

  function clearKpiFilters() {
    setActiveFilters((prev) => {
      const { scope: _, completion: __, ...rest } = prev
      return rest
    })
    pushParams({ scope: null, completion: null, page: "1" })
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

  function setLowCompletionFilter(active: boolean) {
    setActiveFilters((prev) => {
      if (!active) {
        const { completion: _, ...rest } = prev
        return rest
      }
      return { ...prev, completion: ["low"] }
    })
    pushParams({ completion: active ? "low" : null, page: "1" })
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
      onClick: clearKpiFilters,
      isActive:
        !activeFilters.scope?.length && !activeFilters.completion?.length,
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
      icon: "ti-alert-triangle",
      label: "Low Completion",
      value: summary.lowCompletion,
      badge: {
        text: pctOfTotal(summary.lowCompletion),
        bg: COLORS.amberBgLight,
        color: COLORS.amber,
      },
      note: "below 50%",
      onClick: () => {
        const isOn = activeFilters.completion?.includes("low") ?? false
        setLowCompletionFilter(!isOn)
      },
      isActive: activeFilters.completion?.includes("low") ?? false,
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>
            {isSectionsView ? "Forms by Class" : "Forms"}
          </h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <AdminProfilePill user={currentUser} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["forms", "sections"] as const).map((v) => {
          const active = query.view === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                ...TYPE.bodyBold,
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: active ? COLORS.maroon : COLORS.iconBg,
                color: active ? "#fff" : COLORS.textGray,
              }}
            >
              {v === "forms" ? "Forms" : "Sections"}
            </button>
          )
        })}
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
          title={isSectionsView ? "Classes with Forms" : "All Forms"}
          count={
            isSectionsView
              ? `${filteredCount} class${filteredCount !== 1 ? "es" : ""} found`
              : `${filteredCount} form${filteredCount !== 1 ? "s" : ""} found`
          }
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={
            isSectionsView
              ? "Search classes, forms, or advisers"
              : "Search forms"
          }
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            pushParams({ page: "1" })
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ scope: null, completion: null, page: "1" })
          }}
          actions={
            <AdminAddButton label="Import form" onClick={() => setImportOpen(true)} />
          }
        />

        <div className="admin-table-wrapper">
          {isSectionsView ? (
            <table className="admin-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>
                    <AdminSortHeader
                      label="Class"
                      sortable
                      sortActive={query.sort === "section"}
                      sortDirection={query.dir}
                      onSort={() => toggleSort("section")}
                    />
                  </th>
                  <th style={{ width: "22%" }}>
                    <AdminSortHeader
                      label="Adviser"
                      sortable
                      sortActive={query.sort === "adviser"}
                      sortDirection={query.dir}
                      onSort={() => toggleSort("adviser")}
                    />
                  </th>
                  <th style={{ width: "12%", textAlign: "center" }}>
                    <AdminSortHeader
                      label="Forms"
                      align="center"
                      sortable
                      sortActive={query.sort === "formCount"}
                      sortDirection={query.dir}
                      onSort={() => toggleSort("formCount")}
                    />
                  </th>
                  <th style={{ width: "26%" }}>Form names</th>
                  <th style={{ width: "12%", textAlign: "center" }}>
                    <AdminSortHeader
                      label="Avg. Submission"
                      align="center"
                      sortable
                      sortActive={query.sort === "analytics"}
                      sortDirection={query.dir}
                      onSort={() => toggleSort("analytics")}
                    />
                  </th>
                </tr>
              </thead>
              <tbody key={animKey}>
                {pageSections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-table-empty">
                      No classes with forms match your filters.
                    </td>
                  </tr>
                ) : (
                  pageSections.map((group) => (
                    <tr
                      key={group.sectionId}
                      {...adminClickableRowProps(() => setDetailSection(group))}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                          {sectionLabelById.get(group.sectionId) ?? group.sectionName}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {group.adviserName}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            color: COLORS.textDark,
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {group.formCount}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {formatSectionFormPreview(group.forms)}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            color: COLORS.textDark,
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {group.avgSubmissionPct}%
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
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
          )}
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

      {detailSection && (
        <NstpModal
          open
          onClose={() => setDetailSection(null)}
          title={sectionLabelById.get(detailSection.sectionId) ?? detailSection.sectionName}
          subtitle={detailSection.adviserName}
          size="lg"
          actions={[
            {
              label: "Close",
              variant: "secondary",
              onClick: () => setDetailSection(null),
            },
          ]}
        >
          <ModalRow>
            <ModalField label="Adviser" value={detailSection.adviserName} />
            <ModalField
              label="Forms"
              value={`${detailSection.formCount} form${detailSection.formCount !== 1 ? "s" : ""}`}
            />
          </ModalRow>
          <ModalRow>
            <ModalField
              label="Avg. Submission"
              value={`${detailSection.avgSubmissionPct}%`}
            />
          </ModalRow>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.textGray,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Forms in this class
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {detailSection.forms.map((form) => {
                const deadline = formatFormDeadline(form.dueDate)
                return (
                  <div
                    key={form.rowId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "10px 12px",
                      background: COLORS.iconBg,
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: COLORS.textDark,
                          fontFamily: FONT_BODY,
                        }}
                      >
                        {form.formName}
                      </div>
                      <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                        {form.submittedCount}/{form.totalStudents} submitted
                        {deadline.date !== "—" ? ` · Due ${deadline.date}` : ""}
                        {form.isGlobal ? " · Global" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailForm(form)
                          setDetailSection(null)
                        }}
                        style={{
                          ...TYPE.caption,
                          fontWeight: 600,
                          border: "none",
                          background: "transparent",
                          color: COLORS.maroon,
                          cursor: "pointer",
                          padding: "4px 6px",
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
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