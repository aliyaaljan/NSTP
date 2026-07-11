/**
 * Client-side CSV export of failed import rows — original columns plus a
 * trailing "Error" column, so the office can fix rows in Excel and re-import
 * just that file. No server round-trip: rows are already client-held.
 */
import type { ErrorRow, ImportColumnSpec } from "@/lib/admin/import/types"

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** RFC-4180 CSV, UTF-8 BOM-prefixed for Excel. Headers = each column's primary
 * alias, in column order, plus a trailing "Error" column joining messages. */
export function buildErrorCsv(
  columns: readonly ImportColumnSpec[],
  rows: ErrorRow[]
): string {
  const headers = [...columns.map((c) => c.aliases[0]), "Error"]
  const lines = [headers.map(csvField).join(",")]

  for (const row of rows) {
    const cells = columns.map((c) => csvField(row.values[c.key] ?? ""))
    const errorText = row.issues.map((i) => i.message).join("; ")
    cells.push(csvField(errorText))
    lines.push(cells.join(","))
  }

  return String.fromCharCode(0xfeff) + lines.join("\r\n")
}
