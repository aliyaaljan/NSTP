"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import ConfirmDeleteModal from "@/components/admin/ConfirmDeleteModal"
import AdminRecordDetailModal from "@/components/admin/AdminRecordDetailModal"
import AdminAddButton from "@/components/admin/AdminAddButton"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
import AddAccessUserModal from "@/components/admin/AddAccessUserModal"
import EditAccessUserModal from "@/components/admin/EditAccessUserModal"
import { adminClickableRowProps } from "@/components/admin/admin-list-row"
import { ChartStyles, KpiStatCard, KpiStatCardGrid, type KpiStatCardProps } from "@/components/shared/ChartModule"
import ListPagination from "@/components/shared/ListPagination"
import { AdminSortHeader } from "@/components/shared/AdminSortHeader"
import { AdminTableToolbar } from "@/components/shared/AdminTableToolbar"
import {
  deactivateAccessUser,
} from "@/lib/admin/access-control-actions"
import {
  matchesActiveFilters,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
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
import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function RoleBadge({ roleCode }: { roleCode: AccessControlRow["roleCode"] }) {
  const roleStyle = ROLE_COLOR_STYLES[roleCode]

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: roleStyle.bg,
        color: roleStyle.color,
        whiteSpace: "nowrap",
      }}
    >
      {ROLE_CODE_LABELS[roleCode]}
    </span>
  )
}

function initialFiltersFromQuery(query: AccessControlQuery): ActiveFilters {
  const filters: ActiveFilters = {}
  if (query.role !== ACCESS_CONTROL_ALL_ROLES) {
    filters.roleCode = [query.role]
  }
  if (query.status !== "all") {
    filters.status = [query.status]
  }
  return filters
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
  const [detailUser, setDetailUser] = useState<AccessControlRow | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
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
  const [pageSize, setPageSize] = useState(ACCESS_CONTROL_PAGE_SIZE)

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

  const filterGroups: FilterGroupDef[] = useMemo(
    () => [
      {
        label: "Role",
        field: "roleCode",
        options: roles.map((role) => ({
          value: role.code,
          label: ROLE_CODE_LABELS[role.code],
        })),
      },
      {
        label: "Status",
        field: "status",
        options: ACCESS_CONTROL_STATUS_FILTER_OPTIONS.filter((o) => o.value !== "all").map(
          (o) => ({ value: o.value, label: o.label })
        ),
      },
    ],
    [roles]
  )

  const searchFiltered = useMemo(
    () =>
      filterAccessControlRows(users, {
        ...query,
        search: searchInput,
        role: ACCESS_CONTROL_ALL_ROLES,
        status: "all",
      }),
    [users, query, searchInput]
  )

  const visibleUsers = useMemo(
    () =>
      searchFiltered.filter((user) =>
        matchesActiveFilters(
          {
            roleCode: user.roleCode,
            status: user.isActive ? "active" : "inactive",
          },
          activeFilters
        )
      ),
    [searchFiltered, activeFilters]
  )

  const {
    rows: pageUsers,
    totalPages,
    totalCount: filteredCount,
  } = useMemo(
    () => paginateAccessControlRows(visibleUsers, query.page, pageSize),
    [visibleUsers, query.page, pageSize]
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

  function setRoleFilter(role: string | null) {
    setActiveFilters((prev) => {
      if (!role) {
        const { roleCode: _, ...rest } = prev
        return rest
      }
      return { ...prev, roleCode: [role] }
    })
    pushParams({ role, page: "1" })
  }

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
      onClick: () => setRoleFilter(null),
      isActive: !activeFilters.roleCode?.length,
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
      onClick: () => setRoleFilter("admin"),
      isActive: activeFilters.roleCode?.includes("admin") ?? false,
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
      onClick: () => setRoleFilter("adviser"),
      isActive: activeFilters.roleCode?.includes("adviser") ?? false,
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
      onClick: () => setRoleFilter("student"),
      isActive: activeFilters.roleCode?.includes("student") ?? false,
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
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Access Control</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Manage roles &amp; user access
          </p>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "4px 0 0" }}>
            Academic Year {meta.academicYear} | {meta.semester}
          </p>
        </div>
        <AdminProfilePill user={currentUser} />
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
          title="All Users"
          count={`${filteredCount} user${filteredCount !== 1 ? "s" : ""} found`}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search by name, email, or ID"
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={(next) => {
            setActiveFilters(next)
            pushParams({ page: "1" })
          }}
          onClearFilters={() => {
            setActiveFilters({})
            pushParams({ role: null, status: null, page: "1" })
          }}
          actions={<AdminAddButton label="Add user" onClick={() => setAddUserOpen(true)} />}
        />

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>
                  <AdminSortHeader
                    label="Name"
                    sortable
                    sortActive={query.sort === "name"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("name")}
                  />
                </th>
                <th style={{ width: "14%" }}>
                  <AdminSortHeader
                    label="ID"
                    sortable
                    sortActive={query.sort === "id"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("id")}
                  />
                </th>
                <th style={{ width: "18%" }}>
                  <AdminSortHeader
                    label="Role"
                    sortable
                    sortActive={query.sort === "role"}
                    sortDirection={query.dir}
                    onSort={() => toggleSort("role")}
                  />
                </th>
                <th style={{ width: "12%", textAlign: "center" }}>Status</th>
                <th style={{ width: "16%" }}>Last Updated</th>
              </tr>
            </thead>
            <tbody key={animKey}>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
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
                      {...adminClickableRowProps(() => setDetailUser(user))}
                    >
                      <td>
                        <div style={{ fontWeight: 700, color: COLORS.textDark }}>
                          {user.fullName}
                          {user.isSample && (
                            <span
                              style={{
                                fontSize: 12,
                                color: COLORS.textGray,
                                fontWeight: 400,
                                marginLeft: 8,
                              }}
                            >
                              (preview)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                          {user.email}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: COLORS.textDark }}>
                          {user.displayId}
                        </div>
                      </td>
                      <td>
                        <RoleBadge roleCode={user.roleCode} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: statusBadge.bg,
                            color: statusBadge.color,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: COLORS.textGray }}>
                          {lastUpdated}
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
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSizeChange}
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

      {detailUser && (
        <AdminRecordDetailModal
          open
          title={detailUser.fullName}
          subtitle={detailUser.email}
          fields={[
            { label: "ID", value: detailUser.displayId },
            { label: "Role", value: <RoleBadge roleCode={detailUser.roleCode} /> },
            {
              label: "Status",
              value: detailUser.isActive ? "Active" : "Inactive",
            },
            {
              label: "Last Updated",
              value: detailUser.updatedAt
                ? new Date(detailUser.updatedAt).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
            },
          ]}
          onClose={() => setDetailUser(null)}
          onEdit={() => {
            setEditUser(detailUser)
            setDetailUser(null)
          }}
          onDelete={() => {
            openDeleteConfirm(detailUser.appUserId, detailUser.fullName)
            setDetailUser(null)
          }}
          deleteLabel="Deactivate"
          editDisabled={detailUser.isSample}
          deleteDisabled={
            detailUser.isSample || (isDeleting && deletingId === detailUser.appUserId)
          }
        />
      )}

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
