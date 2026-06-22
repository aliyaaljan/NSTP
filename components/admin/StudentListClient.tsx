"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ImportStudentsModal from "@/components/admin/ImportStudentsModal"
import {
  PROGRESS_STATUS_FILTER_OPTIONS,
  PROGRESS_STATUS_LABELS,
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
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  maroon: "#7B1113",
  cardBg: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  border: "#ECECEA",
  tableHeadBg: "#E8E8E5",
  green: "#2D6A4F",
  greenBgLight: "#DFEEE6",
  amber: "#B5451B",
  amberBgLight: "#FBEFDA",
  maroonDark: "#5C0B18",
  maroonDarkBgLight: "#EAD9DB",
}

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
        gap: 12,
        background: COLORS.maroon,
        borderRadius: 40,
        padding: "8px 22px 8px 10px",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: user.avatarUrl
            ? `center/cover no-repeat url(${user.avatarUrl})`
            : "#D8D8D5",
          flexShrink: 0,
        }}
      />
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ ...TYPE.bodyBold, color: "#fff" }}>{user.name}</div>
        <div
          style={{
            ...TYPE.caption,
            color: "rgba(255,255,255,0.75)",
            fontStyle: "normal",
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
  containerRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={containerRef}
      style={{
        ...TYPE.bodyBold,
        fontFamily: FONT_HEADING,
        color: "#fff",
        background: COLORS.maroon,
        borderRadius: 24,
        padding: "11px 22px",
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
  const [searchInput, setSearchInput] = useState(query.search)
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

  return (
    <>
      <style>{`
        .student-list-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .student-list-scroll::-webkit-scrollbar { width: 5px; }
        .student-list-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <ProfilePill user={currentUser} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...TYPE.h1, color: COLORS.textDark, margin: 0 }}>Student List</h1>
        <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
          Academic Year {meta.academicYear} | {meta.semester}
        </p>
        <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
          {visibleStudents.length} total students
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <i
            className="ti ti-search"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 18,
              color: COLORS.maroon,
            }}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search students"
            style={{
              width: "100%",
              ...TYPE.body,
              color: COLORS.textDark,
              border: `1.5px solid ${COLORS.maroon}`,
              borderRadius: 999,
              padding: "12px 18px 12px 46px",
              outline: "none",
              background: "#fff",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          style={{
            ...TYPE.bodyBold,
            fontFamily: FONT_HEADING,
            color: "#fff",
            background: COLORS.maroon,
            border: "none",
            borderRadius: 24,
            padding: "11px 22px",
            cursor: "pointer",
          }}
        >
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
          borderRadius: 14,
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
                      <td style={{ padding: "16px 18px" }} />
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
