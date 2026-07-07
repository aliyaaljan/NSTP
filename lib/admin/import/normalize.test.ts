import { describe, expect, it } from "vitest"
import { buildLookupMatcher, normalizeKey } from "@/lib/admin/import/normalize"

describe("normalizeKey", () => {
  it("lowercases and strips non-alphanumerics", () => {
    expect(normalizeKey("BSBiology")).toBe("bsbiology")
    expect(normalizeKey("BS Biology")).toBe("bsbiology")
    expect(normalizeKey("Facilitator's Name")).toBe("facilitatorsname")
    expect(normalizeKey("  SAIS ID ")).toBe("saisid")
    expect(normalizeKey("")).toBe("")
  })
})

describe("buildLookupMatcher", () => {
  const matcher = buildLookupMatcher([
    { id: "id-bsbio", code: "BSBIO", name: "BS Biology" },
    { id: "id-soph", code: "sophomore", name: "Sophomore" },
    { id: "id-enl", code: "ENLISTED", name: "Officially Enlisted" },
    { id: "id-cwts", code: "CWTS", name: "Civic Welfare Training Service" },
  ])

  it("matches by code, case-insensitively", () => {
    expect(matcher("bscs")).toBeNull()
    expect(matcher("BSBIO")).toBe("id-bsbio")
    expect(matcher("Enlisted")).toBe("id-enl")
  })

  it("matches by name with spacing/case differences", () => {
    expect(matcher("BSBiology")).toBe("id-bsbio")
    expect(matcher("Sophomore")).toBe("id-soph")
    expect(matcher("Civic Welfare Training Service")).toBe("id-cwts")
  })

  it("returns null for unknown or blank values", () => {
    expect(matcher("BS Nursing")).toBeNull()
    expect(matcher("")).toBeNull()
    expect(matcher("   ")).toBeNull()
  })
})
