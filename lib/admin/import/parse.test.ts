import ExcelJS from "exceljs"
import { describe, expect, it } from "vitest"
import { mapRows, parseCsv, parseImportFile } from "@/lib/admin/import/parse"
import type { ImportColumnSpec } from "@/lib/admin/import/types"

async function xlsxFile(rows: (string | null)[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Sheet1")
  rows.forEach((row) => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer as ArrayBuffer], "test.xlsx")
}

describe("parseCsv", () => {
  it("parses plain rows", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([["a", "b"], ["1", "2"]])
  })

  it("handles quoted fields with commas, escaped quotes, and newlines", () => {
    expect(parseCsv('name,note\n"SANTOS, MARIA","says ""hi""\nsecond line"')).toEqual([
      ["name", "note"],
      ['SANTOS, MARIA', 'says "hi"\nsecond line'],
    ])
  })

  it("handles CRLF and a UTF-8 BOM", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]])
  })
})

describe("parseImportFile", () => {
  it("parses a CSV File into headers and trimmed, numbered rows", async () => {
    const file = new File(["Email , Name\n a@up.edu.ph , Ana \n\n"], "roster.csv")
    const table = await parseImportFile(file)
    expect(table.headers).toEqual(["Email", "Name"])
    expect(table.rows).toEqual([{ rowNumber: 2, cells: ["a@up.edu.ph", "Ana"] }])
  })

  it("parses an XLSX File and skips fully blank rows", async () => {
    const file = await xlsxFile([
      ["Email", "Name"],
      ["a@up.edu.ph", "Ana"],
      [null, null],
      ["b@up.edu.ph", "Ben"],
    ])
    const table = await parseImportFile(file)
    expect(table.headers).toEqual(["Email", "Name"])
    expect(table.rows.map((r) => r.rowNumber)).toEqual([2, 4])
    expect(table.rows[1].cells).toEqual(["b@up.edu.ph", "Ben"])
  })

  it("rejects unsupported extensions", async () => {
    await expect(parseImportFile(new File(["x"], "roster.txt"))).rejects.toThrow(
      /csv and \.xlsx/i
    )
  })
})

describe("mapRows", () => {
  const spec: readonly ImportColumnSpec[] = [
    { key: "full_name", aliases: ["Facilitator's Name"], required: true },
    { key: "email", aliases: ["Email"], required: true },
    { key: "college", aliases: ["College"], required: false },
  ]

  it("maps headers case- and punctuation-insensitively", () => {
    const table = {
      headers: ["FACILITATORS NAME", "email", "College", ""],
      rows: [{ rowNumber: 2, cells: ["Ana Cruz", "ac@up.edu.ph", "College of Science", "junk"] }],
    }
    const { rows, missingHeaders } = mapRows(table, spec)
    expect(missingHeaders).toEqual([])
    expect(rows).toEqual([
      {
        rowNumber: 2,
        values: { full_name: "Ana Cruz", email: "ac@up.edu.ph", college: "College of Science" },
      },
    ])
  })

  it("reports missing required headers and fills absent optional columns with empty strings", () => {
    const missing = mapRows({ headers: ["Email"], rows: [] }, spec)
    expect(missing.missingHeaders).toEqual(["Facilitator's Name"])

    const optional = mapRows(
      { headers: ["Facilitator's Name", "Email"], rows: [{ rowNumber: 2, cells: ["Ana", "a@up.edu.ph"] }] },
      spec
    )
    expect(optional.rows[0].values.college).toBe("")
  })
})
