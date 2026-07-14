import { Suspense } from "react"
import AdminLoadingFallback from "@/components/admin/AdminLoadingFallback"
import AdviserListClient from "@/components/admin/AdviserListClient"
import { parseAdviserListQuery } from "@/lib/admin/adviser-list"
import { getAdviserListData } from "@/lib/admin/adviser-list-actions"

export const revalidate = 0

async function AdviserListContent({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    status?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = parseAdviserListQuery(params)
  const data = await getAdviserListData(query)

  return (
    <AdviserListClient
      advisers={data.advisers}
      sections={data.sections}
      lookups={data.lookups}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminAdvisersPage({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    status?: string
    q?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdviserListContent searchParams={searchParams} />
    </Suspense>
  )
}
