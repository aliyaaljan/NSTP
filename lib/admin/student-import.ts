/**
 * Student import contract — matches the NSTP office's real metadata export
 * (e.g. "1252_NSTP 2_Metadata.xlsx"). Client-safe module.
 *
 * Two-phase flow (implemented in lib/admin/student-list-actions.ts):
 *   1. parseStudentImport(formData) -> validated preview (no writes)
 *   2. ensureImportSection(choice) once, then commitStudentImportChunk(...)
 *      with IMPORT_CHUNK_SIZE-row slices of validRows.
 */

import type { ImportColumnSpec, RowIssue } from "@/lib/admin/import/types"
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
  // Parsed for completeness; enrollment is decided by the modal's section choice.
  { key: "facilitator", aliases: ["Facilitator"], required: false },
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
}

export type ParseStudentImportResult =
  | {
      ok: true
      totalRows: number
      validRows: StudentImportRow[]
      issues: RowIssue[]
      /** Course Code shared by every row, for prefilling the new-section form. */
      uniformCourseCode: string | null
    }
  | { ok: false; error: string }

export type StudentImportSectionChoice =
  | { kind: "existing"; sectionId: string }
  | { kind: "new"; name: string; courseCode: string; adviserUserId: string }

export type EnsureImportSectionResult =
  | { ok: true; sectionId: string }
  | { ok: false; error: string }

/** Options for the import modal's section step. */
export interface ImportPickerData {
  sections: { sectionId: string; name: string; courseCode: string }[]
  advisers: { adviserUserId: string; fullName: string }[]
}

export function validateStudentImportValues(
  values: Record<string, string>,
  rowNumber: number
): { row: StudentImportRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = []
  const fullName = (values.full_name ?? "").trim()
  const email = (values.email ?? "").trim().toLowerCase()
  const studentNumber = (values.student_number ?? "").trim()

  if (!fullName) {
    issues.push({ rowNumber, message: "Student Name is required." })
  }
  if (!email.endsWith("@up.edu.ph")) {
    issues.push({
      rowNumber,
      message: `Email "${values.email ?? ""}" must be a UP email (@up.edu.ph).`,
    })
  }
  if (!STUDENT_NUMBER_PATTERN.test(studentNumber)) {
    issues.push({
      rowNumber,
      message: `Student Number "${values.student_number ?? ""}" must be exactly 9 digits.`,
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
    },
    issues: [],
  }
}

export function deriveUniformCourseCode(rows: StudentImportRow[]): string | null {
  const codes = new Set(rows.map((row) => row.courseCode).filter(Boolean))
  return codes.size === 1 ? [...codes][0] : null
}
