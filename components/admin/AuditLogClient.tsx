"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { adminClickableListItemProps } from "@/components/admin/admin-list-row"
import AuditLogExportButton from "@/components/admin/AuditLogExportButton"
import { ChartStyles } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_DATE_RANGE_OPTIONS,
  AUDIT_LOG_ALL_ACTIONS,
  AUDIT_LOG_PAGE_SIZE,
  auditLogActionIcon,
  auditLogRangeStart,
  filterAuditLogRows,
  formatAuditLogTimestamp,
  paginateAuditLogRows,
  type AdminCurrentUser,
  type AuditLogDateRange,
  type AuditLogMeta,
  type AuditLogQuery,
  type AuditLogRow,
} from "@/lib/admin/audit-log"
import {
  matchesActiveFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
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

function initialFiltersFromQuery(query: AuditLogQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.action !== AUDIT_LOG_ALL_ACTIONS) {
    filters.action = [query.action]
  }
  if (query.dateRange !== "7d") {
    filters.dateRange = [query.dateRange]
  }
  return filters
}

function entryMatchesDateRanges(entry: AuditLogRow, ranges: string[]): boolean {
  return ranges.some((range) => {
    const start = auditLogRangeStart(range as AuditLogDateRange)
    if (!start) return true
    return new Date(entry.createdAt) >= new Date(start)
  })
}

function ActionIcon({ action }: { action: AuditLogRow["action"] }) {
  return (
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: COLORS.maroonBgLight,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <i
        className={`ti ${auditLogActionIcon(action)}`}
        style={{ fontSize: 16, color: COLORS.maroon }}
      />
    </span>
  )
}

