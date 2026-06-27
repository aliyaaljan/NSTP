import { Suspense } from "react"
import SectionListClient from "@/components/admin/SectionListClient"
import { parseSectionListQuery } from "@/lib/admin/section-list"
import { getSectionListData } from "@/lib/admin/section-list-actions"

export const revalidate = 0

async function SectionListContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    adviserId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = parseSectionListQuery(params)
  const data = await getSectionListData(query)

  return (
    <SectionListClient
      sections={data.sections}
      advisers={data.advisers}
      statuses={data.statuses}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    adviserId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading sections…</div>}>
      <SectionListContent searchParams={searchParams} />
    </Suspense>
  )
}
