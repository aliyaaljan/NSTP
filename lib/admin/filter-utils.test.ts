import { describe, expect, it } from "vitest"
import {
  buildClassDimensionFilterGroups,
  matchesClassDimensionFilters,
  toggleFilterValue,
  withoutClassDimensionFilters,
} from "@/lib/admin/filter-utils"

const sources = [
  {
    courseCode: "NSTP 2 CWTS",
    adviserUserId: "a1",
    adviserName: "Alice",
    schoolYear: "2025-2026",
  },
  {
    courseCode: "NSTP 1 LTS",
    adviserUserId: "a2",
    adviserName: "Bob",
    schoolYear: "2024-2025",
  },
  {
    courseCode: "NSTP 2 CWTS",
    adviserUserId: "a3",
    adviserName: "Cara",
    schoolYear: "2025-2026",
  },
]

describe("buildClassDimensionFilterGroups", () => {
  it("splits combined class labels into nstp type, adviser, and school year", () => {
    const groups = buildClassDimensionFilterGroups(sources)
    expect(groups.map((g) => g.field)).toEqual([
      "nstpType",
      "adviserUserId",
      "schoolYear",
    ])
    expect(groups.every((g) => g.singleSelect)).toBe(true)
    expect(groups.find((g) => g.field === "nstpType")?.options.map((o) => o.value)).toEqual([
      "CWTS",
      "LTS",
    ])
    expect(groups.find((g) => g.field === "schoolYear")?.options.map((o) => o.value)).toEqual([
      "2024-2025",
      "2025-2026",
    ])
  })

  it("can omit the adviser group", () => {
    const groups = buildClassDimensionFilterGroups(sources, { includeAdviser: false })
    expect(groups.map((g) => g.field)).toEqual(["nstpType", "schoolYear"])
  })
})

describe("toggleFilterValue singleSelect", () => {
  it("keeps one value per field", () => {
    const once = toggleFilterValue({}, "nstpType", "CWTS", true)
    expect(once).toEqual({ nstpType: ["CWTS"] })
    const swapped = toggleFilterValue(once, "nstpType", "LTS", true)
    expect(swapped).toEqual({ nstpType: ["LTS"] })
  })
})

describe("matchesClassDimensionFilters", () => {
  it("ANDs across categories", () => {
    const row = sources[0]
    expect(
      matchesClassDimensionFilters(row, {
        nstpType: ["CWTS"],
        adviserUserId: ["a1"],
        schoolYear: ["2025-2026"],
      })
    ).toBe(true)
    expect(
      matchesClassDimensionFilters(row, {
        nstpType: ["LTS"],
        adviserUserId: ["a1"],
      })
    ).toBe(false)
  })
})

describe("withoutClassDimensionFilters", () => {
  it("preserves non-class fields", () => {
    expect(
      withoutClassDimensionFilters({
        progressStatus: ["on_track"],
        nstpType: ["CWTS"],
        adviserUserId: ["a1"],
        schoolYear: ["2025-2026"],
      })
    ).toEqual({ progressStatus: ["on_track"] })
  })
})
