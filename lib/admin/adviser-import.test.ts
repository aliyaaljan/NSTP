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
    expect(
      validateAdviserImportValues(
        { full_name: "", college: "", component: "", partnership_type: "", email: "a@up.edu.ph" },
        2
      ).issues
    ).toHaveLength(1)
    expect(
      validateAdviserImportValues(
        { full_name: "Ana", college: "", component: "", partnership_type: "", email: "a@gmail.com" },
        3
      ).issues
    ).toHaveLength(1)
  })
})
