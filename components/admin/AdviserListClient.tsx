"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import DeleteImpactModal from "@/components/admin/DeleteImpactModal"
import ReassignClassModal from "@/components/admin/ReassignClassModal"
import { NstpModal, ModalField, ModalRow } from "@/components/shared/Modal"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AddChoiceModal from "@/components/admin/AddChoiceModal"
import AddAdviserModal from "@/components/admin/AddAdviserModal"
import EditAdviserModal from "@/components/admin/EditAdviserModal"
import ImportAdvisersModal from "@/components/admin/ImportAdvisersModal"
import { adminClickableCardProps } from "@/components/admin/admin-list-row"
import { AdviserAvatar } from "@/components/admin/AdviserAvatar"
import {
  deleteAdviser,
  getAdviserDeleteImpactAction,
  getClassReassignmentDataAction,
  hardDeleteAdviser,
} from "@/lib/admin/adviser-list-actions"
import {
  ADVISER_LIST_ALL_SECTIONS,
  ADVISER_LIST_PAGE_SIZE,
  filterAdviserListRows,
  paginateAdviserListRows,
  type AdminCurrentUser,
  type AdviserListMeta,
  type AdviserListQuery,
  type AdviserListRow,
  type AdviserListSectionOption,
  type AdviserListStatusFilter,
  type AdviserListSummary,
  type AdviserProfileLookups,
} from "@/lib/admin/adviser-list"
import type { ClassReassignmentData } from "@/lib/admin/class-reassign"
import type { DependentItem, DeleteImpact } from "@/lib/admin/dependent-checks"
import {
  buildClassDimensionFilterGroups,
  matchesClassDimensionFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import { FONT_BODY, PAGE_TITLE, PROFILE_PILL, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const ADVISER_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: Exclude<AdviserListStatusFilter, "all">
  label: string
}> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending requests" },
]

function adviserMatchesFilters(
  adviser: AdviserListRow,
  activeFilters: ActiveFilters,
  sections: AdviserListSectionOption[]
): boolean {
  const statusFilters = activeFilters.status
  if (statusFilters?.length) {
    const matchesStatus = statusFilters.some((status) => {
      if (status === "active") return adviser.isActive
      if (status === "inactive") return !adviser.isActive
      if (status === "pending") return adviser.pendingRequestCount > 0
      return false
    })
    if (!matchesStatus) return false
  }

  const hasClassDims =
    (activeFilters.nstpType?.length ?? 0) > 0 ||
    (activeFilters.schoolYear?.length ?? 0) > 0
  if (hasClassDims) {
    const adviserSections = sections.filter((section) =>
      adviser.sectionIds.includes(section.sectionId)
    )
    if (adviserSections.length === 0) return false
    const matchesClass = adviserSections.some((section) =>
      matchesClassDimensionFilters(
        {
          courseCode: section.courseCode,
          schoolYear: section.schoolYear,
        },
        {
          ...(activeFilters.nstpType ? { nstpType: activeFilters.nstpType } : {}),
          ...(activeFilters.schoolYear
            ? { schoolYear: activeFilters.schoolYear }
            : {}),
        }
      )
    )
    if (!matchesClass) return false
  }

  return true
}

function initialFiltersFromQuery(query: AdviserListQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.status !== "all") {
    filters.status = [query.status]
  }
  return filters
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

function progressBarColor(pct: number): string {
  if (pct >= 81) return COLORS.green
  if (pct >= 51) return COLORS.amber
  return COLORS.maroon
}

