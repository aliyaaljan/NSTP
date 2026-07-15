import { describe, expect, it } from "vitest"
import {
  validateFullName,
  validateSaisId,
  validateStudentNumber,
  validateUpEmail,
} from "@/lib/admin/user-field-validation"

describe("user field validation", () => {
  it("enforces email and full-name limits", () => {
    expect(validateFullName("A".repeat(64))).toBeNull()
    expect(validateFullName("A".repeat(65))).toContain("64")
    expect(validateUpEmail(`${"a".repeat(54)}@up.edu.ph`)).toBeNull()
    expect(validateUpEmail(`${"a".repeat(55)}@up.edu.ph`)).toContain("64")
    expect(validateUpEmail("student@gmail.com")).toContain("@up.edu.ph")
    expect(validateUpEmail("student@gmail.com@up.edu.ph")).toContain("@up.edu.ph")
  })

  it("accepts only nine numeric characters for student IDs", () => {
    expect(validateStudentNumber("201201234")).toBeNull()
    expect(validateStudentNumber("2012-1234")).toContain("numbers only")
    expect(validateStudentNumber("12345678")).toContain("9 digits")
  })

  it("accepts only up to eight numeric characters for SAIS IDs", () => {
    expect(validateSaisId("12345678")).toBeNull()
    expect(validateSaisId("1234A678")).toContain("numbers only")
    expect(validateSaisId("123456789")).toContain("8 digits")
  })
})
