import "server-only"
import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

const VERSION_JSON = 1   // legacy decrypt-only; remove this branch after the next deploy cycle
const VERSION_BINARY = 2

function getEncryptionKey(): Buffer {
  const hex = process.env.QR_ENCRYPTION_KEY
  if (!hex) throw new Error("QR_ENCRYPTION_KEY is not set")
  const buf = Buffer.from(hex, "hex")
  if (buf.length !== 32) {
    throw new Error("QR_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)")
  }
  return buf
}

export type QrBinaryPayload = {
  enrollmentId: string
  nonceHex: string // 64 hex chars = 32 bytes
  expiresAtMs: number
}

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ""), "hex")
}

function bytesToUuid(buf: Buffer): string {
  const h = buf.toString("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// Binary payload: enrollment UUID (16B) + nonce (32B) + expiry epoch-seconds (4B) = 52 bytes.
// This replaces the old full-metadata JSON payload (~678 chars -> V21 QR, undecodable at
// phone sizes). Metadata now lives server-side in qr_current_token.generated_meta.
export function encryptQrBinary(p: QrBinaryPayload): string {
  const key = getEncryptionKey()
  const expiry = Buffer.alloc(4)
  expiry.writeUInt32BE(Math.floor(p.expiresAtMs / 1000))
  const plain = Buffer.concat([
    uuidToBytes(p.enrollmentId),
    Buffer.from(p.nonceHex, "hex"),
    expiry,
  ])
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([VERSION_BINARY]), iv, tag, ct]).toString(
    "base64url"
  )
}

export type DecryptedQr =
  | { v: 2; enrollmentId: string; nonceHex: string; expiresAtMs: number }
  | { v: 1; legacy: Record<string, unknown> }
  | null

export function decryptQrToken(token: string): DecryptedQr {
  const key = getEncryptionKey() // outside try: config errors throw, tampering returns null
  try {
    const buf = Buffer.from(token, "base64url")
    if (buf.length < 30) return null
    const version = buf[0]
    if (version !== VERSION_JSON && version !== VERSION_BINARY) return null
    const iv = buf.subarray(1, 13)
    const tag = buf.subarray(13, 29)
    const ct = buf.subarray(29)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(ct), decipher.final()])
    if (version === VERSION_JSON) {
      return { v: 1, legacy: JSON.parse(plain.toString("utf8")) }
    }
    if (plain.length !== 52) return null
    return {
      v: 2,
      enrollmentId: bytesToUuid(plain.subarray(0, 16)),
      nonceHex: plain.subarray(16, 48).toString("hex"),
      expiresAtMs: plain.readUInt32BE(48) * 1000,
    }
  } catch {
    return null
  }
}
