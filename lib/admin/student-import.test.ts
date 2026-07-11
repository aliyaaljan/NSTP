import { describe, expect, it } from "vitest"
import {
  classifyStudentRow,
  suggestedPriorDecision,
  validateStudentImportValues,
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
      facilitator: "Paglingayen, Kimberly P.",
    })
  })

  it("rejects non-UP emails, bad student numbers, missing names, and missing facilitator", () => {
    const emailResult = validateStudentImportValues({ ...sampleValues, email: "x@gmail.com" }, 3)
    expect(emailResult.issues).toHaveLength(1)
    expect(emailResult.issues[0]).toMatchObject({
      severity: "error",
      code: "invalid_email",
      field: "email",
    })
    expect(
      validateStudentImportValues({ ...sampleValues, student_number: "12345" }, 4).issues[0]
    ).toMatchObject({ severity: "error", code: "invalid_student_number", field: "student_number" })
    expect(
      validateStudentImportValues({ ...sampleValues, full_name: "  " }, 5).issues[0]
    ).toMatchObject({ severity: "error", code: "missing_name", field: "full_name" })
    expect(
      validateStudentImportValues({ ...sampleValues, facilitator: "  " }, 6).issues[0]
    ).toMatchObject({ severity: "error", code: "missing_facilitator", field: "facilitator" })
    expect(emailResult.row).toBeNull()
  })
})

describe("suggestedPriorDecision", () => {
  it("suggests complete when hours were met or exceeded", () => {
    expect(suggestedPriorDecision(60, 60)).toBe("complete")
    expect(suggestedPriorDecision(75, 60)).toBe("complete")
  })

  it("suggests drop when hours fell short", () => {
    expect(suggestedPriorDecision(59, 60)).toBe("drop")
    expect(suggestedPriorDecision(0, 60)).toBe("drop")
  })
})

describe("classifyStudentRow", () => {
  const activeTermId = "term-active"
  const targetSectionId = "section-target"

  it("classifies a brand-new account as new", () => {
    expect(
      classifyStudentRow({
        accountExists: false,
        activeEnrollment: null,
        targetSectionId,
        activeTermId,
      })
    ).toBe("new")
  })

  it("classifies an existing account with no active enrollment as new", () => {
    expect(
      classifyStudentRow({
        accountExists: true,
        activeEnrollment: null,
        targetSectionId,
        activeTermId,
      })
    ).toBe("new")
  })

  it("classifies an active enrollment already in the target section as update", () => {
    expect(
      classifyStudentRow({
        accountExists: true,
        activeEnrollment: { sectionId: targetSectionId, termId: activeTermId },
        targetSectionId,
        activeTermId,
      })
    ).toBe("update")
  })

  it("classifies an active enrollment in a prior term as returning", () => {
    expect(
      classifyStudentRow({
        accountExists: true,
        activeEnrollment: { sectionId: "section-old", termId: "term-prior" },
        targetSectionId,
        activeTermId,
      })
    ).toBe("returning")
  })

  it("classifies an active enrollment this term under another facilitator as conflict", () => {
    expect(
      classifyStudentRow({
        accountExists: true,
        activeEnrollment: { sectionId: "section-other", termId: activeTermId },
        targetSectionId,
        activeTermId,
      })
    ).toBe("conflict")
  })

  it("classifies as conflict when the target facilitator has no class yet", () => {
    expect(
      classifyStudentRow({
        accountExists: true,
        activeEnrollment: { sectionId: "section-other", termId: activeTermId },
        targetSectionId: null,
        activeTermId,
      })
    ).toBe("conflict")
  })
})
