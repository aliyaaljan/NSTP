import { Suspense } from "react"
import FormListClient from "@/components/admin/FormListClient"
import { parseFormListQuery } from "@/lib/admin/form-list"
import { getFormListData } from "@/lib/admin/form-list-actions"

export const revalidate = 0

async function FormListContent({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const query = parseFormListQuery(params)
  const data = await getFormListData(query)

  return (
    <FormListClient
      forms={data.forms}
      sections={data.sections}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminFormsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading forms…</div>}>
      <FormListContent searchParams={searchParams} />
    </Suspense>
  )
}
