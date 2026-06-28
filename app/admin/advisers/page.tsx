import { Suspense } from "react"
import AdviserListClient from "@/components/admin/AdviserListClient"
import { parseAdviserListQuery } from "@/lib/admin/adviser-list"
import { getAdviserListData } from "@/lib/admin/adviser-list-actions"

export const revalidate = 0

async function AdviserListContent({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
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
    q?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading adviser list…</div>}>
      <AdviserListContent searchParams={searchParams} />
    </Suspense>
  )
}
