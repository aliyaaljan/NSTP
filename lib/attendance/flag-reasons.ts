// Typed catalog for attendance_session.flag_reasons (jsonb array).
// Reasons are WRITTEN by the SQL RPCs (record_attendance_scan / record_self_time_out)
// and READ by the facilitator UI. Students may only ever learn about "offsite".

export type FlagReasonCode =
  | "offsite"                  // time-out GPS outside all active geofences
  | "device_changed"           // QR generated on a different device than the student's previous QR time-in
  | "shared_device"            // same device generated time-ins for two different students the same day
  | "scan_distance"            // QR generated too far from where it was scanned
  | "timeout_device_mismatch"  // timed out from a different device than the one that opened the session

export type FlagReason = {
  code: FlagReasonCode
  message: string
  at: string // ISO timestamp the reason was raised
  meta?: Record<string, unknown>
}

// Codes a student may ever learn about; everything else is facilitator-only.
export const STUDENT_VISIBLE_FLAG_CODES: ReadonlySet<string> = new Set(["offsite"])

const FLAG_CODE_LABELS: Record<FlagReasonCode, string> = {
  offsite: "Off-site time-out",
  device_changed: "New device",
  shared_device: "Shared device",
  scan_distance: "QR generated far from scanner",
  timeout_device_mismatch: "Timed out from another device",
}

export function flagLabel(code: string): string {
  return FLAG_CODE_LABELS[code as FlagReasonCode] ?? code
}
