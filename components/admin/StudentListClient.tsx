"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
import AddChoiceModal from "@/components/admin/AddChoiceModal"
import AddStudentModal from "@/components/admin/AddStudentModal"
import { NstpModal, ModalField, ModalRow } from "@/components/shared/Modal"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import DeleteImpactModal from "@/components/admin/DeleteImpactModal"
import EditStudentModal from "@/components/admin/EditStudentModal"
import ImportStudentsModal from "@/components/admin/ImportStudentsModal"
import { adminClickableRowProps } from "@/components/admin/admin-list-row"
import {
  deleteStudent,
  getStudentDeleteImpactAction,
  hardDeleteStudent,
} from "@/lib/admin/student-list-actions"
import type { DeleteImpact } from "@/lib/admin/dependent-checks"
import {
  buildClassDimensionFilterGroups,
  matchesActiveFilters,
  matchesClassDimensionFilters,
  withoutClassDimensionFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import {
  PROGRESS_STATUS_FILTER_OPTIONS,
  PROGRESS_STATUS_LABELS,
  type StudentProgressStatus,
} from "@/lib/admin/student-progress"
import type {
  AdminCurrentUser,
  StudentEnrollmentLookups,
  StudentListMeta,
  StudentListQuery,
  StudentListRow,
  StudentListSectionOption,
  StudentListSortKey,
  StudentListSummary,
} from "@/lib/admin/student-list"
import {
  STUDENT_LIST_ALL_SECTIONS,
  STUDENT_LIST_PAGE_SIZE,
  filterStudentListRows,
  paginateStudentListRows,
} from "@/lib/admin/student-list"
import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const STATUS_BADGE: Record<
  StudentProgressStatus,
  { bg: string; color: string }
> = {
  on_track: { bg: COLORS.greenBgLight, color: COLORS.green },
  in_progress: { bg: COLORS.amberBgLight, color: COLORS.amber },
  at_risk: { bg: COLORS.maroonDarkBgLight, color: COLORS.maroonDark },
}

function progressBarColor(pct: number): string {
  if (pct >= 81) return COLORS.green
  if (pct >= 51) return COLORS.amber
  return COLORS.maroon
}

function StudentProgressBar({
  pct,
  wide = false,
}: {
  pct: number
  wide?: boolean
}) {
  const clamped = Math.min(100, Math.max(0, pct))

  return (
    <div
      style={{
        minWidth: wide ? 240 : 72,
        maxWidth: wide ? "100%" : 120,
        width: wide ? "100%" : undefined,
        margin: wide ? 0 : "0 auto",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: COLORS.textDark,
          marginBottom: 4,
        }}
      >
        {clamped}%
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 6,
          background: COLORS.track,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clamped}%`,
            background: progressBarColor(clamped),
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  )
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function initialFiltersFromQuery(query: StudentListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.progressStatus !== "all") {
    filters.progressStatus = [query.progressStatus]
  }
  return filters
}

export default function StudentListClient({
  students,
  sections,
  lookups,
  summary,
  meta,
  currentUser,
  query,
}: {
  students: StudentListRow[]
  sections: StudentListSectionOption[]
  lookups: StudentEnrollmentLookups
  summary: StudentListSummary
  meta: StudentListMeta
  currentUser: CurrentUser
  query: StudentListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addChoiceOpen, setAddChoiceOpen] = useState(false)
  const [addManualOpen, setAddManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [detailStudent, setDetailStudent] = useState<StudentListRow | null>(null)
  const [editStudent, setEditStudent] = useState<StudentListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)
  const [pageSize, setPageSize] = useState(STUDENT_LIST_PAGE_SIZE)

  // Dropped-view hard delete (two-step lifecycle: drop, then delete).
  const [hardDeleteTarget, setHardDeleteTarget] = useState<StudentListRow | null>(null)
  const [hardDeleteImpact, setHardDeleteImpact] = useState<DeleteImpact | null>(null)
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null)
  const [isHardDeleting, startHardDeleteTransition] = useTransition()

  const isDroppedView = query.view === "dropped"

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
        field: "progressStatus",
        singleSelect: true,
        options: PROGRESS_STATUS_FILTER_OPTIONS.filter((o) => o.value !== "all").map(
          (o) => ({ value: o.value, label: o.label })
        ),
      },
      ...buildClassDimensionFilterGroups(sections),
    ],
    [sections]
  )

  const searchFiltered = useMemo(
    () =>
      filterStudentListRows(students, {
        ...query,
        search: searchInput,
        sectionId: STUDENT_LIST_ALL_SECTIONS,
        progressStatus: "all",
      }),
    [students, query, searchInput]
  )

  const visibleStudents = useMemo(
    () =>
      searchFiltered.filter(
        (student) =>
          matchesActiveFilters(
            { progressStatus: student.progressStatus },
            withoutClassDimensionFilters(activeFilters)
          ) &&
          matchesClassDimensionFilters(
            {
              courseCode: student.courseCode,
              adviserUserId: student.adviserUserId,
              schoolYear: student.schoolYear,
            },
            activeFilters
          )
      ),
    [searchFiltered, activeFilters]
  )

  const {
    rows: pageStudents,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateStudentListRows(visibleStudents, query.page, pageSize),
    [visibleStudents, query.page, pageSize]
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

  function setStatusFilter(status: StudentProgressStatus | null) {
    setActiveFilters((prev) => {
      if (!status) {
        const { progressStatus: _, ...rest } = prev
        return rest
      }
      return { ...prev, progressStatus: [status] }
    })
    pushParams({ status: status, page: "1" })
  }

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
      setDetailStudent(null)
      window.location.reload()
    })
  }

  function openHardDeleteConfirm(student: StudentListRow) {
    setHardDeleteError(null)
    setHardDeleteImpact(null)
    setHardDeleteTarget(student)
    getStudentDeleteImpactAction(student.enrollmentId).then((res) => {
      if (res.ok) {
        setHardDeleteImpact(res.impact)
      } else {
        setHardDeleteImpact({
          state: "blocked",
          lifecycleBlocked: res.error,
          blockers: [],
          cascades: [],
          notes: [],
        })
      }
    })
  }

  function closeHardDeleteConfirm() {
    if (isHardDeleting) return
    setHardDeleteTarget(null)
    setHardDeleteImpact(null)
    setHardDeleteError(null)
  }

  function confirmHardDelete() {
    if (!hardDeleteTarget) return
    setHardDeleteError(null)
    startHardDeleteTransition(async () => {
      const result = await hardDeleteStudent(hardDeleteTarget.enrollmentId)
      if (!result.ok) {
        setHardDeleteError(result.error)
        return
      }
      setHardDeleteTarget(null)
      window.location.reload()
    })
  }

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-users",
      label: "Total Students",
      value: summary.total,
      note: "active enrollments",
      onClick: () => setStatusFilter(null),
      isActive: !activeFilters.progressStatus?.length,
    },
    {
      icon: "ti-circle-check",
      label: "On Track",
      value: summary.onTrack,
      badge: {
        text: pctOfTotal(summary.onTrack),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all students",
      onClick: () => setStatusFilter("on_track"),
      isActive: activeFilters.progressStatus?.includes("on_track") ?? false,
    },
    {
      icon: "ti-clock",
      label: "In Progress",
      value: summary.inProgress,
      badge: {
        text: pctOfTotal(summary.inProgress),
        bg: COLORS.amberBgLight,
        color: COLORS.amber,
      },
      note: "of all students",
      onClick: () => setStatusFilter("in_progress"),
      isActive: activeFilters.progressStatus?.includes("in_progress") ?? false,
    },
    {
      icon: "ti-alert-triangle",
      label: "At Risk",
      value: summary.atRisk,
      badge: {
        text: pctOfTotal(summary.atRisk),
        bg: COLORS.maroonDarkBgLight,
        color: COLORS.maroonDark,
      },
      note: "of all students",
      onClick: () => setStatusFilter("at_risk"),
      isActive: activeFilters.progressStatus?.includes("at_risk") ?? false,
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
            {isDroppedView ? "Dropped Students" : "Student List"}
          </h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <AdminProfilePill user={currentUser} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["active", "dropped"] as const).map((v) => {
          const active = (query.view ?? "active") === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => pushParams({ view: v === "active" ? null : v, page: "1" })}
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
              {v === "active" ? "Active" : "Dropped"}
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
          title={isDroppedView ? "Dropped Students" : "All Students"}
          count={`${filteredCount} student${filteredCount !== 1 ? "s" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search students"
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
          actions={
            <AdminAddButton label="Add student" onClick={() => setAddChoiceOpen(true)} />
          }
        />

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ width: "24%" }}>
                  <AdminSortHeader
                    label="Student Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ width: "12%" }}>Student ID</th>
                <th style={{ width: "15%" }}>
                  <AdminSortHeader
                    label="Class"
                    sortable
                    sortActive={query.sort === "section"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("section")}
                  />
                </th>
                <th style={{ width: "17%" }}>
                  <AdminSortHeader
                    label="Adviser"
                    sortable
                    sortActive={query.sort === "adviser"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("adviser")}
                  />
                </th>
                <th style={{ width: "10%", textAlign: "center" }}>Hours</th>
                <th style={{ width: "14%", textAlign: "center" }}>
                  <AdminSortHeader label="Progress" align="center" />
                </th>
                <th style={{ width: "12%", textAlign: "center" }}>
                  <AdminSortHeader label="Status" align="center" />
                </th>
              </tr>
            </thead>
            <tbody key={animKey}>
              {pageStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">
                    No students match your filters.
                  </td>
                </tr>
              ) : (
                pageStudents.map((student) => {
                  const badge = STATUS_BADGE[student.progressStatus]
                  return (
                    <tr
                      key={student.enrollmentId}
                      {...adminClickableRowProps(() => setDetailStudent(student))}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                          {student.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                          {student.email}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {student.studentNumber ?? "—"}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {student.classLabel}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {student.adviserName}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ color: COLORS.textDark }}>
                          {student.hoursCompleted}/{student.hoursRequired}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <StudentProgressBar pct={student.completionPct} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {PROGRESS_STATUS_LABELS[student.progressStatus]}
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
          totalCount={filteredCount}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <AddChoiceModal
        open={addChoiceOpen}
        onClose={() => setAddChoiceOpen(false)}
        title="Add Student"
        entityLabel="student"
        onAddManually={() => setAddManualOpen(true)}
        onImport={() => setImportOpen(true)}
      />
      <AddStudentModal
        open={addManualOpen}
        sections={sections}
        lookups={lookups}
        onClose={() => setAddManualOpen(false)}
      />
      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} />

      {detailStudent && (
        <NstpModal
          open
          onClose={() => setDetailStudent(null)}
          title={detailStudent.fullName}
          subtitle={detailStudent.email}
          initials={initialsFromName(detailStudent.fullName)}
          avatarUrl={detailStudent.avatarUrl}
          size="md"
          actions={
            isDroppedView
              ? [
                  {
                    label: "Delete Permanently",
                    variant: "danger",
                    disabled: isHardDeleting,
                    onClick: () => {
                      openHardDeleteConfirm(detailStudent)
                      setDetailStudent(null)
                    },
                  },
                ]
              : [
                  {
                    label: "Edit",
                    variant: "primary",
                    onClick: () => {
                      setEditStudent(detailStudent)
                      setDetailStudent(null)
                    },
                  },
                  {
                    label: "Remove",
                    variant: "danger",
                    disabled: isDeleting && deletingId === detailStudent.enrollmentId,
                    onClick: () => {
                      openDeleteConfirm(detailStudent.enrollmentId, detailStudent.fullName)
                      setDetailStudent(null)
                    },
                  },
                ]
          }
        >
          <ModalRow>
            <ModalField label="Student ID" value={detailStudent.studentNumber ?? "—"} />
            <ModalField label="Class" value={detailStudent.classLabel} />
          </ModalRow>
          <ModalRow>
            <ModalField label="Adviser" value={detailStudent.adviserName} />
            <ModalField
              label="Hours"
              value={`${detailStudent.hoursCompleted}/${detailStudent.hoursRequired}`}
            />
          </ModalRow>
          <ModalRow>
            <ModalField label="Progress">
              <StudentProgressBar pct={detailStudent.completionPct} wide />
            </ModalField>
          </ModalRow>
          <ModalRow>
            <ModalField label="Status">
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: STATUS_BADGE[detailStudent.progressStatus].bg,
                  color: STATUS_BADGE[detailStudent.progressStatus].color,
                }}
              >
                {PROGRESS_STATUS_LABELS[detailStudent.progressStatus]}
              </span>
            </ModalField>
          </ModalRow>
        </NstpModal>
      )}

      <EditStudentModal
        open={editStudent !== null}
        student={editStudent}
        sections={sections}
        lookups={lookups}
        onClose={() => setEditStudent(null)}
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove from Class"
        subjectName={deleteTarget?.name}
        message="The student will be marked as dropped. Attendance history is kept and the student can be re-enrolled later. Dropped students appear in the Dropped view."
        confirmLabel="Remove"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />

      <DeleteImpactModal
        open={hardDeleteTarget !== null}
        title="Delete Student"
        subjectName={hardDeleteTarget?.fullName}
        impact={hardDeleteImpact}
        requireTypedConfirm
        confirmLabel="Delete Permanently"
        isPending={isHardDeleting}
        error={hardDeleteError}
        onClose={closeHardDeleteConfirm}
        onConfirm={confirmHardDelete}
      />
    </>
  )
}