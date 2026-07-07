/**
 * Value normalization for imports. Pure and client-safe.
 *
 * Client files carry display-ish values ("BSBiology", "Sophomore", "Enlisted",
 * "Civic Welfare Training Service"); lookups store codes ("BSBIO", "sophomore",
 * "ENLISTED", "CWTS"). Matching compares a normalized key (lowercase,
 * alphanumerics only) against both the lookup code AND name.
 */

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export interface LookupRow {
  id: string
  code: string
  name: string
}

/** Returns the lookup row id for a raw value, or null when unknown/blank. */
export type LookupMatcher = (value: string) => string | null

export function buildLookupMatcher(rows: LookupRow[]): LookupMatcher {
  const index = new Map<string, string>()
  for (const row of rows) {
    for (const key of [normalizeKey(row.code), normalizeKey(row.name)]) {
      if (key && !index.has(key)) index.set(key, row.id)
    }
  }
  return (value: string) => {
    const key = normalizeKey(value)
    if (!key) return null
    return index.get(key) ?? null
  }
}