function DetailModal({
  entry,
  onClose,
}: {
  entry: AuditLogRow
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  return (
    <div
      role="presentation"
      onClick={onClose}
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
        aria-labelledby="audit-detail-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "85vh",
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            background: COLORS.green,
          }}
        >
          <h2
            id="audit-detail-title"
            style={{ ...TYPE.h2, color: "#fff", margin: 0 }}
          >
            Activity Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div
          className="audit-log-scroll"
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
            minHeight: 0,
            flex: 1,
            overflowY: "auto",
          }}
        >
          <div>
            <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
              Event
            </div>
            <div style={{ ...TYPE.bodyBold, color: COLORS.text }}>{entry.title}</div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                Actor
              </div>
              <div style={{ ...TYPE.body, color: COLORS.text }}>{entry.actorName}</div>
            </div>
            <div>
              <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                Action
              </div>
              <div style={{ ...TYPE.body, color: COLORS.text }}>{entry.action}</div>
            </div>
            <div>
              <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                Table
              </div>
              <div style={{ ...TYPE.body, color: COLORS.text }}>{entry.tableLabel}</div>
            </div>
            <div>
              <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                Timestamp
              </div>
              <div style={{ ...TYPE.body, color: COLORS.text }}>
                {formatAuditLogTimestamp(entry.createdAt)}
              </div>
            </div>
            {entry.summary && (
              <div>
                <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                  Summary
                </div>
                <div style={{ ...TYPE.body, color: COLORS.text }}>{entry.summary}</div>
              </div>
            )}
            {entry.changedFields && entry.changedFields.length > 0 && (
              <div style={entry.summary ? undefined : { gridColumn: 2 }}>
                <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                  Changed Fields
                </div>
                <div style={{ ...TYPE.body, color: COLORS.text }}>
                  {entry.changedFields.join(", ")}
                </div>
              </div>
            )}
          </div>

          {(entry.oldData || entry.newData) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {entry.oldData && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}
                  >
                    Previous Values
                  </div>
                  <pre
                    style={{
                      ...TYPE.caption,
                      margin: 0,
                      padding: 12,
                      background: COLORS.tableHeadBg,
                      borderRadius: 8,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {JSON.stringify(entry.oldData, null, 2)}
                  </pre>
                </div>
              )}
              {entry.newData && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}
                  >
                    New Values
                  </div>
                  <pre
                    style={{
                      ...TYPE.caption,
                      margin: 0,
                      padding: 12,
                      background: COLORS.greenBgLight,
                      borderRadius: 8,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {JSON.stringify(entry.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div>
            <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
              Record ID
            </div>
            <div
              style={{
                ...TYPE.caption,
                color: COLORS.muted,
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {entry.recordId}
            </div>
          </div>

          {entry.isSample && (
            <p style={{ ...TYPE.caption, color: COLORS.amber, margin: 0 }}>
              Sample entry — not from the database.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function LogEntryRow({
  entry,
  isLast,
  onClick,
}: {
  entry: AuditLogRow
  isLast: boolean
  onClick: () => void
}) {
  return (
    <div
      {...adminClickableListItemProps(onClick)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 20px",
        borderBottom: isLast ? "none" : `1px solid ${COLORS.border}`,
      }}
    >
      <ActionIcon action={entry.action} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ ...TYPE.bodyBold, color: COLORS.text }}>{entry.title}</div>
          <span
            style={{
              ...TYPE.caption,
              fontWeight: 600,
              color: COLORS.green,
              background: COLORS.greenBgLight,
              borderRadius: 999,
              padding: "2px 10px",
              flexShrink: 0,
              textTransform: "lowercase",
            }}
          >
            success
          </span>
        </div>
        <div style={{ ...TYPE.body, color: COLORS.textGray, marginTop: 4 }}>
          {entry.subtitle}
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ ...TYPE.caption, color: COLORS.light }}>
            {formatAuditLogTimestamp(entry.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function AuditLogClient({
  entries,
  meta,
  currentUser,
  query,
}: {
  entries: AuditLogRow[]
  totalCount: number
  meta: AuditLogMeta
  currentUser: AdminCurrentUser
  query: AuditLogQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(query.search)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() =>
    initialFiltersFromQuery(query)
  )
  const [detailEntry, setDetailEntry] = useState<AuditLogRow | null>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === AUDIT_LOG_ALL_ACTIONS) params.delete(key)
      else if (key === "range" && value === "7d") params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/audit-log?${params.toString()}`)
  }

  function syncFiltersToParams(filters: ActiveFilters) {
    const action = filters.action?.length === 1 ? filters.action[0] : null
    const range = filters.dateRange?.length === 1 ? filters.dateRange[0] : null
    pushParams({
      action,
      range: range === "7d" || !range ? null : range,
      page: "1",
    })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === query.search) return
      pushParams({ q: searchInput.trim() || null, page: "1" })
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.action, query.dateRange, activeFilters])

  const filterGroups: FilterGroupDef[] = useMemo(
    () => [
      {
        label: "Action",
        field: "action",
        options: AUDIT_ACTION_FILTER_OPTIONS.filter(
          (opt) => opt.value !== AUDIT_LOG_ALL_ACTIONS
        ).map((opt) => ({ value: opt.value, label: opt.label })),
      },
      {
        label: "Date Range",
        field: "dateRange",
        options: AUDIT_DATE_RANGE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      },
    ],
    []
  )

  const searchFiltered = useMemo(
    () =>
      filterAuditLogRows(entries, {
        ...query,
        search: searchInput,
        action: AUDIT_LOG_ALL_ACTIONS,
        dateRange: "all",
      }),
    [entries, query, searchInput]
  )

  const effectiveDateRanges = activeFilters.dateRange?.length
    ? activeFilters.dateRange
    : ["7d"]

  const visibleEntries = useMemo(
    () =>
      searchFiltered.filter(
        (entry) =>
          matchesActiveFilters({ action: entry.action }, activeFilters) &&
          entryMatchesDateRanges(entry, effectiveDateRanges)
      ),
    [searchFiltered, activeFilters, effectiveDateRanges]
  )

  const {
    rows: pageEntries,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateAuditLogRows(visibleEntries, query.page),
    [visibleEntries, query.page]
  )

  const exportAction =
    activeFilters.action?.length === 1
      ? (activeFilters.action[0] as AuditLogQuery["action"])
      : AUDIT_LOG_ALL_ACTIONS
  const exportDateRange = (effectiveDateRanges[0] ?? "7d") as AuditLogDateRange

  const showingSampleOnly = entries.every((e) => e.isSample)

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  return (
    <>
      <ChartStyles />
      <style>{`
        .audit-log-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .audit-log-scroll::-webkit-scrollbar { width: 5px; }
        .audit-log-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Audit Log</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div className="admin-table-card">
        <AdminTableToolbar
          title="All Events"
          count={`${filteredCount} event${filteredCount === 1 ? "" : "s"} found${
            showingSampleOnly ? " (sample preview)" : ""
          }`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search audit log"
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            syncFiltersToParams(next)
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ action: null, range: null, page: "1" })
          }}
          actions={
            <AuditLogExportButton
              entries={entries}
              search={searchInput}
              defaultAction={exportAction}
              defaultDateRange={exportDateRange}
            />
          }
        />

        <div
          className="audit-log-scroll"
          style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}
        >
          {pageEntries.length === 0 ? (
            <div
              style={{
                ...TYPE.body,
                color: COLORS.textGray,
                textAlign: "center",
                padding: "40px 20px",
              }}
            >
              No audit events match your filters.
            </div>
          ) : (
            <div key={animKey}>
              {pageEntries.map((entry, index) => (
                <LogEntryRow
                  key={entry.auditLogId}
                  entry={entry}
                  isLast={index === pageEntries.length - 1}
                  onClick={() => setDetailEntry(entry)}
                />
              ))}
            </div>
          )}
        </div>

        <ListPagination
          page={query.page}
          totalPages={totalPages}
          totalCount={filteredCount}
          pageSize={AUDIT_LOG_PAGE_SIZE}
          onPageChange={goToPage}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      {detailEntry && (
        <DetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}
    </>
  )
}
