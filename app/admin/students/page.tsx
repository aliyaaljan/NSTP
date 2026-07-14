import { Suspense } from "react"
import StudentListClient from "@/components/admin/StudentListClient"
import { filterStudentListRows, parseStudentListQuery } from "@/lib/admin/student-list"
import { getStudentListData } from "@/lib/admin/student-list-actions"

export const revalidate = 0

async function StudentListContent({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    status?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
    view?: string
  }>
}) {
  const params = await searchParams
  const query = parseStudentListQuery(params)
  const data = await getStudentListData(query)

  return (
    <StudentListClient
      students={data.students}
      sections={data.sections}
      lookups={data.lookups}
      summary={data.summary}
      meta={data.meta}
      currentUser={data.currentUser}
      query={query}
    />
  )
}

export default function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sectionId?: string
    status?: string
    q?: string
    sort?: string
    dir?: string
    page?: string
    view?: string
  }>
}) {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading student list…</div>}>
      <StudentListContent searchParams={searchParams} />
    </Suspense>
  )
}
