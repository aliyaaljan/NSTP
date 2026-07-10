import "server-only"
import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

const VERSION = 1

function getEncryptionKey(): Buffer {
  const hex = process.env.QR_ENCRYPTION_KEY
  if (!hex) throw new Error("QR_ENCRYPTION_KEY is not set")
  const buf = Buffer.from(hex, "hex")
  if (buf.length !== 32) {
    throw new Error("QR_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)")
  }
  return buf
}

export function encryptQrPayload(obj: object): string {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ct = Buffer.concat([
    cipher.update(JSON.stringify(obj), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ct]).toString(
    "base64url"
  )
}

export function decryptQrPayload(token: string): Record<string, unknown> | null {
  const key = getEncryptionKey()
  try {
    const buf = Buffer.from(token, "base64url")
    if (buf.length < 30 || buf[0] !== VERSION) return null
    const iv = buf.subarray(1, 13)
    const tag = buf.subarray(13, 29)
    const ct = buf.subarray(29)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
    return JSON.parse(plain)
  } catch {
    return null
  }
}
