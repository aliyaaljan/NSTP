/**
 * Student import contract — matches the NSTP office's real metadata export
 * (e.g. "1252_NSTP 2_Metadata.xlsx"). Client-safe module.
 *
 * The roster has NO section column: each row names its facilitator, and a
 * facilitator handles exactly one class per term. Two-phase flow (implemented
 * in lib/admin/student-list-actions.ts):
 *   1. parseStudentImport(formData) -> validated preview (no writes); each
 *      row's Facilitator is matched to a facilitator account, and misses
 *      surface as row issues.
 *   2. commitStudentImportChunk({ rows }) with IMPORT_CHUNK_SIZE-row slices of
 *      validRows — the target section is auto-resolved per row from the
 *      matched facilitator's class in the active term.
 */

import type { ErrorRow, ImportColumnSpec, RowIssue } from "@/lib/admin/import/types"
import { STUDENT_NUMBER_PATTERN } from "@/lib/admin/student-edit"

export const STUDENT_IMPORT_COLUMNS: readonly ImportColumnSpec[] = [
  { key: "course_code", aliases: ["Course Code"], required: false },
  { key: "student_number", aliases: ["Student Number"], required: true },
  { key: "sais_id", aliases: ["SAIS ID"], required: false },
  { key: "full_name", aliases: ["Student Name"], required: true },
  { key: "email", aliases: ["Email"], required: true },
  { key: "enlistment_status", aliases: ["Enlistment Status"], required: false },
  { key: "program", aliases: ["Program"], required: false },
  { key: "classification", aliases: ["Classification"], required: false },
  // Decides the enrollment: matched by name to a facilitator account, whose
  // single active-term class is the row's section.
  { key: "facilitator", aliases: ["Facilitator"], required: true },
]

/** One validated row. Raw display values; lookups are resolved server-side at commit. */
export interface StudentImportRow {
  rowNumber: number
  courseCode: string
  studentNumber: string
  saisId: string
  /** Stored verbatim — client format is "SURNAME, First Middle". */
  fullName: string
  /** Lowercased @up.edu.ph address. */
  email: string
  enlistmentStatus: string
  program: string
  classification: string
  /** Facilitator name as written in the roster */
  facilitator: string
}

/** How a valid row's account/enrollment relates to what's on file. */
export type StudentRowKind = "new" | "update" | "returning" | "conflict"

/** Decision for a "returning" row: what to do with the prior-term active enrollment. */
export type PriorDecision = "complete" | "drop"

/** Decision for a "conflict" row: an active enrollment this term under another facilitator. */
export type ConflictDecision = "keep" | "move"

export interface PriorEnrollmentInfo {
  enrollmentId: string
  /** Derived "{courseCode} — {facilitator surname}" label of the OLD class. */
  classLabel: string
  /** term.name of the OLD enrollment's term. */
  termName: string
  /** Rounded hours (closed + corrected sessions only). */
  hoursEarned: number
  /** section.required_hour_total, defaulting to 60. */
  hoursRequired: number
  /** Pre-selected decision: "complete" when hoursEarned >= hoursRequired, else "drop". */
  suggested: PriorDecision
}

export interface ConflictInfo {
  enrollmentId: string
  currentClassLabel: string
  currentFacilitatorName: string
  /** null when the file's facilitator has no class yet ("will be created"). */
  targetClassLabel: string | null
}

export interface StudentPreviewRow {
  row: StudentImportRow
  kind: StudentRowKind
  /** Set iff kind === "returning". */
  prior?: PriorEnrollmentInfo
  /** Set iff kind === "conflict". */
  conflict?: ConflictInfo
}

/** Row sent to commitStudentImportChunk — decisions ride along with each row. */
export interface StudentCommitRow extends StudentImportRow {
  priorDecision?: PriorDecision
  conflictDecision?: ConflictDecision
}

export type ParseStudentImportResult =
  | {
    ok: true
    totalRows: number
    previewRows: StudentPreviewRow[]
    errorRows: ErrorRow[]
    issues: RowIssue[]
    facilitatorOptions: { userId: string; fullName: string }[]
  }
  | { ok: false; error: string }

export type RevalidateStudentRowsResult =
  | {
    ok: true
    previewRows: StudentPreviewRow[]
    errorRows: ErrorRow[]
    issues: RowIssue[]
  }
  | { ok: false; error: string }

/** Maps a validated row back to STUDENT_IMPORT_COLUMNS-keyed values — used to
 * reconstruct an ErrorRow (for the error-CSV export / inline fix) from a row
 * that failed for a reason discovered only after validation succeeded. */
export function studentRowToValues(row: StudentImportRow): Record<string, string> {
  return {
    course_code: row.courseCode,
    student_number: row.studentNumber,
    sais_id: row.saisId,
    full_name: row.fullName,
    email: row.email,
    enlistment_status: row.enlistmentStatus,
    program: row.program,
    classification: row.classification,
    facilitator: row.facilitator,
  }
}

/** Pre-select Complete when hours were met, Drop otherwise (met-or-exceeded counts as met). */
export function suggestedPriorDecision(
  hoursEarned: number,
  hoursRequired: number
): PriorDecision {
  return hoursEarned >= hoursRequired ? "complete" : "drop"
}

/**
 * Classify a valid row against the student's current account/enrollment state.
 * Pure — no DB access — so the same logic drives both the parse phase and the
 * commit-phase re-verification (server re-runs a version of this at commit time).
 */
export function classifyStudentRow(input: {
  accountExists: boolean
  activeEnrollment: { sectionId: string; termId: string } | null
  targetSectionId: string | null
  activeTermId: string
}): StudentRowKind {
  if (!input.accountExists || !input.activeEnrollment) return "new"
  if (input.targetSectionId && input.activeEnrollment.sectionId === input.targetSectionId) {
    return "update"
  }
  if (input.activeEnrollment.termId !== input.activeTermId) return "returning"
  return "conflict"
}

export function validateStudentImportValues(
  values: Record<string, string>,
  rowNumber: number
): { row: StudentImportRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = []
  const fullName = (values.full_name ?? "").trim()
  const email = (values.email ?? "").trim().toLowerCase()
  const studentNumber = (values.student_number ?? "").trim()
  const facilitator = (values.facilitator ?? "").trim()

  if (!fullName) {
    issues.push({
      rowNumber,
      message: "Student Name is required.",
      severity: "error",
      code: "missing_name",
      field: "full_name",
    })
  }
  if (!email.endsWith("@up.edu.ph")) {
    issues.push({
      rowNumber,
      message: `Email "${values.email ?? ""}" must be a UP email (@up.edu.ph).`,
      severity: "error",
      code: "invalid_email",
      field: "email",
    })
  }
  if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    issues.push({
      rowNumber,
      message: `Student Number "${values.student_number ?? ""}" must be exactly 9 digits.`,
      severity: "error",
      code: "invalid_student_number",
      field: "student_number",
    })
  }
  if (!facilitator) {
    issues.push({
      rowNumber,
      message: "Facilitator is required.",
      severity: "error",
      code: "missing_facilitator",
      field: "facilitator",
    })
  }
  if (issues.length > 0) return { row: null, issues }

  return {
    row: {
      rowNumber,
      courseCode: (values.course_code ?? "").trim(),
      studentNumber,
      saisId: (values.sais_id ?? "").trim(),
      fullName,
      email,
      enlistmentStatus: (values.enlistment_status ?? "").trim(),
      program: (values.program ?? "").trim(),
      classification: (values.classification ?? "").trim(),
      facilitator,
    },
    issues: [],
  }
}
