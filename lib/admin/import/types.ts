/**
 * Shared types for the admin CSV/XLSX import pipeline.
 * Client-safe: imported by both server actions and the import modal.
 */

/** A per-row problem. rowNumber is the spreadsheet row (header = 1, first data row = 2). */
export interface RowIssue {
  rowNumber: number
  message: string
}

export interface ImportCommitResult {
  imported: number
  updated: number
  skipped: number
  issues: RowIssue[]
}

/** Column declaration for header mapping (see lib/admin/import/parse.ts). */
export interface ImportColumnSpec {
  key: string
  aliases: readonly string[]
  required: boolean
}

/** Rows sent per commit call. Keeps each server action well under timeout. */
export const IMPORT_CHUNK_SIZE = 25

export const IMPORT_ACCEPTED_EXTENSIONS = [".csv", ".xlsx"] as const

export const IMPORT_ACCEPT =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export function isAcceptedImportFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return IMPORT_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export function emptyCommitResult(): ImportCommitResult {
  return { imported: 0, updated: 0, skipped: 0, issues: [] }
}

export function addCommitResults(
  a: ImportCommitResult,
  b: ImportCommitResult
): ImportCommitResult {
  return {
    imported: a.imported + b.imported,
    updated: a.updated + b.updated,
    skipped: a.skipped + b.skipped,
    issues: [...a.issues, ...b.issues],
  }
}
