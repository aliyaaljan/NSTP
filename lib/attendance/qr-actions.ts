"use server"

import { createHmac, randomBytes } from "crypto"
import { headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"
import { DATABASE_IDS } from "@/lib/constants"
import { parseUserAgent } from "@/lib/user-agent"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QrTokenPayload = {
  enrollmentId: string
  nonce: string
  signature: string
  generatedAt: string  // ISO
  expiresAt: string    // ISO
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getSigningSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret) throw new Error("QR_SIGNING_SECRET is not set")
  return secret
}

function signNonce(enrollmentId: string, nonce: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(`${enrollmentId}.${nonce}`)
    .digest("hex")
}

function verifySignature(enrollmentId: string, nonce: string, sig: string): boolean {
  const expected = signNonce(enrollmentId, nonce)
  // Constant-time comparison to avoid timing attacks
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

async function buildScannerMeta(geo?: ScanMeta) {
  const h = await headers()
  const ua = h.get("user-agent")
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  const { device_type, browser, os } = parseUserAgent(ua)
  return {
    latitude: geo?.latitude ?? null,
    longitude: geo?.longitude ?? null,
    accuracy_meter: geo?.accuracy_meter ?? null,
    device_type,
    browser,
    os,
    ip_address: ip,
  }
}

// ---------------------------------------------------------------------------
// generateQrToken
// Called by the student on their attendance page.
// Generates a crypto-random nonce, UPSERTs qr_current_token (60 s window),
// and returns the payload the frontend encodes into a QR image.
// ---------------------------------------------------------------------------
export async function generateQrToken(): Promise<
  { ok: true; payload: QrTokenPayload } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  // Resolve student's active enrollment
  const { data: enrollmentRows } = await service
    .from("enrollment")
    .select("enrollment_id")
    .eq("student_user_id", user.id)
    .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)
    .limit(1)

  const enrollmentId = enrollmentRows?.[0]?.enrollment_id
  if (!enrollmentId) return { ok: false, error: "No active enrollment found" }

  const nonce = randomBytes(32).toString("hex")
  const signature = signNonce(enrollmentId, nonce)
  const generatedAt = new Date()
  const expiresAt = new Date(generatedAt.getTime() + 60_000)

  const h = await headers()
  const ua = h.get("user-agent")
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  const { device_type, browser, os } = parseUserAgent(ua)

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
    payload: {
      enrollmentId,
      nonce,
      signature,
      generatedAt: generatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      // Device metadata embedded so the scanner can forward it as generated_meta
      ...(device_type ? { device_type } : {}),
      ...(browser ? { browser } : {}),
      ...(os ? { os } : {}),
      ...(ip ? { ip_address: ip } : {}),
    } as QrTokenPayload & Record<string, string>,
  }
}

// ---------------------------------------------------------------------------
// recordScan
// Called by the student leader (or adviser) after decoding the student's QR.
// payload: the decoded QrTokenPayload from the student's QR code.
// scannerGeo: the scanner's GPS coordinates (captured on the scanner device).
// ---------------------------------------------------------------------------
export async function recordScan(
  payload: QrTokenPayload & Record<string, string>,
  scannerGeo?: ScanMeta
): Promise<{ ok: true; result: AttendanceResult } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  // Validate payload shape
  if (!payload.enrollmentId || !payload.nonce || !payload.signature) {
    return { ok: false, error: "Invalid QR payload" }
  }

  // Verify HMAC — defense-in-depth (the DB CAS is authoritative)
  if (!verifySignature(payload.enrollmentId, payload.nonce, payload.signature)) {
    return { ok: false, error: "QR signature invalid" }
  }

  // Resolve the student's section from the enrollment
  const { data: enrollmentRow } = await service
    .from("enrollment")
    .select("section_id")
    .eq("enrollment_id", payload.enrollmentId)
    .maybeSingle()

  if (!enrollmentRow) return { ok: false, error: "Enrollment not found" }

  // Authz: scanner must lead or advise the student's section
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

  // generated_meta: what the student's device stamped into the QR payload
  const generatedMeta = {
    signature:    payload.signature,
    generated_at: payload.generatedAt,
    latitude:     payload.latitude ?? null,
    longitude:    payload.longitude ?? null,
    accuracy_meter: payload.accuracy_meter ?? null,
    device_type:  payload.device_type ?? null,
    browser:      payload.browser ?? null,
    os:           payload.os ?? null,
    ip_address:   payload.ip_address ?? null,
  }

  const { data, error } = await service.rpc("record_attendance_scan", {
    p_enrollment_id:  payload.enrollmentId,
    p_nonce:          payload.nonce,
    p_recorded_by:    user.id,
    p_generated_meta: generatedMeta,
    p_scan_meta:      scannerMeta,
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

  // Resolve student's active enrollment
  const { data: enrollmentRows } = await service
    .from("enrollment")
    .select("enrollment_id")
    .eq("student_user_id", user.id)
    .eq("enrollment_status_id", DATABASE_IDS.enrollmentStatuses.active)
    .limit(1)

  const enrollmentId = enrollmentRows?.[0]?.enrollment_id
  if (!enrollmentId) return { ok: false, error: "No active enrollment found" }

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
