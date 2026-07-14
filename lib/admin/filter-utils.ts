import { extractNstpType } from "@/lib/shared/class-label"

export type ActiveFilters = Record<string, string[]>

export type FilterGroupDef = {
  label: string
  field: string
  options: { value: string; label: string }[]
  /** Split long option lists into multiple columns with this many items each. */
  optionsPerColumn?: number
  /** When true, selecting an option replaces any other selection in this group. */
  singleSelect?: boolean
}

/** Fields used by {@link buildClassDimensionFilterGroups}. */
export const CLASS_DIMENSION_FIELDS = [
  "nstpType",
  "adviserUserId",
  "schoolYear",
] as const

export type ClassDimensionField = (typeof CLASS_DIMENSION_FIELDS)[number]

/** Minimal section/row shape for building and matching class dimension filters. */
export type ClassFilterSource = {
  courseCode?: string | null
  nstpType?: string | null
  adviserUserId?: string | null
  adviserName?: string | null
  schoolYear?: string | null
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
  value: string,
  singleSelect = false
): ActiveFilters {
  const current = activeFilters[field] ?? []
  if (current.includes(value)) {
    const next = current.filter((v) => v !== value)
    if (next.length === 0) {
      const { [field]: _, ...rest } = activeFilters
      return rest
    }
    return { ...activeFilters, [field]: next }
  }

  if (singleSelect) {
    return { ...activeFilters, [field]: [value] }
  }

  return { ...activeFilters, [field]: [...current, value] }
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

export function resolveClassNstpType(source: ClassFilterSource): string {
  const explicit = source.nstpType?.trim()
  if (explicit) return explicit
  return extractNstpType(source.courseCode)
}

export function withoutClassDimensionFilters(
  activeFilters: ActiveFilters
): ActiveFilters {
  const next: ActiveFilters = {}
  for (const [field, values] of Object.entries(activeFilters)) {
    if ((CLASS_DIMENSION_FIELDS as readonly string[]).includes(field)) continue
    next[field] = values
  }
  return next
}

function uniqueSortedOptions(
  values: Iterable<string>
): { value: string; label: string }[] {
  return [...new Set([...values].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
}

/**
 * Builds Class (NSTP type) / Adviser / School year filter groups from section-like sources.
 * Each group is single-select; selections combine with AND across groups.
 */
export function buildClassDimensionFilterGroups(
  sources: ClassFilterSource[],
  options?: {
    /** Include the Adviser group (default true). */
    includeAdviser?: boolean
  }
): FilterGroupDef[] {
  const includeAdviser = options?.includeAdviser !== false

  const nstpTypes: string[] = []
  const schoolYears: string[] = []
  const advisers = new Map<string, string>()

  for (const source of sources) {
    const nstpType = resolveClassNstpType(source)
    if (nstpType) nstpTypes.push(nstpType)

    const year = source.schoolYear?.trim()
    if (year) schoolYears.push(year)

    const adviserId = source.adviserUserId?.trim()
    const adviserName = source.adviserName?.trim()
    if (includeAdviser && adviserId && adviserName) {
      advisers.set(adviserId, adviserName)
    }
  }

  const groups: FilterGroupDef[] = [
    {
      label: "Class",
      field: "nstpType",
      singleSelect: true,
      options: uniqueSortedOptions(nstpTypes),
    },
  ]

  if (includeAdviser) {
    groups.push({
      label: "Adviser",
      field: "adviserUserId",
      singleSelect: true,
      options: [...advisers.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    })
  }

  groups.push({
    label: "School Year",
    field: "schoolYear",
    singleSelect: true,
    options: uniqueSortedOptions(schoolYears),
  })

  return groups.filter((group) => group.options.length > 0)
}

/** AND across class dimension groups; empty groups are ignored. */
export function matchesClassDimensionFilters(
  row: ClassFilterSource,
  activeFilters: ActiveFilters
): boolean {
  const nstpSelected = activeFilters.nstpType
  if (nstpSelected?.length) {
    const rowType = resolveClassNstpType(row)
    if (!rowType || !nstpSelected.includes(rowType)) return false
  }

  const adviserSelected = activeFilters.adviserUserId
  if (adviserSelected?.length) {
    const rowAdviser = row.adviserUserId?.trim()
    if (!rowAdviser || !adviserSelected.includes(rowAdviser)) return false
  }

  const yearSelected = activeFilters.schoolYear
  if (yearSelected?.length) {
    const rowYear = row.schoolYear?.trim()
    if (!rowYear || !yearSelected.includes(rowYear)) return false
  }

  return true
}
