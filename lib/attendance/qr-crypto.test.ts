import { randomBytes, createCipheriv } from "crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { decryptQrToken, encryptQrBinary } from "@/lib/attendance/qr-crypto"

const TEST_KEY = "a".repeat(64) // 32 bytes hex

beforeAll(() => {
  process.env.QR_ENCRYPTION_KEY = TEST_KEY
})

// Mirrors the retired v1 JSON encoder, only kept here to build a legacy
// token for the decrypt-compat test below.
function encryptLegacyJson(obj: object): string {
  const key = Buffer.from(TEST_KEY, "hex")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([1]), iv, tag, ct]).toString("base64url")
}

describe("encryptQrBinary / decryptQrToken", () => {
  it("round-trips enrollmentId, nonce, and expiry", () => {
    const payload = {
      enrollmentId: "5eed4901-0000-0000-0000-000000000000",
      nonceHex: randomBytes(32).toString("hex"),
      expiresAtMs: Math.floor(Date.now() / 1000) * 1000 + 60_000,
    }
    const token = encryptQrBinary(payload)
    const decoded = decryptQrToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded).toEqual({ v: 2, ...payload })
  })

  it("produces a short token (well under the old ~678-char JSON payload)", () => {
    const token = encryptQrBinary({
      enrollmentId: "5eed4901-0000-0000-0000-000000000000",
      nonceHex: randomBytes(32).toString("hex"),
      expiresAtMs: Date.now() + 60_000,
    })
    expect(token.length).toBeLessThan(150)
  })

  it("returns null for a tampered ciphertext", () => {
    const token = encryptQrBinary({
      enrollmentId: "5eed4901-0000-0000-0000-000000000000",
      nonceHex: randomBytes(32).toString("hex"),
      expiresAtMs: Date.now() + 60_000,
    })
    const buf = Buffer.from(token, "base64url")
    buf[buf.length - 1] ^= 0xff // flip a ciphertext byte -> GCM auth tag fails
    const tampered = buf.toString("base64url")
    expect(decryptQrToken(tampered)).toBeNull()
  })

  it("returns null for garbage input", () => {
    expect(decryptQrToken("not-a-real-token")).toBeNull()
    expect(decryptQrToken("")).toBeNull()
  })

  it("decodes a legacy v1 JSON token via the v1 branch", () => {
    const legacy = {
      enrollmentId: "5eed4901-0000-0000-0000-000000000000",
      nonce: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }
    const token = encryptLegacyJson(legacy)
    const decoded = decryptQrToken(token)
    expect(decoded).toEqual({ v: 1, legacy })
  })
})
