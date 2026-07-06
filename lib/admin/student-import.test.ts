import { describe, expect, it } from "vitest"
import {
  deriveUniformCourseCode,
  validateStudentImportValues,
  type StudentImportRow,
} from "@/lib/admin/student-import"

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
    })
  })

  it("rejects non-UP emails, bad student numbers, and missing names", () => {
    expect(
      validateStudentImportValues({ ...sampleValues, email: "x@gmail.com" }, 3).issues
    ).toHaveLength(1)
    expect(
      validateStudentImportValues({ ...sampleValues, student_number: "12345" }, 4).issues
    ).toHaveLength(1)
    expect(
      validateStudentImportValues({ ...sampleValues, full_name: "  " }, 5).issues
    ).toHaveLength(1)
    expect(validateStudentImportValues({ ...sampleValues, email: "x@gmail.com" }, 3).row).toBeNull()
  })
})

describe("deriveUniformCourseCode", () => {
  const row = (courseCode: string): StudentImportRow => ({
    rowNumber: 2,
    courseCode,
    studentNumber: "201201234",
    saisId: "",
    fullName: "X",
    email: "x@up.edu.ph",
    enlistmentStatus: "",
    program: "",
    classification: "",
  })

  it("returns the code when uniform, null when mixed or absent", () => {
    expect(deriveUniformCourseCode([row("NSTP 2 CWTS"), row("NSTP 2 CWTS")])).toBe("NSTP 2 CWTS")
    expect(deriveUniformCourseCode([row("NSTP 2 CWTS"), row("NSTP 2 LTS")])).toBeNull()
    expect(deriveUniformCourseCode([row(""), row("")])).toBeNull()
  })
})
