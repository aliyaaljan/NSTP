import "server-only"
import ExcelJS from "exceljs"
import { normalizeKey } from "@/lib/admin/import/normalize"
import type { ImportColumnSpec } from "@/lib/admin/import/types"

export interface ParsedTable {
  headers: string[]
  rows: { rowNumber: number; cells: string[] }[]
}

export interface MappedRow {
  rowNumber: number
  values: Record<string, string>
}

/** Minimal RFC-4180 CSV parser: quoted fields, embedded commas/newlines, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ",") {
      row.push(field)
      field = ""
      i += 1
      continue
    }
    if (ch === "\r") {
      i += 1
      continue
    }
    if (ch === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i += 1
      continue
    }
    field += ch
    i += 1
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("")
    if ("text" in value) return String(value.text)
    if ("result" in value) {
      // Formula `result` is string | number | Date | { error } — not full CellValue.
      const result = value.result
      if (result == null) return ""
      if (result instanceof Date) return result.toISOString()
      if (typeof result === "object") return ""
      return String(result)
    }
    if ("error" in value) return ""
  }
  return String(value)
}

async function parseXlsx(file: File): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) return []

  const grid: string[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: string[] = []
    for (let col = 1; col <= sheet.columnCount; col += 1) {
      cells.push(cellToString(row.getCell(col).value))
    }
    grid[rowNumber - 1] = cells
  })
  // eachRow skips leading empty rows; fill any holes so indexes stay aligned.
  for (let r = 0; r < grid.length; r += 1) {
    if (!grid[r]) grid[r] = []
  }
  return grid
}

/**
 * Parse a .csv or .xlsx upload. Row 1 is the header row; fully blank data rows
 * are dropped. All cells are trimmed strings. Throws Error with a user-safe
 * message for unsupported/corrupt files.
 */
export async function parseImportFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase()
  let grid: string[][]
  if (name.endsWith(".csv")) {
    grid = parseCsv(await file.text())
  } else if (name.endsWith(".xlsx")) {
    try {
      grid = await parseXlsx(file)
    } catch (error) {
      console.error("[parseImportFile] xlsx load failed", error)
      throw new Error("Could not read the .xlsx file. Re-save it in Excel/Sheets and try again.")
    }
  } else {
    throw new Error("Only .csv and .xlsx files are accepted.")
  }

  const [headerRow, ...dataRows] = grid
  const headers = (headerRow ?? []).map((h) => h.trim())
  const rows = dataRows
    .map((cells, index) => ({
      rowNumber: index + 2,
      cells: (cells ?? []).map((cell) => cell.trim()),
    }))
    .filter((row) => row.cells.some((cell) => cell !== ""))
  return { headers, rows }
}

/**
 * Resolve spreadsheet columns to spec keys. Header matching is case- and
 * punctuation-insensitive. Missing required headers abort (missingHeaders
 * lists their primary alias); absent optional columns yield "".
 */
export function mapRows(
  table: ParsedTable,
  spec: readonly ImportColumnSpec[]
): { rows: MappedRow[]; missingHeaders: string[] } {
  const headerIndex = new Map<string, number>()
  table.headers.forEach((header, index) => {
    const key = normalizeKey(header)
    if (key && !headerIndex.has(key)) headerIndex.set(key, index)
  })

  const columnIndex = new Map<string, number>()
  const missingHeaders: string[] = []
  for (const column of spec) {
    const index = column.aliases
      .map((alias) => headerIndex.get(normalizeKey(alias)))
      .find((value) => value !== undefined)
    if (index !== undefined) columnIndex.set(column.key, index)
    else if (column.required) missingHeaders.push(column.aliases[0])
  }
  if (missingHeaders.length > 0) return { rows: [], missingHeaders }

  const rows = table.rows.map(({ rowNumber, cells }) => {
    const values: Record<string, string> = {}
    for (const column of spec) {
      const index = columnIndex.get(column.key)
      values[column.key] = index === undefined ? "" : (cells[index] ?? "")
    }
    return { rowNumber, values }
  })
  return { rows, missingHeaders: [] }
}
