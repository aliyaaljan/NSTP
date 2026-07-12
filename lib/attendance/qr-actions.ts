"use server"

import { randomBytes } from "crypto"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { parseUserAgent } from "@/lib/user-agent"
import { encryptQrPayload, decryptQrPayload } from "@/lib/attendance/qr-crypto"
import { lookupId } from "@/lib/lookups"
import { getOrCreateDeviceId } from "@/lib/attendance/device-id"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QrTokenPayload = {
  enrollmentId: string
  nonce: string
  generatedAt: string
  expiresAt: string
  latitude: number
  longitude: number
  accuracy_meter: number
  device_type: string | null
  browser: string | null
  os: string | null
  ip_address: string | null
  device_id: string | null
  device_id_is_new: boolean
}

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

  const payload: QrTokenPayload = {
    enrollmentId,
    nonce,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
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
    token = encryptQrPayload(payload)
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

  let payload: Record<string, unknown> | null
  try {
    payload = decryptQrPayload(token)
  } catch (e) {
    console.error("[recordScan] QR key misconfigured", e)
    return {
      ok: false,
      error: "QR scanning is not configured on the server. Contact the administrator.",
      code: "unknown",
    }
  }
  if (!payload || !payload.enrollmentId || !payload.nonce) {
    return { ok: false, error: "Invalid or tampered QR", code: "invalid" }
  }

  const expiresAtMs = new Date(payload.expiresAt as string).getTime()
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return { ok: false, error: "QR code has expired", code: "expired" }
  }

  const { data: enrollmentRow } = await service
    .from("enrollment")
    .select("section_id, student_user_id")
    .eq("enrollment_id", payload.enrollmentId)
    .maybeSingle()

  if (!enrollmentRow) return { ok: false, error: "Enrollment not found", code: "not_found" }

  const { data: leadsData } = await supabase.rpc("app_leads_section", {
    p_section_id: enrollmentRow.section_id,
  })
  const { data: advisesData } = await supabase.rpc("app_advises_section", {
    p_section_id: enrollmentRow.section_id,
  })

  if (!leadsData && !advisesData) {
    return { ok: false, error: "Not authorised to scan for this section", code: "unauthorized" }
  }

  const scannerMeta = await buildScannerMeta(scannerGeo)

  const generatedMeta = {
    signature: null,
    generated_at: payload.generatedAt ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    accuracy_meter: payload.accuracy_meter ?? null,
    device_type: payload.device_type ?? null,
    browser: payload.browser ?? null,
    os: payload.os ?? null,
    ip_address: payload.ip_address ?? null,
    device_id: (payload.device_id as string | undefined) ?? null,
    device_id_is_new: (payload.device_id_is_new as boolean | undefined) ?? false,
  }

  const { data, error } = await service.rpc("record_attendance_scan", {
    p_enrollment_id: payload.enrollmentId,
    p_nonce: payload.nonce,
    p_recorded_by: user.id,
    p_generated_meta: generatedMeta,
    p_scan_meta: scannerMeta,
  })

  if (error) {
    console.error("[recordScan] rpc failed", error)
    const msg = (error.message ?? "").toLowerCase()
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

  const { data: studentRow } = await service
    .from("app_user")
    .select("full_name")
    .eq("app_user_id", enrollmentRow.student_user_id)
    .maybeSingle()

  const result = data as AttendanceResult

  try {
    const channel = service.channel(`attendance-user:${enrollmentRow.student_user_id}`, {
      config: { private: true },
    })
    await channel.httpSend("scanned", { event_type: result.event_type })
    await service.removeChannel(channel)
  } catch (e) {
    console.warn("[recordScan] realtime broadcast failed", e)
  }

  return {
    ok: true,
    result,
    studentName: studentRow?.full_name ?? null,
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
