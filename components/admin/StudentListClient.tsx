"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import EditStudentModal from "@/components/admin/EditStudentModal"
import ImportStudentsModal from "@/components/admin/ImportStudentsModal"
import { deleteStudent } from "@/lib/admin/student-list-actions"
import {
  PROGRESS_STATUS_FILTER_OPTIONS,
  PROGRESS_STATUS_LABELS,
  type StudentProgressStatus,
} from "@/lib/admin/student-progress"
import type {
  AdminCurrentUser,
  StudentListMeta,
  StudentListQuery,
  StudentListRow,
  StudentListSectionOption,
  StudentListSortKey,
} from "@/lib/admin/student-list"
import { STUDENT_LIST_ALL_SECTIONS, filterStudentListRows } from "@/lib/admin/student-list"
import { FONT_BODY, PAGE_TITLE, PROFILE_PILL, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const STATUS_BADGE: Record<
  StudentProgressStatus,
  { bg: string; color: string }
> = {
  on_track: { bg: COLORS.greenBgLight, color: COLORS.green },
  in_progress: { bg: COLORS.amberBgLight, color: COLORS.amber },
  at_risk: { bg: COLORS.maroonDarkBgLight, color: COLORS.maroonDark },
}

interface CurrentUser extends AdminCurrentUser {}

function ProfilePill({ user }: { user: CurrentUser }) {
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
  containerRef,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  containerRef?: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={containerRef}
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
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          cursor: "pointer",
          width: "100%",
        }}
      >
        {children}
      </select>
    </div>
  )
}

const TABLE_COL_WIDTHS = ["28%", "14%", "22%", "10%", "18%", "8%"]

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
  filterable = false,
  filterActive = false,
  onFilter,
}: {
  label: string
  align?: "left" | "center"
  sortable?: boolean
  sortActive?: boolean
  sortDirection?: "asc" | "desc"
  onSort?: () => void
  filterable?: boolean
  filterActive?: boolean
  onFilter?: () => void
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
      {filterable && (
        <button
          type="button"
          onClick={onFilter}
          aria-label={`Filter ${label}`}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <i
            className="ti ti-filter"
            style={{
              fontSize: 14,
              color: filterActive ? COLORS.textDark : "#C4C4C0",
            }}
          />
        </button>
      )}
    </div>
  )
}

