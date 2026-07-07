import { describe, expect, it } from "vitest"
import { validateStudentImportValues } from "@/lib/admin/student-import"

const sampleValues = {
  course_code: "NSTP 2 CWTS",
  student_number: "201201234",
  sais_id: "1007569",
  full_name: "SANTOS, MARIA TRAVERTINE XYZ",
  email: "Mxsantos@up.edu.ph",
  enlistment_status: "Enlisted",
  program: "BSBiology",
  classification: "Sophomore",
  facilitator: "Paglingayen, Kimberly P.",
}

describe("validateStudentImportValues", () => {
  it("accepts the real client sample row, lowercasing the email", () => {
    const { row, issues } = validateStudentImportValues(sampleValues, 2)
    expect(issues).toEqual([])
    expect(row).toEqual({
      rowNumber: 2,
      courseCode: "NSTP 2 CWTS",
      studentNumber: "201201234",
      saisId: "1007569",
      fullName: "SANTOS, MARIA TRAVERTINE XYZ",
      email: "mxsantos@up.edu.ph",
      enlistmentStatus: "Enlisted",
      program: "BSBiology",
      classification: "Sophomore",
      facilitator: "Paglingayen, Kimberly P.",
    })
  })

  it("rejects non-UP emails, bad student numbers, missing names, and missing facilitator", () => {
    expect(
      validateStudentImportValues({ ...sampleValues, email: "x@gmail.com" }, 3).issues
    ).toHaveLength(1)
    expect(
      validateStudentImportValues({ ...sampleValues, student_number: "12345" }, 4).issues
    ).toHaveLength(1)
    expect(
      validateStudentImportValues({ ...sampleValues, full_name: "  " }, 5).issues
    ).toHaveLength(1)
    expect(
      validateStudentImportValues({ ...sampleValues, facilitator: "  " }, 6).issues
    ).toHaveLength(1)
    expect(validateStudentImportValues({ ...sampleValues, email: "x@gmail.com" }, 3).row).toBeNull()
  })
})
