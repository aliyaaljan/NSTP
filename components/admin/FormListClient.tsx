"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import CreateFormModal from "@/components/admin/CreateFormModal"
import ImportFormsModal from "@/components/admin/ImportFormsModal"
import { deleteForm } from "@/lib/admin/form-list-actions"
import { formRowToEditPayload } from "@/lib/admin/form-edit"
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

const TABLE_COL_WIDTHS = ["28%", "22%", "18%", "22%", "10%"]

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
  const [viewForm, setViewForm] = useState<FormListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FormListRow | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)

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

  const visibleForms = useMemo(
    () => filterFormListRows(forms, { ...query, search: searchInput }),
    [forms, query, searchInput]
  )

  const {
    rows: pageForms,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateFormListRows(visibleForms, query.page),
    [visibleForms, query.page]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.sectionId, query.sort, query.dir])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  const sectionLabel =
    query.sectionId !== FORM_LIST_ALL_SECTIONS
      ? `Section ${sections.find((s) => s.sectionId === query.sectionId)?.name ?? ""}`
      : "All Sections"

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
    },
    {
      icon: "ti-world",
      label: "Global Forms",
      value: summary.global,
      valueColor: COLORS.green,
      badge: {
        text: pctOfTotal(summary.global),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all forms",
    },
    {
      icon: "ti-layout-grid",
      label: "Section Forms",
      value: summary.sectionSpecific,
      valueColor: COLORS.maroon,
      badge: {
        text: pctOfTotal(summary.sectionSpecific),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all forms",
    },
    {
      icon: "ti-chart-bar",
      label: "Avg. Submission",
      value: summary.avgSubmissionPct,
      valueSuffix: "%",
      note: "across all forms",
    },
  ]

  return (
    <>
      <ChartStyles />
      <style>{`
        .form-list-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .form-list-scroll::-webkit-scrollbar { width: 5px; }
        .form-list-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Forms</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {filteredCount} total forms
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <KpiStatCardGrid columns={4}>
        {statCards.map((card, index) => (
          <KpiStatCard key={index} {...card} />
        ))}
      </KpiStatCardGrid>

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
            placeholder="Search forms"
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
        <FilterDropdown
          label={sectionLabel}
          value={query.sectionId}
          onChange={(value) =>
            pushParams({
              sectionId: value === FORM_LIST_ALL_SECTIONS ? null : value,
              page: "1",
            })
          }
        >
          <option value={FORM_LIST_ALL_SECTIONS}>All Sections</option>
          {sections.map((section) => (
            <option key={section.sectionId} value={section.sectionId}>
              Section {section.name}
            </option>
          ))}
        </FilterDropdown>

        <button
          type="button"
          onClick={() => setImportOpen(true)}
          aria-label="Import form"
          title="Import form"
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: COLORS.green,
            color: "#fff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 18 }} />
        </button>
      </div>

      <div
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: COLORS.radius,
          boxShadow: COLORS.cardShadow,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
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
                    label="Form Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Section"
                    sortable
                    sortActive={query.sort === "section"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("section")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Analytics"
                    sortable
                    sortActive={query.sort === "analytics"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("analytics")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Deadline"
                    sortable
                    sortActive={query.sort === "deadline"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("deadline")}
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
          className="form-list-scroll"
          style={{ overflowX: "auto", overflowY: "auto" }}
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
              {pageForms.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      ...TYPE.body,
                      color: COLORS.textGray,
                      textAlign: "center",
                      padding: "40px 18px",
                    }}
                  >
                    No forms match your filters.
                  </td>
                </tr>
              ) : (
                pageForms.map((form) => {
                  const deadline = formatFormDeadline(form.dueDate)
                  return (
                    <tr
                      key={form.rowId}
                      className="anim-list-item"
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {form.formName}
                        </div>
                        {form.isSample ? (
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            Sample data
                          </div>
                        ) : (
                          form.isGlobal && (
                            <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                              Global default
                            </div>
                          )
                        )}
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {form.sectionName} Section
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          {form.adviserName}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            fontFamily: FONT_BODY,
                            display: "flex",
                            alignItems: "baseline",
                            gap: 2,
                            lineHeight: 1,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "18px",
                              fontWeight: 800,
                              letterSpacing: "-0.02em",
                              color: COLORS.textDark,
                            }}
                          >
                            {form.submittedCount}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color: COLORS.textGray,
                            }}
                          >
                            /{form.totalStudents}
                          </span>
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          students submitted
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {deadline.date}
                        </div>
                        {deadline.time && (
                          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                            {deadline.time}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <button
                            type="button"
                            aria-label={`View ${form.formName}`}
                            title="View submissions"
                            onClick={() => setViewForm(form)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 4,
                              cursor: "pointer",
                              color: COLORS.maroon,
                            }}
                          >
                            <i className="ti ti-eye" style={{ fontSize: 18 }} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${form.formName}`}
                            title={form.isSample ? "Sample rows cannot be edited" : "Edit form"}
                            disabled={form.isSample}
                            onClick={() => !form.isSample && setEditForm(form)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 4,
                              cursor: form.isSample ? "not-allowed" : "pointer",
                              color: COLORS.maroon,
                              opacity: form.isSample ? 0.35 : 1,
                            }}
                          >
                            <i className="ti ti-pencil" style={{ fontSize: 18 }} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${form.formName}`}
                            title={form.isSample ? "Sample rows cannot be deleted" : "Delete form"}
                            disabled={
                              form.isSample || (isDeleting && deletingId === form.rowId)
                            }
                            onClick={() => !form.isSample && openDeleteConfirm(form)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 4,
                              cursor:
                                form.isSample || (isDeleting && deletingId === form.rowId)
                                  ? "not-allowed"
                                  : "pointer",
                              color: COLORS.maroon,
                              opacity:
                                form.isSample || (isDeleting && deletingId === form.rowId)
                                  ? 0.35
                                  : 1,
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
          totalCount={filteredCount}
          pageSize={FORM_LIST_PAGE_SIZE}
          onPageChange={goToPage}
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

      {viewForm && (
        <div
          role="presentation"
          onClick={() => setViewForm(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(44, 44, 42, 0.35)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              borderRadius: 16,
              overflow: "hidden",
              background: "#fff",
              padding: "24px",
            }}
          >
            <h2 style={{ ...TYPE.h1, color: COLORS.textDark, margin: "0 0 8px" }}>
              {viewForm.formName}
            </h2>
            <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "0 0 16px" }}>
              {viewForm.sectionName} Section · {viewForm.adviserName}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ ...TYPE.body, color: COLORS.textDark }}>
                <strong>Submissions:</strong> {viewForm.submittedCount} of{" "}
                {viewForm.totalStudents} students
              </div>
              <div style={{ ...TYPE.body, color: COLORS.textDark }}>
                <strong>Deadline:</strong>{" "}
                {formatFormDeadline(viewForm.dueDate).date}
                {viewForm.dueDate ? ` at ${formatFormDeadline(viewForm.dueDate).time}` : ""}
              </div>
              <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 8 }}>
                {viewForm.isSample
                  ? "Sample preview row — not stored in the database."
                  : `Requirement ID: ${viewForm.formRequirementId}`}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setViewForm(null)}
                style={{
                  ...TYPE.bodyBold,
                  background: COLORS.green,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove Form"
        subjectName={deleteTarget?.formName}
        message={
          deleteTarget?.isGlobal
            ? "Remove this global form from the selected section? Other sections will not be affected."
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
