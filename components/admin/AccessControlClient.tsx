"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AddAccessUserModal from "@/components/admin/AddAccessUserModal"
import EditAccessUserModal from "@/components/admin/EditAccessUserModal"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import {
  deactivateAccessUser,
} from "@/lib/admin/access-control-actions"
import type {
  AccessControlMeta,
  AccessControlQuery,
  AccessControlRoleOption,
  AccessControlRow,
  AccessControlSortKey,
  AccessControlSummary,
  AdminCurrentUser,
} from "@/lib/admin/access-control"
import {
  ACCESS_CONTROL_ALL_ROLES,
  ACCESS_CONTROL_PAGE_SIZE,
  ACCESS_CONTROL_STATUS_FILTER_OPTIONS,
  ROLE_CODE_LABELS,
  ROLE_COLOR_STYLES,
  filterAccessControlRows,
  paginateAccessControlRows,
} from "@/lib/admin/access-control"
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

const TABLE_COL_WIDTHS = ["30%", "14%", "18%", "12%", "14%", "12%"]

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

function RoleBadge({ roleCode }: { roleCode: AccessControlRow["roleCode"] }) {
  const roleStyle = ROLE_COLOR_STYLES[roleCode]

  return (
    <span
      style={{
        ...TYPE.bodyBold,
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        background: roleStyle.bg,
        color: roleStyle.color,
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_CODE_LABELS[roleCode]}
    </span>
  )
}

export default function AccessControlClient({
  users,
  roles,
  summary,
  meta,
  currentUser,
  query,
}: {
  users: AccessControlRow[]
  roles: AccessControlRoleOption[]
  summary: AccessControlSummary
  meta: AccessControlMeta
  currentUser: AdminCurrentUser
  query: AccessControlQuery
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editUser, setEditUser] = useState<AccessControlRow | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
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
      if (!value || value === ACCESS_CONTROL_ALL_ROLES) params.delete(key)
      else params.set(key, value)
    })
    router.push(`/admin/access-control?${params.toString()}`)
  }

  function toggleSort(key: AccessControlSortKey) {
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

  const visibleUsers = useMemo(
    () => filterAccessControlRows(users, { ...query, search: searchInput }),
    [users, query, searchInput]
  )

  const {
    rows: pageUsers,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateAccessControlRows(visibleUsers, query.page),
    [visibleUsers, query.page]
  )

  useEffect(() => {
    setAnimKey((k) => k + 1)
  }, [query.page, query.search, query.role, query.status, query.sort, query.dir])

  function goToPage(nextPage: number) {
    pushParams({ page: String(nextPage) })
  }

  const roleLabel =
    query.role !== ACCESS_CONTROL_ALL_ROLES
      ? ROLE_CODE_LABELS[query.role]
      : "All Roles"
  const statusLabel =
    ACCESS_CONTROL_STATUS_FILTER_OPTIONS.find((o) => o.value === query.status)?.label ??
    "All Status"

  function openDeleteConfirm(appUserId: string, name: string) {
    setDeleteError(null)
    setDeleteTarget({ id: appUserId, name })
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
      const result = await deactivateAccessUser(deleteTarget.id)
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
    summary.totalUsers > 0 ? `${Math.round((count / summary.totalUsers) * 100)}%` : "0%"

  const statCards: KpiStatCardProps[] = [
    {
      icon: "ti-users",
      label: "Total Users",
      value: summary.totalUsers,
      note: "registered accounts",
      onClick: () => pushParams({ role: null, page: "1" }),
      isActive: query.role === ACCESS_CONTROL_ALL_ROLES,
    },
    {
      icon: "ti-shield",
      label: "Administrators",
      value: summary.adminCount,
      badge: {
        text: pctOfTotal(summary.adminCount),
        bg: ROLE_COLOR_STYLES.admin.bg,
        color: ROLE_COLOR_STYLES.admin.color,
      },
      note: "of all users",
      onClick: () => pushParams({ role: "admin", page: "1" }),
      isActive: query.role === "admin",
    },
    {
      icon: "ti-user-check",
      label: "Advisers",
      value: summary.adviserCount,
      badge: {
        text: pctOfTotal(summary.adviserCount),
        bg: ROLE_COLOR_STYLES.adviser.bg,
        color: ROLE_COLOR_STYLES.adviser.color,
      },
      note: "of all users",
      onClick: () => pushParams({ role: "adviser", page: "1" }),
      isActive: query.role === "adviser",
    },
    {
      icon: "ti-school",
      label: "Students",
      value: summary.studentCount,
      badge: {
        text: pctOfTotal(summary.studentCount),
        bg: ROLE_COLOR_STYLES.student.bg,
        color: ROLE_COLOR_STYLES.student.color,
      },
      note: "of all users",
      onClick: () => pushParams({ role: "student", page: "1" }),
      isActive: query.role === "student",
    },
  ]

  return (
    <>
      <ChartStyles />
      <style>{`
        .access-control-scroll { scrollbar-width: thin; scrollbar-color: #CFCFCB transparent; }
        .access-control-scroll::-webkit-scrollbar { width: 5px; }
        .access-control-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Access Control</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Manage roles &amp; user access
          </p>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "4px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <ProfilePill user={currentUser} />
      </div>

      <div className="admin-list-pre-table">
        <div className="admin-list-kpi-sticky">
          <KpiStatCardGrid columns={4}>
            {statCards.map((card, index) => (
              <KpiStatCard key={index} {...card} />
            ))}
          </KpiStatCardGrid>
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
            placeholder="Search by name, email, or ID"
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
            label={roleLabel}
            value={query.role}
            onChange={(value) =>
              pushParams({
                role: value === ACCESS_CONTROL_ALL_ROLES ? null : value,
                page: "1",
              })
            }
          >
            <option value={ACCESS_CONTROL_ALL_ROLES}>All Roles</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.code}>
                {ROLE_CODE_LABELS[role.code]}
              </option>
            ))}
          </FilterDropdown>

          <FilterDropdown
            label={statusLabel}
            value={query.status}
            onChange={(value) =>
              pushParams({ status: value === "all" ? null : value, page: "1" })
            }
          >
            {ACCESS_CONTROL_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterDropdown>
        </div>

        <AdminAddButton label="Add user" onClick={() => setAddUserOpen(true)} />
      </div>
      </div>

      <div
        style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: COLORS.radius,
          boxShadow: COLORS.cardShadow,
        }}
      >
        <div className="admin-list-thead-wrap" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 860,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <thead>
              <tr style={{ background: COLORS.tableHeadBg }}>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="ID"
                    sortable
                    sortActive={query.sort === "id"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("id")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader
                    label="Role"
                    sortable
                    sortActive={query.sort === "role"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("role")}
                  />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "center" }}>
                  <ColumnHeader label="Status" align="center" />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Last Updated" />
                </th>
                <th style={{ padding: "14px 18px", textAlign: "left" }}>
                  <ColumnHeader label="Actions" />
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div className="access-control-scroll admin-list-table-scroll">
          <table
            style={{
              width: "100%",
              minWidth: 860,
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <TableColGroup />
            <tbody key={animKey}>
              {pageUsers.length === 0 ? (
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
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                pageUsers.map((user) => {
                  const statusBadge = user.isActive
                    ? { bg: COLORS.greenBgLight, color: COLORS.green, label: "Active" }
                    : {
                        bg: COLORS.maroonDarkBgLight,
                        color: COLORS.maroonDark,
                        label: "Inactive",
                      }
                  const lastUpdated = user.updatedAt
                    ? new Date(user.updatedAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"

                  return (
                    <tr
                      key={user.appUserId}
                      className="anim-list-item"
                      style={{ borderTop: `1px solid ${COLORS.border}` }}
                    >
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {user.fullName}
                          {user.isSample && (
                            <span
                              style={{
                                ...TYPE.caption,
                                color: COLORS.textGray,
                                fontWeight: 400,
                                marginLeft: 8,
                              }}
                            >
                              (preview)
                            </span>
                          )}
                        </div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                          {user.email}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                          {user.displayId}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <RoleBadge roleCode={user.roleCode} />
                      </td>
                      <td
                        style={{
                          padding: "16px 18px",
                          verticalAlign: "middle",
                          textAlign: "center",
                        }}
                      >
                        <span
                          style={{
                            ...TYPE.bodyBold,
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            fontSize: "12px",
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
                          {lastUpdated}
                        </div>
                      </td>
                      <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <button
                            type="button"
                            aria-label={`Edit ${user.fullName}`}
                            title="Edit user"
                            onClick={() => setEditUser(user)}
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
                            aria-label={`Deactivate ${user.fullName}`}
                            title="Deactivate user"
                            disabled={isDeleting && deletingId === user.appUserId}
                            onClick={() => openDeleteConfirm(user.appUserId, user.fullName)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 4,
                              cursor:
                                isDeleting && deletingId === user.appUserId
                                  ? "not-allowed"
                                  : "pointer",
                              color: COLORS.maroon,
                              opacity:
                                isDeleting && deletingId === user.appUserId ? 0.5 : 1,
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
          pageSize={ACCESS_CONTROL_PAGE_SIZE}
          onPageChange={goToPage}
          containerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        />
      </div>

      <AddAccessUserModal
        open={addUserOpen}
        roles={roles}
        onClose={() => setAddUserOpen(false)}
      />
      <EditAccessUserModal
        open={editUser !== null}
        user={editUser}
        roles={roles}
        onClose={() => setEditUser(null)}
      />
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Deactivate User"
        subjectName={deleteTarget?.name}
        message="Deactivate this user account? They will lose portal access. This action can be reversed by editing the account."
        confirmLabel="Deactivate"
        isPending={isDeleting}
        error={deleteError}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
      />
    </>
  )
}
