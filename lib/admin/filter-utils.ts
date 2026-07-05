export type ActiveFilters = Record<string, string[]>

export type FilterGroupDef = {
  label: string
  field: string
  options: { value: string; label: string }[]
  /** Split long option lists into multiple columns with this many items each. */
  optionsPerColumn?: number
}

export function chunkFilterOptions<T>(items: T[], perColumn: number): T[][] {
  if (items.length === 0) return [[]]
  const columns: T[][] = []
  for (let i = 0; i < items.length; i += perColumn) {
    columns.push(items.slice(i, i + perColumn))
  }
  return columns
}

export function countActiveFilters(activeFilters: ActiveFilters): number {
  return Object.values(activeFilters).reduce((sum, values) => sum + values.length, 0)
}

export function toggleFilterValue(
  activeFilters: ActiveFilters,
  field: string,
  value: string
): ActiveFilters {
  const current = activeFilters[field] ?? []
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value]
  if (next.length === 0) {
    const { [field]: _, ...rest } = activeFilters
    return rest
  }
  return { ...activeFilters, [field]: next }
}

/** Returns true when row passes all active checkbox filter groups (OR within group, AND across groups). */
export function matchesActiveFilters(
  row: Record<string, string | undefined>,
  activeFilters: ActiveFilters
): boolean {
  for (const [field, selected] of Object.entries(activeFilters)) {
    if (selected.length === 0) continue
    const value = row[field]
    if (!value || !selected.includes(value)) return false
  }
  return true
}
