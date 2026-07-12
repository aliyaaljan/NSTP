import "server-only"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const COOKIE_NAME = "nstp_device_id"
const MAX_AGE_S = 60 * 60 * 24 * 730 // ~2 years
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DeviceIdInfo = { deviceId: string; isNew: boolean }

// Long-lived per-browser identifier used by the attendance fraud-flag rules.
// Only call from Server Actions — cookies().set() throws during RSC render.
export async function getOrCreateDeviceId(): Promise<DeviceIdInfo> {
  const store = await cookies()
  const existing = store.get(COOKIE_NAME)?.value
  if (existing && UUID_RE.test(existing)) {
    return { deviceId: existing, isNew: false }
  }
  const deviceId = randomUUID()
  store.set(COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_S,
    path: "/",
  })
  return { deviceId, isNew: true }
}
