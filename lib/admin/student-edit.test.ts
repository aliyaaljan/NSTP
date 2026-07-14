import { describe, expect, it } from "vitest"
import { normalizeStudentFullName } from "@/lib/admin/student-edit"

describe("normalizeStudentFullName", () => {
  it("strips the comma from the standard roster format", () => {
    expect(normalizeStudentFullName("DELA CRUZ, JUAN MIGUEL")).toBe("DELA CRUZ JUAN MIGUEL")
  })

  it("handles a comma with no following space", () => {
    expect(normalizeStudentFullName("DELA CRUZ,JUAN MIGUEL")).toBe("DELA CRUZ JUAN MIGUEL")
  })

  it("keeps periods on initials", () => {
    expect(normalizeStudentFullName("GARCIA, PAOLO R.")).toBe("GARCIA PAOLO R.")
  })

  it("keeps hyphenated surnames intact", () => {
    expect(normalizeStudentFullName("CASTRO-MARGATE, LEIA FIDELIS")).toBe(
      "CASTRO-MARGATE LEIA FIDELIS"
    )
  })

  it("collapses multiple/trailing commas", () => {
    expect(normalizeStudentFullName("DELA CRUZ,, JUAN,")).toBe("DELA CRUZ JUAN")
  })

  it("collapses extra internal whitespace", () => {
    expect(normalizeStudentFullName("DELA CRUZ,   JUAN   MIGUEL")).toBe("DELA CRUZ JUAN MIGUEL")
  })

  it("passes through names with no comma unchanged", () => {
    expect(normalizeStudentFullName("DELA CRUZ JUAN MIGUEL")).toBe("DELA CRUZ JUAN MIGUEL")
  })

  it("returns an empty string for empty or comma-only input", () => {
    expect(normalizeStudentFullName("")).toBe("")
    expect(normalizeStudentFullName(",")).toBe("")
    expect(normalizeStudentFullName("  ,  ")).toBe("")
  })
})
