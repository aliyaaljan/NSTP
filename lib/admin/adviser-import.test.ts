import { describe, expect, it } from "vitest"
import { validateAdviserImportValues } from "@/lib/admin/adviser-import"

describe("validateAdviserImportValues", () => {
  it("accepts a real facilitator row, trimming stray whitespace", () => {
    const { row, issues } = validateAdviserImportValues(
      {
        full_name: " Leia Fidelis Gisela F. Castro-Margate",
        college: "College of Arts and Communication",
        component: "Literacy Training Service",
        partnership_type: "Environmental Protection",
        email: "LFCastromargate@up.edu.ph",
      },
      5
    )
    expect(issues).toEqual([])
    expect(row).toEqual({
      rowNumber: 5,
      fullName: "Leia Fidelis Gisela F. Castro-Margate",
      college: "College of Arts and Communication",
      component: "Literacy Training Service",
      partnershipType: "Environmental Protection",
      email: "lfcastromargate@up.edu.ph",
    })
  })

  it("rejects missing names and non-UP emails", () => {
    const nameResult = validateAdviserImportValues(
      { full_name: "", college: "", component: "", partnership_type: "", email: "a@up.edu.ph" },
      2
    )
    expect(nameResult.issues).toHaveLength(1)
    expect(nameResult.issues[0]).toMatchObject({
      severity: "error",
      code: "missing_name",
      field: "full_name",
    })
    const emailResult = validateAdviserImportValues(
      { full_name: "Ana", college: "", component: "", partnership_type: "", email: "a@gmail.com" },
      3
    )
    expect(emailResult.issues).toHaveLength(1)
    expect(emailResult.issues[0]).toMatchObject({
      severity: "error",
      code: "invalid_email",
      field: "email",
    })
  })
})
