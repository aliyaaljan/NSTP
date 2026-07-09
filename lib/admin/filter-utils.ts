export type ActiveFilters = Record<string, string[]>

export type FilterGroupDef = {
  label: string
  field: string
  options: { value: string; label: string }[]
  /** Split long option lists into multiple columns with this many items each. */
  optionsPerColumn?: number
}

/** Admin dashboard filter dropdown — reference width for multi-group panels. */
export const ADMIN_FILTER_PANEL_WIDTH = 840

/** Rows per column before wrapping — matches the admin dashboard filter panel. */
export const ADMIN_FILTER_PANEL_OPTIONS_PER_COLUMN = 12

const MIN_PANEL_WIDTH = 220
const NARROW_GROUP_MAX_WIDTH = 168
const WIDE_GROUP_MAX_WIDTH = 380

const WIDE_FILTER_FIELDS = new Set([
  "section",
  "sectionId",
  "adviser",
  "adviserUserId",
])

export function isWideFilterField(field: string): boolean {
  return WIDE_FILTER_FIELDS.has(field)
}

export function filterGroupMaxWidth(field: string): number {
  return isWideFilterField(field) ? WIDE_GROUP_MAX_WIDTH : NARROW_GROUP_MAX_WIDTH
}

function resolveGroupOptionsPerColumn(
  optionCount: number,
  multiGroup: boolean,
  explicit?: number
): number {
  if (explicit != null) return explicit
  if (optionCount <= ADMIN_FILTER_PANEL_OPTIONS_PER_COLUMN) return optionCount
  if (multiGroup) return ADMIN_FILTER_PANEL_OPTIONS_PER_COLUMN
  return optionCount
}

/** Match dashboard sizing: 840px for comparable panels; exact width/height when fewer options. */
export function resolveFilterPanelLayout(groups: FilterGroupDef[]): {
  maxWidth: number
  groups: FilterGroupDef[]
} {
  const activeGroups = groups.filter((group) => group.options.length > 0)
  if (activeGroups.length === 0) {
    return { maxWidth: MIN_PANEL_WIDTH, groups: [] }
  }

  const multiGroup = activeGroups.length >= 2
  const enrichedGroups = activeGroups.map((group) => ({
    ...group,
    optionsPerColumn: resolveGroupOptionsPerColumn(
      group.options.length,
      multiGroup,
      group.optionsPerColumn
    ),
  }))

  return { maxWidth: ADMIN_FILTER_PANEL_WIDTH, groups: enrichedGroups }
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
