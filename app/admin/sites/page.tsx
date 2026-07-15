import { Suspense } from "react"
import AdminLoadingFallback from "@/components/admin/AdminLoadingFallback"
import SiteListClient from "@/components/admin/SiteListClient"
import { parseSiteListQuery } from "@/lib/admin/site-list"
import { getSiteListData } from "@/lib/admin/site-list-actions"

export const revalidate = 0

async function SiteListContent({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    radius?: string
    sectionId?: string
    adviserId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
    view?: string
  }>
}) {
  const params = await searchParams
  const query = parseSiteListQuery(params)
  const data = await getSiteListData(query)

  return (
    <SiteListClient
      sites={data.sites}
      sections={data.sections}
      advisers={data.advisers}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    radius?: string
    sectionId?: string
    adviserId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
    view?: string
  }>
}) {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <SiteListContent searchParams={searchParams} />
    </Suspense>
  )
}
