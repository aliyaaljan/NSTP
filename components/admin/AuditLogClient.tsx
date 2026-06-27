"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AuditLogExportButton from "@/components/admin/AuditLogExportButton"
import { ChartStyles } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_DATE_RANGE_OPTIONS,
  AUDIT_LOG_ALL_ACTIONS,
  AUDIT_LOG_PAGE_SIZE,
  auditLogActionIcon,
  filterAuditLogRows,
  formatAuditLogTimestamp,
  paginateAuditLogRows,
  type AdminCurrentUser,
  type AuditLogMeta,
  type AuditLogQuery,
  type AuditLogRow,
} from "@/lib/admin/audit-log"
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
        background: COLORS.maroon,
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
          width: "100%",
          maxWidth: 560,
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
            flexShrink: 0,
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
          style={{
            padding: "20px 22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
              Event
            </div>
            <div style={{ ...TYPE.bodyBold, color: COLORS.text }}>{entry.title}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
            <div>
              <div style={{ ...TYPE.sectionLabel, color: COLORS.textGray, marginBottom: 4 }}>
                Changed Fields
              </div>
              <div style={{ ...TYPE.body, color: COLORS.text }}>
                {entry.changedFields.join(", ")}
              </div>
            </div>
          )}

          {(entry.oldData || entry.newData) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {entry.oldData && (
                <div>
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
                      overflow: "auto",
                      maxHeight: 180,
                    }}
                  >
                    {JSON.stringify(entry.oldData, null, 2)}
                  </pre>
                </div>
              )}
              {entry.newData && (
                <div>
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
                      overflow: "auto",
                      maxHeight: 180,
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
  onViewDetails,
}: {
  entry: AuditLogRow
  isLast: boolean
  onViewDetails: () => void
}) {
  return (
    <div
      className="anim-list-item"
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            gap: 12,
          }}
        >
          <span style={{ ...TYPE.caption, color: COLORS.light }}>
            {formatAuditLogTimestamp(entry.createdAt)}
          </span>
          <button
            type="button"
            onClick={onViewDetails}
            style={{
              ...TYPE.caption,
              fontFamily: FONT_BODY,
              fontWeight: 600,
              color: COLORS.green,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            View details
            <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
          </button>
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
  const [detailEntry, setDetailEntry] = useState<AuditLogRow | null>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setSearchInput(query.search)
  }, [query.search])

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === AUDIT_LOG_ALL_ACTIONS) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/audit-log?${params.toString()}`)
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
  }, [query.page, query.search, query.action, query.dateRange])

  const filteredEntries = useMemo(
    () => filterAuditLogRows(entries, { ...query, search: searchInput }),
    [entries, query, searchInput]
  )

  const {
    rows: pageEntries,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateAuditLogRows(filteredEntries, query.page),
    [filteredEntries, query.page]
  )

  const actionLabel =
    AUDIT_ACTION_FILTER_OPTIONS.find((o) => o.value === query.action)?.label ??
    "All Actions"
  const dateRangeLabel =
    AUDIT_DATE_RANGE_OPTIONS.find((o) => o.value === query.dateRange)?.label ??
    "Last 7 Days"

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
          <p style={{ ...TYPE.body, color: COLORS.textGray, margin: "4px 0 0" }}>
            {filteredCount} event{filteredCount === 1 ? "" : "s"}
            {showingSampleOnly ? " (sample preview)" : ""}
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
            placeholder="Search audit log"
            style={{
              width: "100%",
              fontFamily: FONT_BODY,
              fontSize: "13.5px",
              color: COLORS.text,
              border: `1.5px solid ${COLORS.maroon}`,
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
        }}
      >
        <FilterDropdown
          label={actionLabel}
          value={query.action}
          onChange={(value) =>
            pushParams({
              action: value === AUDIT_LOG_ALL_ACTIONS ? null : value,
              page: "1",
            })
          }
        >
          {AUDIT_ACTION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: COLORS.text }}>
              {opt.label}
            </option>
          ))}
        </FilterDropdown>

        <FilterDropdown
          label={dateRangeLabel}
          value={query.dateRange}
          onChange={(value) =>
            pushParams({ range: value === "7d" ? null : value, page: "1" })
          }
        >
          {AUDIT_DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ color: COLORS.text }}>
              {opt.label}
            </option>
          ))}
        </FilterDropdown>

        <div style={{ flex: 1, minWidth: 12 }} />

        <AuditLogExportButton
          entries={entries}
          search={searchInput}
          defaultAction={query.action}
          defaultDateRange={query.dateRange}
        />
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
                  onViewDetails={() => setDetailEntry(entry)}
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
