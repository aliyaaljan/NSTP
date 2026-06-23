"use server"

import { randomBytes } from "crypto"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { parseUserAgent } from "@/lib/user-agent"
import { encryptQrPayload, decryptQrPayload } from "@/lib/attendance/qr-crypto"

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Reads the caller's device/IP fingerprint from the incoming request headers.
// Shared by QR generation (student's device) and scan/time-out (scanner's device).
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
  return {
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    accuracy_meter: geo?.accuracy_meter ?? null,
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
  }

  const token = encryptQrPayload(payload)

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
): Promise<{ ok: true; result: AttendanceResult } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const payload = decryptQrPayload(token)
  if (!payload || !payload.enrollmentId || !payload.nonce) {
    return { ok: false, error: "Invalid or tampered QR" }
  }

  const expiresAtMs = new Date(payload.expiresAt as string).getTime()
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return { ok: false, error: "QR code has expired" }
  }

  const { data: enrollmentRow } = await service
    .from("enrollment")
    .select("section_id")
    .eq("enrollment_id", payload.enrollmentId)
    .maybeSingle()

  if (!enrollmentRow) return { ok: false, error: "Enrollment not found" }

  const { data: leadsData } = await supabase.rpc("app_leads_section", {
    p_section_id: enrollmentRow.section_id,
  })
  const { data: advisesData } = await supabase.rpc("app_advises_section", {
    p_section_id: enrollmentRow.section_id,
  })

  if (!leadsData && !advisesData) {
    return { ok: false, error: "Not authorised to scan for this section" }
  }

  const scannerMeta = await buildScannerMeta(scannerGeo)

  const generatedMeta = {
    // AES-256-GCM already authenticates the token, so no separate signature is
    // stored. qr_signature stays NULL (nullable column).
    signature: null,
    generated_at: payload.generatedAt ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    accuracy_meter: payload.accuracy_meter ?? null,
    device_type: payload.device_type ?? null,
    browser: payload.browser ?? null,
    os: payload.os ?? null,
    ip_address: payload.ip_address ?? null,
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
    return { ok: false, error: error.message }
  }

  return { ok: true, result: data as AttendanceResult }
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
    p_actor:         user.id,
    p_source_code:   "self_student",
    p_meta:          meta,
  })

  if (error) {
    console.error("[recordStudentTimeOut] rpc failed", error)
    return { ok: false, error: error.message }
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
    p_actor:         user.id,
    p_meta:          meta,
  })

  if (error) {
    console.error("[recordLeaderTimeIn] rpc failed", error)
    return { ok: false, error: error.message }
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
    p_actor:         user.id,
    p_source_code:   "self_leader",
    p_meta:          meta,
  })

  if (error) {
    console.error("[recordLeaderTimeOut] rpc failed", error)
    return { ok: false, error: error.message }
  }

  return { ok: true, result: data as AttendanceResult }
}