export default function StudentListClient({
  students,
  sections,
  meta,
  currentUser,
  query,
}: {
  students: StudentListRow[]
  sections: StudentListSectionOption[]
  meta: StudentListMeta
  currentUser: CurrentUser
  query: StudentListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<StudentListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const sectionFilterRef = useRef<HTMLDivElement>(null)
  const statusFilterRef = useRef<HTMLDivElement>(null)

  function openFilterSelect(ref: React.RefObject<HTMLDivElement | null>) {
    const select = ref.current?.querySelector("select")
    if (select instanceof HTMLSelectElement) {
      select.focus()
      select.click()
    }
  }

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === STUDENT_LIST_ALL_SECTIONS) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/students?${params.toString()}`)
  }

  function toggleSort(key: StudentListSortKey) {
    const nextDir =
      query.sort === key ? (query.dir === "asc" ? "desc" : "asc") : "asc"
    pushParams({ sort: key, dir: nextDir })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === query.search) return
      pushParams({ q: searchInput.trim() || null })
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const visibleStudents = useMemo(
    () => filterStudentListRows(students, { ...query, search: searchInput }),
    [students, query, searchInput]
  )

  const sectionLabel =
    query.sectionId !== STUDENT_LIST_ALL_SECTIONS
      ? `Section ${sections.find((s) => s.sectionId === query.sectionId)?.name ?? ""}`
      : "All Sections"
  const statusLabel =
    PROGRESS_STATUS_FILTER_OPTIONS.find((o) => o.value === query.progressStatus)
      ?.label ?? "All Status"

  function openDeleteConfirm(enrollmentId: string, name: string) {
    setDeleteError(null)
    setDeleteTarget({ id: enrollmentId, name })
  }

  function closeDeleteConfirm() {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function confirmDelete() {
    if (!deleteTarget) return

    setDeleteError(null)
    setDeletingId(deleteTarget.id)

    startDeleteTransition(async () => {
      const result = await deleteStudent(deleteTarget.id)
      setDeletingId(null)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      setDeleteTarget(null)
      window.location.reload()
    })
  }

  return (
    <>
      <style>{`
        .student-list-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .student-list-scroll::-webkit-scrollbar { width: 5px; }
        .student-list-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Student List</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {visibleStudents.length} total students
          </p>
        </div>
        <ProfilePill user={currentUser} />
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
            placeholder="Search students"
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          style={{
            fontFamily: FONT_BODY,
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#fff",
            background: COLORS.green,
            border: "none",
            borderRadius: 20,
            padding: "5px 13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 16 }} />
          Import Student/s
        </button>

        <FilterDropdown
          label={sectionLabel}
          value={query.sectionId}
          containerRef={sectionFilterRef}
          onChange={(value) =>
            pushParams({
              sectionId: value === STUDENT_LIST_ALL_SECTIONS ? null : value,
            })
          }
        >
          <option value={STUDENT_LIST_ALL_SECTIONS}>All Sections</option>
          {sections.map((section) => (
            <option key={section.sectionId} value={section.sectionId}>
              Section {section.name}
            </option>
          ))}
        </FilterDropdown>

        <FilterDropdown
          label={statusLabel}
          value={query.progressStatus}
          containerRef={statusFilterRef}
          onChange={(value) =>
            pushParams({ status: value === "all" ? null : value })
          }
        >
          {PROGRESS_STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FilterDropdown>
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
              minWidth: 920,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <thead>
              <tr style={{ background: COLORS.tableHeadBg }}>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Student Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Student ID" />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Section Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                    filterable
                    filterActive={query.sectionId !== STUDENT_LIST_ALL_SECTIONS}
                    onFilter={() => openFilterSelect(sectionFilterRef)}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Hours" />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "center" }}>
                  <ColumnHeader
                    label="Progress & Status"
                    align="center"
                    filterable
                    filterActive={query.progressStatus !== "all"}
                    onFilter={() => openFilterSelect(statusFilterRef)}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left", width: 80 }}>
                  <ColumnHeader label="Actions" />
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div
          className="student-list-scroll"
          style={{ overflowX: "auto", overflowY: "auto", maxHeight: 520 }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 920,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <tbody>
              {visibleStudents.length === 0 ? (
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
                    No students match your filters.
                  </td>
                </tr>
              ) : (
                visibleStudents.map((student) => {
                  const badge = STATUS_BADGE[student.progressStatus]
                  return (
                    <tr
                      key={student.enrollmentId}
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {student.fullName}
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          {student.email}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {student.studentNumber ?? "—"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {student.sectionName}
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          {student.adviserName}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {student.hoursCompleted}/{student.hoursRequired}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          verticalAlign: "middle",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {student.completionPct}%
                        </div>
                        <span
                          style={{
                            ...TYPE.bodyBold,
                            display: "inline-block",
                            marginTop: 6,
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {PROGRESS_STATUS_LABELS[student.progressStatus]}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <button
                            type="button"
                            aria-label={`Edit ${student.fullName}`}
                            title="Edit student"
                            onClick={() => setEditStudent(student)}
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
                            aria-label={`Delete ${student.fullName}`}
                            title="Delete student"
                            disabled={isDeleting && deletingId === student.enrollmentId}
                            onClick={() =>
                              openDeleteConfirm(student.enrollmentId, student.fullName)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              padding: 4,
                              cursor:
                                isDeleting && deletingId === student.enrollmentId
                                  ? "not-allowed"
                                  : "pointer",
                              color: COLORS.maroon,
                              opacity:
                                isDeleting && deletingId === student.enrollmentId ? 0.5 : 1,
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
      </div>

      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} />
      <EditStudentModal
        open={editStudent !== null}
        student={editStudent}
        sections={sections}
        onClose={() => setEditStudent(null)}
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove Student"
        subjectName={deleteTarget?.name}
        message="Remove this student from the list? This action cannot be undone."
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}
