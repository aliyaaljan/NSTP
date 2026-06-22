/**
 * Export Analytics — shared contract for the admin dashboard export modal.
 *
 * Backend devs: implement `exportDashboardAnalytics` in
 * `lib/admin/export-analytics-actions.ts`. The UI submits an
 * `ExportAnalyticsRequest`; return a download URL or file bytes when ready.
 */

export type ExportFileType = "pdf" | "csv" | "xlsx"

export type ExportContentType =
  | "all"
  | "stats"
  | "sections"
  | "at_risk"
  | "advisers"
  | "activity"

/** Sentinel value used in the section `<select>` for "all sections". */
export const EXPORT_ALL_SECTIONS_VALUE = "all"

export interface ExportSectionOption {
  /** UUID from `section.section_id`. Use EXPORT_ALL_SECTIONS_VALUE for all. */
  sectionId: string
  name: string
}

export interface ExportAnalyticsRequest {
  fileType: ExportFileType
  /** `null` = all sections; otherwise a `section.section_id` UUID. */
  sectionId: string | null
  content: ExportContentType
}

export type ExportAnalyticsResult =
  | { ok: true; downloadUrl: string; fileName: string }
  | { ok: false; error: string }

export const EXPORT_FILE_TYPE_OPTIONS: ReadonlyArray<{
  value: ExportFileType
  label: string
}> = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (.xlsx)" },
]

export const EXPORT_CONTENT_OPTIONS: ReadonlyArray<{
  value: ExportContentType
  label: string
}> = [
  { value: "all", label: "All Analytics" },
  { value: "stats", label: "Dashboard Statistics" },
  { value: "sections", label: "Hours Completion by Section" },
  { value: "at_risk", label: "At-Risk Students" },
  { value: "advisers", label: "Adviser Workload" },
  { value: "activity", label: "Recent Activity" },
]

export function buildExportAnalyticsRequest(input: {
  fileType: string
  sectionId: string
  content: string
}): ExportAnalyticsRequest | null {
  const fileType = EXPORT_FILE_TYPE_OPTIONS.find((o) => o.value === input.fileType)?.value
  const content = EXPORT_CONTENT_OPTIONS.find((o) => o.value === input.content)?.value
  if (!fileType || !content || !input.sectionId) return null

  const sectionId =
    input.sectionId === EXPORT_ALL_SECTIONS_VALUE ? null : input.sectionId

  return { fileType, sectionId, content }
}
