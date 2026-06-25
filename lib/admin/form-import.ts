/**
 * Document import contract for the admin forms page.
 *
 * Backend devs: `importFormTemplate()` in `lib/admin/form-list-actions.ts`
 * uploads the file to the `forms` Storage bucket and inserts a `form_requirement`
 * row with `template_storage_path`, `template_file_name`, etc.
 */

export const FORM_IMPORT_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const

export const FORM_IMPORT_ACCEPT_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
].join(",")

export type ImportFormResult =
  | { ok: true; formRequirementId: string }
  | { ok: false; error: string }

export function isAcceptedFormImportFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return FORM_IMPORT_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function titleFromImportFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim()
  return base || "Imported Form"
}
