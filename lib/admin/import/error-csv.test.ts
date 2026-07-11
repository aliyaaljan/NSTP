import { describe, expect, it } from "vitest"
import { buildErrorCsv } from "@/lib/admin/import/error-csv"
import { STUDENT_IMPORT_COLUMNS } from "@/lib/admin/student-import"
import type { ErrorRow } from "@/lib/admin/import/types"

describe("buildErrorCsv", () => {
  it("prefixes a BOM and writes headers in column order plus a trailing Error column", () => {
    const csv = buildErrorCsv(STUDENT_IMPORT_COLUMNS, [])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const headerLine = csv.slice(1).split("\r\n")[0]
    expect(headerLine).toBe(
      "Course Code,Student Number,SAIS ID,Student Name,Email,Enlistment Status,Program,Classification,Facilitator,Error"
    )
  })

  it("writes row values in column order and joins issue messages with '; '", () => {
    const rows: ErrorRow[] = [
      {
        rowNumber: 3,
        values: {
          course_code: "NSTP 2 CWTS",
          student_number: "12345",
          sais_id: "",
          full_name: "SANTOS, MARIA",
          email: "x@gmail.com",
          enlistment_status: "",
          program: "",
          classification: "",
          facilitator: "",
        },
        issues: [
          { rowNumber: 3, message: "Bad email.", severity: "error", code: "invalid_email" },
          { rowNumber: 3, message: "Bad student number.", severity: "error", code: "invalid_student_number" },
        ],
      },
    ]
    const csv = buildErrorCsv(STUDENT_IMPORT_COLUMNS, rows)
    const dataLine = csv.slice(1).split("\r\n")[1]
    expect(dataLine).toBe(
      'NSTP 2 CWTS,12345,,"SANTOS, MARIA",x@gmail.com,,,,,Bad email.; Bad student number.'
    )
  })

  it("quotes fields containing commas, quotes, or newlines and doubles embedded quotes", () => {
    const rows: ErrorRow[] = [
      {
        rowNumber: 2,
        values: {
          course_code: "",
          student_number: "",
          sais_id: "",
          full_name: 'Cruz, "Ana"',
          email: "line1\nline2",
          enlistment_status: "",
          program: "",
          classification: "",
          facilitator: "",
        },
        issues: [],
      },
    ]
    const csv = buildErrorCsv(STUDENT_IMPORT_COLUMNS, rows)
    const dataLine = csv.slice(1).split("\r\n")[1]
    expect(dataLine).toContain('"Cruz, ""Ana"""')
    expect(dataLine).toContain('"line1\nline2"')
  })
})
