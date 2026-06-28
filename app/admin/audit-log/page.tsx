import { Suspense } from "react"
import AuditLogClient from "@/components/admin/AuditLogClient"
import { parseAuditLogQuery } from "@/lib/admin/audit-log"
import { getAuditLogData } from "@/lib/admin/audit-log-actions"

export const revalidate = 0

async function AuditLogContent({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    action?: string
    range?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = parseAuditLogQuery(params)
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

export default function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    action?: string
    range?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading audit log…</div>}>
      <AuditLogContent searchParams={searchParams} />
    </Suspense>
  )
}
