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

export type ParseStudentImportResult =
  | {
    ok: true
    totalRows: number
    validRows: StudentImportRow[]
    issues: RowIssue[]
  }
  | { ok: false; error: string }

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
  if (!facilitator) {
    issues.push({ rowNumber, message: "Facilitator is required." })
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
