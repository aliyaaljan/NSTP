import { Suspense } from "react"
import AccessControlClient from "@/components/admin/AccessControlClient"
import { parseAccessControlQuery } from "@/lib/admin/access-control"
import { getAccessControlData } from "@/lib/admin/access-control-actions"

export const revalidate = 0

async function AccessControlContent({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string
    status?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = parseAccessControlQuery(params)
  const data = await getAccessControlData(query)

  return (
    <AccessControlClient
      users={data.users}
      roles={data.roles}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminAccessControlPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string
    status?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading access control…</div>}>
      <AccessControlContent searchParams={searchParams} />
    </Suspense>
  )
}
