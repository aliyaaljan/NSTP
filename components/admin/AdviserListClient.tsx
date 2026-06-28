"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChartStyles } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import AddChoiceModal from "@/components/admin/AddChoiceModal"
import AddAdviserModal from "@/components/admin/AddAdviserModal"
import EditAdviserModal from "@/components/admin/EditAdviserModal"
import ImportAdvisersModal from "@/components/admin/ImportAdvisersModal"
import { deleteAdviser } from "@/lib/admin/adviser-list-actions"
import {
  ADVISER_LIST_ALL_SECTIONS,
  ADVISER_LIST_PAGE_SIZE,
  filterAdviserListRowsBySection,
  paginateAdviserListRows,
  type AdminCurrentUser,
  type AdviserListMeta,
  type AdviserListQuery,
  type AdviserListRow,
  type AdviserListSectionOption,
  type AdviserListSummary,
} from "@/lib/admin/adviser-list"
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
        fontFamily: FONT_BODY,
        fontSize: "12.5px",
        fontWeight: 600,
        color: "#fff",
        background: COLORS.green,
        borderRadius: 20,
        padding: "5px 13px",
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

function StatCard({
  icon,
  label,
  value,
  valueSuffix,
  valueColor,
  badge,
  note,
}: {
  icon: string
  label: string
  value: string | number
  valueSuffix?: string
  valueColor?: string
  badge?: { text: string; bg: string; color: string }
  note: string
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        padding: "12px 14px",
        boxShadow: COLORS.cardShadow,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: COLORS.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className={`ti ${icon}`} style={{ fontSize: 17, color: COLORS.maroon }} />
          </div>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: "11.5px",
              fontWeight: 600,
              color: COLORS.textGray,
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {badge && (
            <span
              style={{
                ...TYPE.bodyBold,
                color: badge.color,
                background: badge.bg,
                borderRadius: 12,
                padding: "2px 8px",
              }}
            >
              {badge.text}
            </span>
          )}
          <span style={{ ...TYPE.caption, color: COLORS.textGray }}>{note}</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: "34px",
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: valueColor ?? COLORS.textDark,
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          flexShrink: 0,
          marginLeft: "auto",
          marginRight: 16,
        }}
      >
        {value}
        {valueSuffix && (
          <span style={{ fontSize: "15px", fontWeight: 600, color: COLORS.textGray }}>
            {valueSuffix}
          </span>
        )}
      </div>
    </div>
  )
}

function AdviserCard({
  adviser,
  onEdit,
  onDelete,
  isDeleting,
}: {
  adviser: AdviserListRow
  onEdit: (adviser: AdviserListRow) => void
  onDelete: (adviser: AdviserListRow) => void
  isDeleting: boolean
}) {
  const sectionsLabel =
    adviser.sectionNames.length > 0 ? adviser.sectionNames.join(", ") : "—"

  return (
    <article
      className="anim-list-item"
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        boxShadow: COLORS.cardShadow,
        padding: "18px 20px 16px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: 280,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label={`Edit ${adviser.fullName}`}
          title="Edit adviser"
          onClick={() => onEdit(adviser)}
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
          aria-label={`Delete ${adviser.fullName}`}
          title="Delete adviser"
          disabled={isDeleting}
          onClick={() => onDelete(adviser)}
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

      <div style={{ textAlign: "center", marginBottom: 16, paddingTop: 8 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: COLORS.maroon,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            ...TYPE.bodyBold,
            fontSize: "14px",
          }}
        >
          {adviser.initials}
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
        <StatRow
          label="Avg Completion"
          value={
            <span
              style={{
                ...TYPE.bodyBold,
                display: "inline-block",
                padding: "3px 12px",
                borderRadius: 999,
                background: COLORS.greenBgLight,
                color: COLORS.green,
              }}
            >
              {adviser.avgCompletionPct}%
            </span>
          }
        />
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
      <span style={{ ...TYPE.bodyBold, color: COLORS.textDark, textAlign: "right" }}>
        {value}
      </span>
    </div>
  )
}

