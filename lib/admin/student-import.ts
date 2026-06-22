/**
 * CSV import contract for admin student list.
 *
 * Backend devs: parse uploaded CSV into `StudentCsvImportRow[]`, then upsert
 * `app_user` and `enrollment` for the active term in `importStudentsFromCsv`.
 */

export const STUDENT_CSV_COLUMNS = [
  "student_number",
  "email",
  "full_name",
  "section_name",
] as const

export type StudentCsvColumn = (typeof STUDENT_CSV_COLUMNS)[number]

/** One row from the import CSV after parsing. */
export interface StudentCsvImportRow {
  student_number: string
  email: string
  full_name: string
  /** Matches `section.name` for the active term. */
  section_name: string
  program?: string
  classification?: string
  enlistment_status?: string
}

export type ImportStudentsResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string }
