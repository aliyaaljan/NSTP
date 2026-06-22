/**
 * CSV import contract for admin adviser list.
 *
 * Backend devs: parse uploaded CSV into `AdviserCsvImportRow[]`, then upsert
 * `app_user` (role = adviser) and assign `section.adviser_user_id` in
 * `importAdvisersFromCsv`.
 */

export const ADVISER_CSV_COLUMNS = [
  "email",
  "full_name",
  "section_name",
] as const

export type AdviserCsvColumn = (typeof ADVISER_CSV_COLUMNS)[number]

/** One row from the import CSV after parsing. */
export interface AdviserCsvImportRow {
  email: string
  full_name: string
  /** Matches `section.name` for the active term. */
  section_name: string
}

export type ImportAdvisersResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string }
