"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
} from "@/lib/admin/adviser-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  maroon: "#7B1113",
  cardBg: "#F5F4F1",
  cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
  border: "#E4E4E1",
  green: "#2D6A4F",
  greenBgLight: "#DFEEE6",
}

function ProfilePill({ user }: { user: AdminCurrentUser }) {
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

function AdviserCard({
  adviser,
  onEdit,
  onDelete,
  isDeleting,
}: {
  adviser: AdviserListRow
  onEdit: (adviser: AdviserListRow) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const sectionsLabel =
    adviser.sectionNames.length > 0 ? adviser.sectionNames.join(", ") : "—"

  return (
    <article
      style={{
        background: COLORS.cardBg,
        borderRadius: 16,
        boxShadow: COLORS.cardShadow,
        padding: "20px 22px 18px",
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
          onClick={() => onDelete(adviser.adviserUserId)}
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
            fontSize: "14pt",
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

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 28,
      }}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        style={paginationBtnStyle(page <= 1)}
      >
        <i className="ti ti-chevron-left" style={{ fontSize: 16 }} />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <button
          key={pageNum}
          type="button"
          onClick={() => onPageChange(pageNum)}
          aria-label={`Page ${pageNum}`}
          aria-current={pageNum === page ? "page" : undefined}
          style={{
            ...paginationBtnStyle(false),
            minWidth: 36,
            background: pageNum === page ? COLORS.maroon : "#fff",
            color: pageNum === page ? "#fff" : COLORS.maroon,
          }}
        >
          {pageNum}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        style={paginationBtnStyle(page >= totalPages)}
      >
        <i className="ti ti-chevron-right" style={{ fontSize: 16 }} />
      </button>
    </div>
  )
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    ...TYPE.bodyBold,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    border: `1.5px solid ${COLORS.maroon}`,
    background: "#fff",
    color: COLORS.maroon,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  }
}

export default function AdviserListClient({
  advisers,
  sections,
  meta,
  currentUser,
  query,
}: {
  advisers: AdviserListRow[]
  sections: AdviserListSectionOption[]
  meta: AdviserListMeta
  currentUser: AdminCurrentUser
  query: AdviserListQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importOpen, setImportOpen] = useState(false)
  const [editAdviser, setEditAdviser] = useState<AdviserListRow | null>(null)
  const [searchInput, setSearchInput] = useState(query.search)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

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

  const sectionLabel =
    query.sectionId !== ADVISER_LIST_ALL_SECTIONS
      ? `Section ${sections.find((s) => s.sectionId === query.sectionId)?.name ?? ""}`
      : "All Sections"

  function handleDelete(adviserUserId: string) {
    if (!window.confirm("Remove this adviser? This action cannot be undone.")) return

    setDeleteError(null)
    setDeletingId(adviserUserId)

    startDeleteTransition(async () => {
      const result = await deleteAdviser(adviserUserId)
      setDeletingId(null)
      if (!result.ok) {
        setDeleteError(result.error)
        return
      }
      window.location.reload()
    })
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <ProfilePill user={currentUser} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ ...TYPE.h1, color: COLORS.textDark, margin: 0 }}>Adviser List</h1>
        <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
          Academic Year {meta.academicYear} | {meta.semester}
        </p>
        <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
          {totalCount} total advisers
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
            placeholder="Search advisers"
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
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 16 }} />
          Import Adviser/s
        </button>

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

      {deleteError && (
        <p style={{ ...TYPE.body, color: COLORS.maroon, margin: "0 0 16px" }}>
          {deleteError}
        </p>
      )}

      {pageAdvisers.length === 0 ? (
        <div
          style={{
            ...TYPE.body,
            color: COLORS.textGray,
            textAlign: "center",
            padding: "60px 20px",
            background: COLORS.cardBg,
            borderRadius: 16,
          }}
        >
          No advisers match your filters.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {pageAdvisers.map((adviser) => (
            <AdviserCard
              key={adviser.adviserUserId}
              adviser={adviser}
              onEdit={setEditAdviser}
              onDelete={handleDelete}
              isDeleting={isDeleting && deletingId === adviser.adviserUserId}
            />
          ))}
        </div>
      )}

      <Pagination
        page={query.page}
        totalPages={totalPages}
        onPageChange={(nextPage) => pushParams({ page: String(nextPage) })}
      />

      <ImportAdvisersModal open={importOpen} onClose={() => setImportOpen(false)} />
      <EditAdviserModal
        open={editAdviser !== null}
        adviser={editAdviser}
        sections={sections}
        onClose={() => setEditAdviser(null)}
      />
    </>
  )
}
