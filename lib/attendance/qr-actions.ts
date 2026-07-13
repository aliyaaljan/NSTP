"use server"

import { randomBytes } from "crypto"
import { headers } from "next/headers"
import { after } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { parseUserAgent } from "@/lib/user-agent"
import { encryptQrBinary, decryptQrToken, type DecryptedQr } from "@/lib/attendance/qr-crypto"
import { lookupId } from "@/lib/lookups"
import { getOrCreateDeviceId } from "@/lib/attendance/device-id"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QrDisplayInfo = {
  generatedAt: string
  expiresAt: string
  latitude: number
  longitude: number
}

export type ScanMeta = {
  latitude?: number | null
  longitude?: number | null
  accuracy_meter?: number | null
}

export type AttendanceResult = {
  event_type: "time_in" | "time_out"
  session_id: string
  effective_at: string
}

export type GeoInput = {
  latitude: number
  longitude: number
  accuracy_meter: number
}

export type ScanErrorCode =
  | "not_authenticated"
  | "invalid"
  | "expired"
  | "not_found"
  | "unauthorized"
  | "already_open"
  | "replay"
  | "unknown"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getRequestClientMeta() {
  const h = await headers()
  const ua = h.get("user-agent")
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  const { device_type, browser, os } = parseUserAgent(ua)
  return { device_type, browser, os, ip_address: ip }
}

async function buildScannerMeta(geo?: ScanMeta) {
  const dev = await getOrCreateDeviceId()
  return {
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    accuracy_meter: geo?.accuracy_meter ?? null,
    device_id: dev.deviceId,
    device_id_is_new: dev.isNew,
    ...(await getRequestClientMeta()),
  }
}

// ---------------------------------------------------------------------------
// generateQrToken
// Called by the student on their attendance page.
// Requires the student's geolocation — generation is blocked without it.
// Returns an AES-256-GCM encrypted token (opaque) + display-only metadata.
// ---------------------------------------------------------------------------
export async function generateQrToken(
  geo: GeoInput
): Promise<
  { ok: true; token: string; display: QrDisplayInfo } | { ok: false; error: string }
