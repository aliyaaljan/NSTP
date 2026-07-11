/**
 * Shared types for the admin CSV/XLSX import pipeline.
 * Client-safe: imported by both server actions and the import modal.
 */

export type IssueSeverity = "error" | "warning" | "info"

/** A per-row problem. rowNumber is the spreadsheet row (header = 1, first data row = 2). */
export interface RowIssue {
  rowNumber: number
  message: string
  severity: IssueSeverity
  /** Machine code for grouping — see ISSUE_TITLES keys. */
  code: string
  /** Import-column key the issue is about; enables inline fixing in the preview UI. */
  field?: "email" | "student_number" | "full_name" | "facilitator"
}

/** Group headers for the issues panel. Every emitted code should have an entry. */
export const ISSUE_TITLES: Record<string, string> = {
  missing_name: "Name is missing",
  invalid_email: "Invalid email",
  invalid_student_number: "Invalid student number",
  missing_facilitator: "Facilitator is missing",
  facilitator_not_found: "Facilitator not found",
  facilitator_ambiguous: "Facilitator name is ambiguous",
  non_student_account: "Email belongs to a non-student account",
  duplicate_email_in_file: "Duplicate email in this file",
  unknown_program: "Unknown program",
  unknown_classification: "Unknown classification",
  unknown_enlistment_status: "Unknown enlistment status",
  unknown_college: "Unknown college",
  unknown_component: "Unknown component",
  course_code_mismatch: "Course code differs from the class",
  needs_decision: "Previous enrollment needs a decision",
  prior_closed: "Previous enrollment closed out",
  reactivated: "Previous enrollment re-activated",
  moved_section: "Moved to this class",
  kept_current: "Kept with current facilitator",
  conflict_move_blocked: "Could not move student",
  enroll_failed: "Enrollment failed",
  profile_update_failed: "Profile update failed",
  account_create_failed: "Account creation failed",
  role_promoted: "Promoted to facilitator",
  role_promotion_audit_failed: "Promotion audit note failed",
  class_provision_failed: "Class could not be created",
}

export function countBySeverity(issues: RowIssue[]): Record<IssueSeverity, number> {
  const counts: Record<IssueSeverity, number> = { error: 0, warning: 0, info: 0 }
  for (const issue of issues) counts[issue.severity] += 1
  return counts
}

export interface ImportCommitResult {
  imported: number
  updated: number
  skipped: number
  issues: RowIssue[]
}

/** Original mapped cell values of a row that failed validation/matching — powers the
 * error-CSV export and inline-fix editors in the preview UI. */
export interface ErrorRow {
  rowNumber: number
  values: Record<string, string>
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
