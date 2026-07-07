export function nameTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function namesMatch(a: string, b: string): boolean {
  const aTokens = nameTokens(a)
  const bTokens = nameTokens(b)
  if (aTokens.length === 0 || bTokens.length === 0) return false

  const aUsed = aTokens.map(() => false)
  const bUsed = bTokens.map(() => false)

  const isInitial = (t: string) => t.length === 1

  // Pass 1: exact full-token pairs.
  for (let i = 0; i < aTokens.length; i++) {
    if (isInitial(aTokens[i])) continue
    const j = bTokens.findIndex((t, k) => !bUsed[k] && !isInitial(t) && t === aTokens[i])
    if (j !== -1) {
      aUsed[i] = true
      bUsed[j] = true
    }
  }

  // Pass 2: leftover full tokens consume an initial with the same first letter.
  for (let i = 0; i < aTokens.length; i++) {
    if (aUsed[i] || isInitial(aTokens[i])) continue
    const j = bTokens.findIndex((t, k) => !bUsed[k] && isInitial(t) && t === aTokens[i][0])
    if (j !== -1) {
      aUsed[i] = true
      bUsed[j] = true
    }
  }
  for (let j = 0; j < bTokens.length; j++) {
    if (bUsed[j] || isInitial(bTokens[j])) continue
    const i = aTokens.findIndex((t, k) => !aUsed[k] && isInitial(t) && t === bTokens[j][0])
    if (i !== -1) {
      aUsed[i] = true
      bUsed[j] = true
    }
  }

  // Any leftover full token → different names.
  if (aTokens.some((t, i) => !aUsed[i] && !isInitial(t))) return false
  if (bTokens.some((t, j) => !bUsed[j] && !isInitial(t))) return false

  // Pass 3: pair leftover initials by letter.
  for (let i = 0; i < aTokens.length; i++) {
    if (aUsed[i]) continue
    const j = bTokens.findIndex((t, k) => !bUsed[k] && t === aTokens[i])
    if (j !== -1) {
      aUsed[i] = true
      bUsed[j] = true
    }
  }

  // Leftover initials on both sides (e.g. "Juan P. Cruz" vs "Juan R. Cruz") → differ.
  const aLeft = aTokens.some((_, i) => !aUsed[i])
  const bLeft = bTokens.some((_, j) => !bUsed[j])
  return !(aLeft && bLeft)
}

export interface FacilitatorCandidate {
  userId: string
  fullName: string
}

export type FacilitatorMatch =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "ambiguous"; matches: FacilitatorCandidate[] }

/** Resolve a roster "Facilitator" value against facilitator accounts. */
export function matchFacilitator(
  rawName: string,
  candidates: FacilitatorCandidate[]
): FacilitatorMatch {
  const matches = candidates.filter((c) => namesMatch(rawName, c.fullName))
  if (matches.length === 1) return { ok: true, userId: matches[0].userId }
  return {
    ok: false,
    reason: matches.length === 0 ? "not_found" : "ambiguous",
    matches,
  }
}
