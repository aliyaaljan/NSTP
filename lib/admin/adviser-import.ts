/**
 * Facilitator import contract — matches the NSTP office's real roster
 * (e.g. "1252-Facilitators.xlsx"). Client-safe module.
 *
 * Two-phase flow (implemented in lib/admin/adviser-list-actions.ts):
 *   1. parseAdviserImport(formData) -> validated preview (no writes)
 *   2. commitAdviserImportChunk({ rows }) with IMPORT_CHUNK_SIZE-row slices.
 */

import type { ImportColumnSpec, RowIssue } from "@/lib/admin/import/types"

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
  | { ok: true; totalRows: number; validRows: AdviserImportRow[]; issues: RowIssue[] }
  | { ok: false; error: string }

export function validateAdviserImportValues(
  values: Record<string, string>,
  rowNumber: number
): { row: AdviserImportRow | null; issues: RowIssue[] } {
  const issues: RowIssue[] = []
  const fullName = (values.full_name ?? "").trim()
  const email = (values.email ?? "").trim().toLowerCase()

  if (!fullName) {
    issues.push({ rowNumber, message: "Facilitator's Name is required." })
  }
  if (!email.endsWith("@up.edu.ph")) {
    issues.push({
      rowNumber,
      message: `Email "${values.email ?? ""}" must be a UP email (@up.edu.ph).`,
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
