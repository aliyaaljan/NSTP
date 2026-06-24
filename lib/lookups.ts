import "server-only"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

type LookupTable =
  | "role"
  | "enrollment_status"
  | "appeal_status"
  | "attendance_event_type"
  | "attendance_session_status"
  | "section_status"
  | "form_submission_status"

const cache = new Map<LookupTable, Promise<Map<string, string>>>()

function loadTable(table: LookupTable): Promise<Map<string, string>> {
  const cached = cache.get(table)
  if (cached) return cached

  const idColumn = `${table}_id`
  const promise = (async () => {
    const { data, error } = await createSupabaseServiceClient()
      .from(table)
      .select(`${idColumn}, code`)

    if (error || !data) {
      cache.delete(table) // let a later call retry after a transient failure
      throw new Error(
        `Failed to load lookup table "${table}": ${error?.message ?? "no data"}`
      )
    }

    const map = new Map<string, string>()
    // The dynamic .select() string defeats Supabase's row typing, so cast via unknown.
    for (const row of data as unknown as Record<string, string>[]) {
      map.set(row.code, row[idColumn])
    }
    return map
  })()

  cache.set(table, promise)
  return promise
}

/** Resolve the UUID of a lookup row by its stable `code`. Throws if unknown. */
export async function lookupId(table: LookupTable, code: string): Promise<string> {
  const map = await loadTable(table)
  const id = map.get(code)
  if (!id) throw new Error(`Unknown ${table} code: "${code}"`)
  return id
}