> {
  if (
    !geo ||
    typeof geo.latitude !== "number" || !Number.isFinite(geo.latitude) ||
    typeof geo.longitude !== "number" || !Number.isFinite(geo.longitude)
  ) {
    return { ok: false, error: "Location is required to generate a QR." }
  }

  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const enrollment = await resolveActiveStudentEnrollment(service, user.id)
  if (!enrollment) return { ok: false, error: "No active enrollment found" }
  const enrollmentId = enrollment.enrollmentId

  const nonce = randomBytes(32).toString("hex")
  const generatedAt = new Date()
  const expiresAt = new Date(generatedAt.getTime() + 60_000)

  const { device_type, browser, os, ip_address: ip } = await getRequestClientMeta()
  const dev = await getOrCreateDeviceId()

  // Everything the old QR payload carried now lives server-side; the scan RPC
  // reads these exact keys back out of qr_current_token.generated_meta.
  const generatedMeta = {
    signature: null,
    generated_at: generatedAt.toISOString(),
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy_meter: geo.accuracy_meter ?? 0,
    device_type,
    browser,
    os,
    ip_address: ip,
    device_id: dev.deviceId,
    device_id_is_new: dev.isNew,
  }

  let token: string
  try {
    token = encryptQrBinary({
      enrollmentId,
      nonceHex: nonce,
      expiresAtMs: expiresAt.getTime(),
    })
  } catch (e) {
    console.error("[generateQrToken] encryption failed", e)
    return {
      ok: false,
      error: "QR is not configured on the server (encryption key missing). Contact the administrator.",
    }
  }

  const { error } = await service
    .from("qr_current_token")
    .upsert(
      {
        enrollment_id: enrollmentId,
        current_nonce: nonce,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_consumed: false,
        consumed_at: null,
        generated_meta: generatedMeta,
      },
      { onConflict: "enrollment_id" }
    )

  if (error) {
    console.error("[generateQrToken] upsert failed", error)
    return { ok: false, error: "Failed to generate QR token" }
  }

  return {
    ok: true,
    token,
    display: {
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
  }
}

// ---------------------------------------------------------------------------
// recordScan
// Called by the student leader (or adviser) after decoding the student's QR.
// token: the opaque AES-256-GCM encrypted string from the QR code.
// scannerGeo: the scanner's GPS coordinates (captured on the scanner device).
// ---------------------------------------------------------------------------
export async function recordScan(
  token: string,
  scannerGeo?: ScanMeta
): Promise<
  | { ok: true; result: AttendanceResult; studentName: string | null }
  | { ok: false; error: string; code: ScanErrorCode }
> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated", code: "not_authenticated" }

  let decrypted: DecryptedQr
  try {
    decrypted = decryptQrToken(token)
  } catch (e) {
    console.error("[recordScan] QR key misconfigured", e)
    return {
      ok: false,
      error: "QR scanning is not configured on the server. Contact the administrator.",
      code: "unknown",
    }
  }
  if (!decrypted) return { ok: false, error: "Invalid or tampered QR", code: "invalid" }

  // v1 = legacy JSON tokens, valid for ~60s after this deploy; remove this
  // mapping once no pre-deploy tokens can still be in flight.
  const enrollmentId =
    decrypted.v === 2 ? decrypted.enrollmentId : String(decrypted.legacy.enrollmentId ?? "")
  const nonce = decrypted.v === 2 ? decrypted.nonceHex : String(decrypted.legacy.nonce ?? "")
  const expiresAtMs =
    decrypted.v === 2
      ? decrypted.expiresAtMs
      : new Date(String(decrypted.legacy.expiresAt)).getTime()

  if (!enrollmentId || !nonce) {
    return { ok: false, error: "Invalid or tampered QR", code: "invalid" }
  }
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return { ok: false, error: "QR code has expired", code: "expired" }
  }

  const scannerMeta = await buildScannerMeta(scannerGeo)

  const { data, error } = await service.rpc("record_attendance_scan", {
    p_enrollment_id: enrollmentId,
    p_nonce: nonce,
    p_recorded_by: user.id,
    p_scan_meta: scannerMeta,
  })

  if (error) {
    console.error("[recordScan] rpc failed", error)
    const msg = (error.message ?? "").toLowerCase()
    if (msg.includes("not authorised")) {
      return { ok: false, error: "Not authorised to scan for this section", code: "unauthorized" }
    }
    if (msg.includes("enrollment not found")) {
      return { ok: false, error: "Enrollment not found", code: "not_found" }
    }
    if (msg.includes("already has an open")) {
      return { ok: false, error: "This student is already timed in.", code: "already_open" }
    }
    if (msg.includes("invalid, expired, or already used")) {
      return { ok: false, error: "QR is invalid, expired, or already used.", code: "invalid" }
    }
    if (msg.includes("replay") || msg.includes("already recorded")) {
      return { ok: false, error: "This QR was already scanned.", code: "replay" }
    }
    return {
      ok: false,
      error: "Could not record the scan. The QR may be invalid, expired, or already used.",
      code: "unknown",
    }
  }

  const row = data as {
    event_type: AttendanceResult["event_type"]
    session_id: string
    effective_at: string
    student_name: string | null
    student_user_id: string
  }

  // Post-response: don't make the scanner wait on the realtime broadcast.
  after(async () => {
    try {
      const channel = service.channel(`attendance-user:${row.student_user_id}`, {
        config: { private: true },
      })
      await channel.httpSend("scanned", { event_type: row.event_type })
      await service.removeChannel(channel)
    } catch (e) {
      console.warn("[recordScan] realtime broadcast failed", e)
    }
  })

  return {
    ok: true,
    result: {
      event_type: row.event_type,
      session_id: row.session_id,
      effective_at: row.effective_at,
    },
    studentName: row.student_name ?? null,
  }
}

