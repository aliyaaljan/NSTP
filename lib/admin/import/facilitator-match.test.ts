import { describe, expect, it } from "vitest"

import {
  matchFacilitator,
  nameTokens,
  namesMatch,
  type FacilitatorCandidate,
} from "@/lib/admin/import/facilitator-match"
import { extractSurname, formatClassLabel } from "@/lib/shared/class-label"

describe("nameTokens", () => {
  it("lowercases, strips diacritics, and splits on punctuation", () => {
    expect(nameTokens("Mascariña, José D.C.")).toEqual(["mascarina", "jose", "d", "c"])
  })

  it("splits hyphenated surnames", () => {
    expect(nameTokens("Castro-Margate, Leia")).toEqual(["castro", "margate", "leia"])
  })

  it("returns [] for blank input", () => {
    expect(nameTokens("   ")).toEqual([])
  })
})

describe("namesMatch", () => {
  it("matches 'Last, First M.' against 'First M. Last'", () => {
    expect(namesMatch("Paglingayen, Kimberly P.", "Kimberly P. Paglingayen")).toBe(true)
  })

  it("matches when one side lacks the middle initial", () => {
    expect(namesMatch("Paglingayen, Kimberly P.", "Kimberly Paglingayen")).toBe(true)
  })

  it("matches an initial against the full middle name", () => {
    expect(namesMatch("Paglingayen, Kimberly P.", "Kimberly Perez Paglingayen")).toBe(true)
  })

  it("is diacritic- and case-insensitive", () => {
    expect(namesMatch("MASCARIÑA, JERICHO C.", "Jericho C. Mascarina")).toBe(true)
  })

  it("handles multi-part names with hyphens and double initials", () => {
    expect(
      namesMatch(
        "Castro-Margate, Leia Fidelis Gisela F.",
        "Leia Fidelis Gisela F. Castro-Margate"
      )
    ).toBe(true)
  })

  it("rejects different people sharing a surname", () => {
    expect(namesMatch("Cruz, Juan", "Pedro Cruz")).toBe(false)
  })

  it("rejects conflicting middle initials", () => {
    expect(namesMatch("Cruz, Juan P.", "Juan R. Cruz")).toBe(false)
  })

  it("rejects a subset name (missing surname)", () => {
    expect(namesMatch("Kimberly", "Kimberly P. Paglingayen")).toBe(false)
  })

  it("rejects blank names", () => {
    expect(namesMatch("", "Kimberly P. Paglingayen")).toBe(false)
  })
})

describe("matchFacilitator", () => {
  const candidates: FacilitatorCandidate[] = [
    { userId: "u1", fullName: "Kimberly P. Paglingayen" },
    { userId: "u2", fullName: "Eric G. Guazon" },
    { userId: "u3", fullName: "Juan P. Cruz" },
    { userId: "u4", fullName: "Juan Cruz" },
  ]

  it("resolves a unique match", () => {
    const result = matchFacilitator("Paglingayen, Kimberly P.", candidates)
    expect(result).toEqual({ ok: true, userId: "u1" })
  })

  it("reports not_found when nobody matches", () => {
    const result = matchFacilitator("Santos, Maria", candidates)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("not_found")
  })

  it("reports ambiguous when several candidates match", () => {
    // "Cruz, Juan" matches both "Juan P. Cruz" (extra initial ignored) and "Juan Cruz".
    const result = matchFacilitator("Cruz, Juan", candidates)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe("ambiguous")
      expect(result.matches.map((m) => m.userId).sort()).toEqual(["u3", "u4"])
    }
  })
})

describe("class label helpers", () => {
  it("extracts the surname from 'Last, First M.'", () => {
    expect(extractSurname("Paglingayen, Kimberly P.")).toBe("Paglingayen")
  })

  it("extracts the surname from 'First M. Last'", () => {
    expect(extractSurname("Kimberly P. Paglingayen")).toBe("Paglingayen")
  })

  it("formats the class label", () => {
    expect(
      formatClassLabel({ courseCode: "NSTP 2 CWTS", facilitatorName: "Kimberly P. Paglingayen" })
    ).toBe("NSTP 2 CWTS — Paglingayen")
  })

  it("degrades gracefully when parts are missing", () => {
    expect(formatClassLabel({ courseCode: "NSTP 2 CWTS", facilitatorName: null })).toBe(
      "NSTP 2 CWTS"
    )
    expect(formatClassLabel({ courseCode: null, facilitatorName: null })).toBe("Unassigned class")
  })
})
