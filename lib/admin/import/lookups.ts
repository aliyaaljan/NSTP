/** Server-side fetchers that turn lookup tables into import value matchers. */
import "server-only"
import { buildLookupMatcher, type LookupMatcher } from "@/lib/admin/import/normalize"
import type { ServiceClient } from "@/lib/admin/user-provision"

async function fetchMatcher(
  service: ServiceClient,
  table: string,
  idColumn: string
): Promise<LookupMatcher> {
  const { data, error } = await service.from(table).select(`${idColumn}, code, name`)
  if (error || !data) {
    throw new Error(`Failed to load lookup table "${table}": ${error?.message ?? "no data"}`)
  }
  return buildLookupMatcher(
    (data as unknown as Record<string, string>[]).map((row) => ({
      id: row[idColumn],
      code: row.code,
      name: row.name,
    }))
  )
}

export interface StudentImportLookups {
  program: LookupMatcher
  classification: LookupMatcher
  enlistment: LookupMatcher
}

export async function getStudentImportLookups(
  service: ServiceClient
): Promise<StudentImportLookups> {
  const [program, classification, enlistment] = await Promise.all([
    fetchMatcher(service, "program", "program_id"),
    fetchMatcher(service, "student_classification", "student_classification_id"),
    fetchMatcher(service, "enlistment_status", "enlistment_status_id"),
  ])
  return { program, classification, enlistment }
}

export interface AdviserImportLookups {
  college: LookupMatcher
  component: LookupMatcher
}

export async function getAdviserImportLookups(
  service: ServiceClient
): Promise<AdviserImportLookups> {
  const [college, component] = await Promise.all([
    fetchMatcher(service, "college", "college_id"),
    fetchMatcher(service, "nstp_component", "nstp_component_id"),
  ])
  return { college, component }
}