// ---------------------------------------------------------------------------
// getMyOpenSession
// Returns the caller's current open attendance session (if any).
// Used by student time-out UI and leader self time-in/out toggle.
// ---------------------------------------------------------------------------
export async function getMyOpenSession(): Promise<
  | { ok: true; session: { sessionId: string; startedAt: string } | null }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const enrollment = await resolveActiveStudentEnrollment(service, user.id)
  if (!enrollment) return { ok: true, session: null }

  const openStatusId = await lookupId("attendance_session_status", "open")

  const { data, error } = await service
    .from("attendance_session")
    .select("attendance_session_id, started_at")
    .eq("enrollment_id", enrollment.enrollmentId)
    .eq("attendance_session_status_id", openStatusId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[getMyOpenSession] query failed", error)
    return { ok: false, error: "Could not check session status." }
  }

  if (!data) return { ok: true, session: null }

  return {
    ok: true,
    session: {
      sessionId: data.attendance_session_id,
      startedAt: data.started_at,
    },
  }
}

// ---------------------------------------------------------------------------
// recordStudentTimeOut
// Called by the student to close their own open session (no scan needed).
// studentGeo: the student's GPS at the moment of time-out.
// ---------------------------------------------------------------------------
export async function recordStudentTimeOut(
  studentGeo?: ScanMeta
): Promise<{ ok: true; result: AttendanceResult } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const enrollment = await resolveActiveStudentEnrollment(service, user.id)
  if (!enrollment) return { ok: false, error: "No active enrollment found" }
  const enrollmentId = enrollment.enrollmentId

  const meta = await buildScannerMeta(studentGeo)

  const { data, error } = await service.rpc("record_self_time_out", {
    p_enrollment_id: enrollmentId,
    p_actor: user.id,
    p_source_code: "self_student",
    p_meta: meta,
  })

  if (error) {
    console.error("[recordStudentTimeOut] rpc failed", error)
    return { ok: false, error: "Could not record time-out. You may not have an open session." }
  }

  return { ok: true, result: data as AttendanceResult }
}

// ---------------------------------------------------------------------------
// recordLeaderTimeIn
// Called by the student leader to open their own session (no scan).
// ---------------------------------------------------------------------------
export async function recordLeaderTimeIn(
  leaderGeo?: ScanMeta
): Promise<{ ok: true; result: AttendanceResult } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const leaderEnrollment = await getActiveLeaderEnrollment(supabase, user.id)
  if (!leaderEnrollment) return { ok: false, error: "No active leader enrollment found" }

  const meta = await buildScannerMeta(leaderGeo)

  const { data, error } = await service.rpc("record_leader_time_in", {
    p_enrollment_id: leaderEnrollment.enrollmentId,
    p_actor: user.id,
    p_meta: meta,
  })

  if (error) {
    console.error("[recordLeaderTimeIn] rpc failed", error)
    return { ok: false, error: "Could not record time-in. You may already have an open session." }
  }

  return { ok: true, result: data as AttendanceResult }
}

// ---------------------------------------------------------------------------
// recordLeaderTimeOut
// Called by the student leader to close their own open session.
// ---------------------------------------------------------------------------
export async function recordLeaderTimeOut(
  leaderGeo?: ScanMeta
): Promise<{ ok: true; result: AttendanceResult } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const leaderEnrollment = await getActiveLeaderEnrollment(supabase, user.id)
  if (!leaderEnrollment) return { ok: false, error: "No active leader enrollment found" }

  const meta = await buildScannerMeta(leaderGeo)

  const { data, error } = await service.rpc("record_self_time_out", {
    p_enrollment_id: leaderEnrollment.enrollmentId,
    p_actor: user.id,
    p_source_code: "self_leader",
    p_meta: meta,
  })

  if (error) {
    console.error("[recordLeaderTimeOut] rpc failed", error)
    return { ok: false, error: "Could not record time-out. You may not have an open session." }
  }

  return { ok: true, result: data as AttendanceResult }
}