export default function AdviserListClient({
  advisers,
  sections,
  summary,
  meta,
  currentUser,
  query,
}: {
  advisers: AdviserListRow[]
  sections: AdviserListSectionOption[]
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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
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

  const filteredAdvisers = useMemo(
    () =>
      filterAdviserListRowsBySection(
        advisers,
        { ...query, search: searchInput },
        sections
      ),
    [advisers, query, searchInput, sections]
  )

  const { rows: pageAdvisers, totalPages, totalCount } = useMemo(
    () => paginateAdviserListRows(filteredAdvisers, query.page, ADVISER_LIST_PAGE_SIZE),
    [filteredAdvisers, query.page]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.sectionId])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  const sectionLabel =
    query.sectionId !== ADVISER_LIST_ALL_SECTIONS
      ? `Section ${sections.find((s) => s.sectionId === query.sectionId)?.name ?? ""}`
      : "All Sections"

  function openDeleteConfirm(adviser: AdviserListRow) {
    setDeleteError(null)
    setDeleteTarget({ id: adviser.adviserUserId, name: adviser.fullName })
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
      setDeleteTarget(null)
      window.location.reload()
    })
  }

  const pctOfTotal = (count: number) =>
    summary.total > 0 ? `${Math.round((count / summary.total) * 100)}%` : "0%"

  const statCards: Array<React.ComponentProps<typeof StatCard>> = [
    {
      icon: "ti-user-cog",
      label: "Total Advisers",
      value: summary.total,
      note: "registered accounts",
    },
    {
      icon: "ti-circle-check",
      label: "Active Advisers",
      value: summary.active,
      valueColor: COLORS.green,
      badge: {
        text: pctOfTotal(summary.active),
        bg: COLORS.greenBgLight,
        color: COLORS.green,
      },
      note: "of all advisers",
    },
    {
      icon: "ti-users",
      label: "Students Supervised",
      value: summary.studentsSupervised,
      note: "across all sections",
    },
    {
      icon: "ti-pencil",
      label: "Pending Requests",
      value: summary.pendingRequests,
      valueColor: summary.pendingRequests > 0 ? COLORS.maroon : COLORS.textDark,
      badge:
        summary.pendingRequests > 0
          ? {
              text: "needs review",
              bg: COLORS.maroonBgLight,
              color: COLORS.maroon,
            }
          : undefined,
      note: "open appeals",
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Adviser List</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {totalCount} total advisers
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
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
            placeholder="Search advisers"
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
            label={sectionLabel}
            value={query.sectionId}
            onChange={(value) =>
              pushParams({
                sectionId: value === ADVISER_LIST_ALL_SECTIONS ? null : value,
                page: "1",
              })
            }
          >
            <option value={ADVISER_LIST_ALL_SECTIONS}>All Sections</option>
            {sections.map((section) => (
              <option key={section.sectionId} value={section.sectionId}>
                Section {section.name}
              </option>
            ))}
          </FilterDropdown>
        </div>

        <button
          type="button"
          onClick={() => setAddChoiceOpen(true)}
          aria-label="Add adviser"
          title="Add adviser"
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

      {pageAdvisers.length === 0 ? (
        <div
          style={{
            ...TYPE.body,
            color: COLORS.textGray,
            textAlign: "center",
            padding: "60px 20px",
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: COLORS.radius,
          }}
        >
          No advisers match your filters.
        </div>
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
              onEdit={setEditAdviser}
              onDelete={openDeleteConfirm}
              isDeleting={isDeleting && deletingId === adviser.adviserUserId}
            />
          ))}
        </div>
      )}

      <ListPagination
        page={query.page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={ADVISER_LIST_PAGE_SIZE}
        onPageChange={goToPage}
      />

      <AddChoiceModal
        open={addChoiceOpen}
        onClose={() => setAddChoiceOpen(false)}
        title="Add Adviser"
        entityLabel="adviser"
        onAddManually={() => setAddManualOpen(true)}
        onImport={() => setImportOpen(true)}
      />
      <AddAdviserModal
        open={addManualOpen}
        onClose={() => setAddManualOpen(false)}
      />
      <ImportAdvisersModal open={importOpen} onClose={() => setImportOpen(false)} />
      <EditAdviserModal
        open={editAdviser !== null}
        adviser={editAdviser}
        onClose={() => setEditAdviser(null)}
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Remove Adviser"
        subjectName={deleteTarget?.name}
        message="Remove this adviser? This action cannot be undone."
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}