function AvgCompletionBar({ pct, wide = false }: { pct: number; wide?: boolean }) {
  const clamped = Math.min(100, Math.max(0, pct))

  return (
    <div style={{ width: "100%", minWidth: wide ? 240 : undefined }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 6,
        }}
      >
        {!wide && (
          <span style={{ ...TYPE.body, color: COLORS.textGray }}>Avg Completion</span>
        )}
        <span
          style={{
            ...TYPE.body,
            color: COLORS.textDark,
            marginLeft: wide ? 0 : "auto",
          }}
        >
          {clamped}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Average completion ${clamped}%`}
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

function AdviserCard({
  adviser,
  photoUrl,
  onSelect,
}: {
  adviser: AdviserListRow
  photoUrl: string | null
  onSelect: (adviser: AdviserListRow) => void
}) {
  const sectionsLabel =
    adviser.sectionNames.length > 0 ? adviser.sectionNames.join(", ") : "—"

  return (
    <article
      {...adminClickableCardProps(() => onSelect(adviser))}
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        boxShadow: COLORS.cardShadow,
        padding: "18px 20px 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: 280,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 16, paddingTop: 8 }}>
        <div style={{ margin: "0 auto 12px", width: 64, height: 64 }}>
          <AdviserAvatar
            fullName={adviser.fullName}
            initials={adviser.initials}
            photoUrl={photoUrl}
            size={64}
          />
        </div>
        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>{adviser.fullName}</div>
        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 4 }}>
          {adviser.email}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          paddingTop: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flex: 1,
        }}
      >
        <StatRow label="Section/s" value={sectionsLabel} />
        <StatRow label="Students" value={String(adviser.studentCount)} />
        <AvgCompletionBar pct={adviser.avgCompletionPct} />
        <StatRow label="Pending Requests" value={String(adviser.pendingRequestCount)} />
      </div>
    </article>
  )
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <span style={{ ...TYPE.body, color: COLORS.textGray }}>{label}</span>
      <span style={{ ...TYPE.body, color: COLORS.textDark, textAlign: "right" }}>
        {value}
      </span>
    </div>
  )
}

export default function AdviserListClient({
  advisers,
  sections,
  lookups,
  summary,
  meta,
  currentUser,
  query,
}: {
  advisers: AdviserListRow[]
  sections: AdviserListSectionOption[]
  lookups: AdviserProfileLookups
  summary: AdviserListSummary
  meta: AdviserListMeta
  currentUser: AdminCurrentUser
  query: AdviserListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [addChoiceOpen, setAddChoiceOpen] = useState(false)
  const [addManualOpen, setAddManualOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editAdviser, setEditAdviser] = useState<AdviserListRow | null>(null)
  const [detailAdviser, setDetailAdviser] = useState<AdviserListRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    sectionCount: number
  } | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [animKey, setAnimKey] = useState(0)
  const pageSize = ADVISER_LIST_PAGE_SIZE

  // Class reassignment (offered after deactivation, or from the hard-delete
  // blocker list). `reassignSource` decides what "Skip"/success should do.
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignData, setReassignData] = useState<ClassReassignmentData | null>(null)
  const [reassignSource, setReassignSource] = useState<"deactivate" | "blocker" | null>(null)

  // Hard delete (only ever available for an already-inactive facilitator).
  const [hardDeleteTarget, setHardDeleteTarget] = useState<AdviserListRow | null>(null)
  const [hardDeleteImpact, setHardDeleteImpact] = useState<DeleteImpact | null>(null)
  const [hardDeleteError, setHardDeleteError] = useState<string | null>(null)
  const [isHardDeleting, startHardDeleteTransition] = useTransition()

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === ADVISER_LIST_ALL_SECTIONS) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/advisers?${params.toString()}`)
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
        field: "status",
        singleSelect: true,
        options: ADVISER_STATUS_FILTER_OPTIONS.map((o) => ({
          value: o.value,
          label: o.label,
        })),
      },
      ...buildClassDimensionFilterGroups(sections, { includeAdviser: false }),
    ],
    [sections]
  )

  const searchFiltered = useMemo(
    () =>
      filterAdviserListRows(advisers, {
        ...query,
        search: searchInput,
        status: "all",
      }),
    [advisers, query, searchInput]
  )

  const filteredAdvisers = useMemo(
    () =>
      searchFiltered.filter((adviser) =>
        adviserMatchesFilters(adviser, activeFilters, sections)
      ),
    [searchFiltered, activeFilters, sections]
  )

  const { rows: pageAdvisers, totalPages, totalCount } = useMemo(
    () => paginateAdviserListRows(filteredAdvisers, query.page, pageSize),
    [filteredAdvisers, query.page, pageSize]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, activeFilters, pageSize])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  function setStatusFilter(status: AdviserListStatusFilter | null) {
    setActiveFilters((prev) => {
      if (!status || status === "all") {
        const { status: _, ...rest } = prev
        return rest
      }
      return { ...prev, status: [status] }
    })
    pushParams({ status: status === "all" ? null : status, page: "1" })
  }

  function openDeleteConfirm(adviser: AdviserListRow) {
    setDeleteError(null)
    setDeleteTarget({
      id: adviser.adviserUserId,
      name: adviser.fullName,
      sectionCount: adviser.sectionNames.length,
    })
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
      const result = await deleteAdviser(deleteTarget.id)
      setDeletingId(null)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      if (deleteTarget.sectionCount > 0) {
        const res = await getClassReassignmentDataAction(deleteTarget.id)
        if (res.ok && res.data.classes.length > 0) {
          setDeleteTarget(null)
          setReassignData(res.data)
          setReassignSource("deactivate")
          setReassignOpen(true)
          return // no reload — the reassign modal's Skip/Done reloads instead
        }
      }
      setDeleteTarget(null)
      window.location.reload()
    })
  }

  function closeReassignModal() {
    setReassignOpen(false)
    if (reassignSource === "deactivate") {
      window.location.reload()
      return
    }
    // Opened from the hard-delete blocker list — just return to that modal.
    setReassignSource(null)
    setReassignData(null)
  }

  function handleReassigned() {
    setReassignOpen(false)
    if (reassignSource === "blocker" && hardDeleteTarget) {
      setReassignSource(null)
      setReassignData(null)
      // Re-check the impact in place so the admin can continue to delete
      // without losing their spot.
      getAdviserDeleteImpactAction(hardDeleteTarget.adviserUserId).then((res) => {
        if (res.ok) setHardDeleteImpact(res.impact)
      })
      return
    }
    window.location.reload()
  }

  function openHardDeleteConfirm(adviser: AdviserListRow) {
    setHardDeleteError(null)
    setHardDeleteImpact(null)
    setHardDeleteTarget(adviser)
    getAdviserDeleteImpactAction(adviser.adviserUserId).then((res) => {
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
      const result = await hardDeleteAdviser(hardDeleteTarget.adviserUserId)
      if (!result.ok) {
        setHardDeleteError(result.error)
        return
      }
      setHardDeleteTarget(null)
      window.location.reload()
    })
  }

  function openReassignFromBlocker() {
    if (!hardDeleteTarget) return
    getClassReassignmentDataAction(hardDeleteTarget.adviserUserId).then((res) => {
      if (res.ok && res.data.classes.length > 0) {
        setReassignData(res.data)
        setReassignSource("blocker")
        setReassignOpen(true)
      }
    })
  }

  function renderAdviserBlockerAction(item: DependentItem) {
    if (item.key !== "sections") return null
    return (
      <button
        type="button"
        onClick={openReassignFromBlocker}
        style={{
          ...TYPE.bodyBold,
          color: COLORS.green,
          background: "none",
          border: `1px solid ${COLORS.green}`,
          borderRadius: 999,
          padding: "6px 14px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Reassign…
      </button>
    )
  }

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-user-cog",
      label: "Total Facilitators",
      value: summary.total,
      note: "registered accounts",
      onClick: () => setStatusFilter(null),
      isActive: !activeFilters.status?.length,
    },
    {
      icon: "ti-circle-check",
      label: "Active Facilitators",
      value: summary.active,
      badge: {
        text: pctOfTotal(summary.active),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all facilitators",
      onClick: () => setStatusFilter("active"),
      isActive: activeFilters.status?.includes("active") ?? false,
    },
    {
      icon: "ti-circle-x",
      label: "Inactive Advisers",
      value: summary.inactive,
      badge: {
        text: pctOfTotal(summary.inactive),
        bg: COLORS.maroonBgLight,
        color: COLORS.maroon,
      },
      note: "of all facilitators",
      onClick: () => setStatusFilter("inactive"),
      isActive: activeFilters.status?.includes("inactive") ?? false,
    },
    {
      icon: "ti-pencil",
      label: "Pending Requests",
      value: summary.pendingRequests,
      badge:
        summary.pendingRequests > 0
          ? {
              text: "needs review",
              bg: COLORS.maroonBgLight,
              color: COLORS.maroon,
            }
          : undefined,
      note: "open appeals",
      onClick: () => setStatusFilter("pending"),
      isActive: activeFilters.status?.includes("pending") ?? false,
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Facilitator List</h1>
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
          title="All Facilitators"
          count={`${totalCount} facilitator${totalCount !== 1 ? "s" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search facilitators"
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
            <AdminAddButton label="Add facilitator" onClick={() => setAddChoiceOpen(true)} />
          }
        />

        <div
          className="admin-list-card-scroll"
          style={{ padding: "16px 20px", overflowY: "visible", maxHeight: "none" }}
        >
          {pageAdvisers.length === 0 ? (
            <div className="admin-table-empty">No facilitators match your filters.</div>
          ) : (
            <div
              key={animKey}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 20,
              }}
            >
              {pageAdvisers.map((adviser) => (
                <AdviserCard
                  key={adviser.adviserUserId}
                  adviser={adviser}
                  photoUrl={adviser.photoUrl}
                  onSelect={setDetailAdviser}
                />
              ))}
            </div>
          )}
        </div>

        <ListPagination
          page={query.page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={goToPage}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <AddChoiceModal
        open={addChoiceOpen}
        onClose={() => setAddChoiceOpen(false)}
        title="Add Facilitator"
        entityLabel="facilitator"
        onAddManually={() => setAddManualOpen(true)}
        onImport={() => setImportOpen(true)}
      />
      <AddAdviserModal
        open={addManualOpen}
        lookups={lookups}
        onClose={() => setAddManualOpen(false)}
      />
      <ImportAdvisersModal open={importOpen} onClose={() => setImportOpen(false)} />

      {detailAdviser && (
        <NstpModal
          open
          onClose={() => setDetailAdviser(null)}
          title={detailAdviser.fullName}
          subtitle={detailAdviser.email}
          initials={detailAdviser.initials}
          avatarUrl={detailAdviser.photoUrl}
          size="md"
          actions={[
            {
              label: "Edit",
              variant: "primary",
              onClick: () => {
                setEditAdviser(detailAdviser)
                setDetailAdviser(null)
              },
            },
            detailAdviser.isActive
              ? {
                  label: "Deactivate",
                  variant: "danger",
                  disabled: isDeleting && deletingId === detailAdviser.adviserUserId,
                  onClick: () => {
                    openDeleteConfirm(detailAdviser)
                    setDetailAdviser(null)
                  },
                }
              : {
                  label: "Delete Permanently",
                  variant: "danger",
                  disabled: isHardDeleting,
                  onClick: () => {
                    openHardDeleteConfirm(detailAdviser)
                    setDetailAdviser(null)
                  },
                },
          ]}
        >
          <ModalRow>
            <ModalField
              label="Sections"
              value={
                detailAdviser.sectionNames.length > 0
                  ? detailAdviser.sectionNames.join(", ")
                  : "—"
              }
            />
            <ModalField label="Students" value={String(detailAdviser.studentCount)} />
          </ModalRow>
          <ModalRow>
            <ModalField label="Avg Completion">
              <AvgCompletionBar pct={detailAdviser.avgCompletionPct} wide />
            </ModalField>
          </ModalRow>
          <ModalRow>
            <ModalField
              label="Pending Requests"
              value={String(detailAdviser.pendingRequestCount)}
            />
            <ModalField label="Status" value={detailAdviser.isActive ? "Active" : "Inactive"} />
          </ModalRow>
          <ModalRow>
            <ModalField label="College" value={detailAdviser.collegeName ?? "—"} />
            <ModalField label="NSTP Component" value={detailAdviser.nstpComponentName ?? "—"} />
          </ModalRow>
          <ModalRow>
            <ModalField label="Partnership Type" value={detailAdviser.partnershipType ?? "—"} />
          </ModalRow>
        </NstpModal>
      )}

      <EditAdviserModal
        open={editAdviser !== null}
        adviser={editAdviser}
        lookups={lookups}
        onClose={() => setEditAdviser(null)}
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Deactivate Facilitator"
        subjectName={deleteTarget?.name}
        message={
          deleteTarget && deleteTarget.sectionCount > 0
            ? `This facilitator still advises ${deleteTarget.sectionCount} section${deleteTarget.sectionCount !== 1 ? "s" : ""}. The account will be deactivated and can no longer sign in; you can move their class to another facilitator in the next step.`
            : "The account will be deactivated and can no longer sign in. History is kept."
        }
        confirmLabel="Deactivate"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />

      <ReassignClassModal
        open={reassignOpen}
        sourceClass={reassignData?.classes[0] ?? null}
        candidates={reassignData?.candidates ?? []}
        onClose={closeReassignModal}
        onReassigned={handleReassigned}
      />

      <DeleteImpactModal
        open={hardDeleteTarget !== null}
        title="Delete Facilitator"
        subjectName={hardDeleteTarget?.fullName}
        impact={hardDeleteImpact}
        requireTypedConfirm
        confirmLabel="Delete Permanently"
        isPending={isHardDeleting}
        error={hardDeleteError}
        onClose={closeHardDeleteConfirm}
        onConfirm={confirmHardDelete}
        renderBlockerAction={renderAdviserBlockerAction}
      />
    </>
  )
}