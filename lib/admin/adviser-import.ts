/**
 * Facilitator import contract — matches the NSTP office's real roster
 * (e.g. "1252-Facilitators.xlsx"). Client-safe module.
 *
 * Two-phase flow (implemented in lib/admin/adviser-list-actions.ts):
 *   1. parseAdviserImport(formData) -> validated preview (no writes)
 *   2. commitAdviserImportChunk({ rows }) with IMPORT_CHUNK_SIZE-row slices.
 */

import type { ErrorRow, ImportColumnSpec, RowIssue } from "@/lib/admin/import/types"
import {
  validateFullName,
  validateUpEmail,
} from "@/lib/admin/user-field-validation"

export const ADVISER_IMPORT_COLUMNS: readonly ImportColumnSpec[] = [
  { key: "full_name", aliases: ["Facilitator's Name"], required: true },
  { key: "college", aliases: ["College"], required: false },
  { key: "component", aliases: ["Component"], required: false },
  { key: "partnership_type", aliases: ["Partnership Type"], required: false },
  { key: "email", aliases: ["Email"], required: true },
]

/** One validated row. Raw display values; lookups are resolved server-side at commit. */
export interface AdviserImportRow {
  rowNumber: number
  fullName: string
  college: string
  component: string
  partnershipType: string
  /** Lowercased @up.edu.ph address. */
  email: string
}

export type ParseAdviserImportResult =
  | {
    ok: true
    totalRows: number
    validRows: AdviserImportRow[]
    errorRows: ErrorRow[]
    issues: RowIssue[]
  }
  | { ok: false; error: string }

export type RevalidateAdviserRowsResult =
  | { ok: true; validRows: AdviserImportRow[]; errorRows: ErrorRow[]; issues: RowIssue[] }
  | { ok: false; error: string }

export function adviserRowToValues(row: AdviserImportRow): Record<string, string> {
  return {
    full_name: row.fullName,
    college: row.college,
    component: row.component,
    partnership_type: row.partnershipType,
    email: row.email,
  }
}

export function validateAdviserImportValues(
  values: Record<string, string>,
  rowNumber: number
): { row: AdviserImportRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = []
  const fullName = (values.full_name ?? "").trim()
  const email = (values.email ?? "").trim().toLowerCase()

  const nameError = validateFullName(fullName)
  if (nameError) {
    issues.push({
      rowNumber,
      message: nameError,
      severity: "error",
      code: fullName ? "invalid_name" : "missing_name",
      field: "full_name",
    })
  }
  const emailError = validateUpEmail(email)
  if (emailError) {
    issues.push({
      rowNumber,
      message: emailError,
      severity: "error",
      code: "invalid_email",
      field: "email",
    })
  }
  if (issues.length > 0) return { row: null, issues }

  return {
    row: {
      rowNumber,
      fullName,
      college: (values.college ?? "").trim(),
      component: (values.component ?? "").trim(),
      partnershipType: (values.partnership_type ?? "").trim(),
      email,
    },
    issues: [],
  }
}
