import { Suspense } from "react"
import { notFound } from "next/navigation"
import AdminLoadingFallback from "@/components/admin/AdminLoadingFallback"
import AuditLogClient from "@/components/admin/AuditLogClient"
import { parseAuditLogQuery } from "@/lib/admin/audit-log"
import { getAuditLogData } from "@/lib/admin/audit-log-actions"
import { getAppUserRole } from "@/lib/auth-actions"

// enforce dynamice database fetching
export const dynamic = "force-dynamic"

interface PageParams {
  q?: string
  action?: string
  range?: string
  page?: string
}

async function AuditLogContent({
  query,
}: {
  query: ReturnType<typeof parseAuditLogQuery>
}) {
  const data = await getAuditLogData(query)

  return (
    <AuditLogClient
      entries={data.entries}
      totalCount={data.totalCount}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>
}) {
  // check user role for authentication
  const role = await getAppUserRole()
  if (role !== "admin") {
    notFound()
  }

  const params = await searchParams
  const query = parseAuditLogQuery(params)
  // Refetch on search/filter changes only — page/size are client-side.
  const suspenseKey = `${params.q || ""}-${params.action || ""}-${
    params.range || ""
  }`

  return (
    <Suspense
      key={suspenseKey}
      fallback={<AdminLoadingFallback />}
    >
      <AuditLogContent query={query} />
    </Suspense>
  )
}
