// Client-safe helpers for the structured "time correction" part of a request.
// Kept out of the "use server" action files so both the request page and the
// shared field component can import the types + pure builders.

import type { RequestSessionOption } from "@/lib/student/attendance-history-actions"

// Structured payload written onto the appeal (consumed by the server actions).
export type StructuredCorrection = {
  attendanceSessionId?: string | null
  requestedTimeIn?: string | null
  requestedTimeOut?: string | null
}

export type TimeScenario = "" | "wrong_time" | "missing" | "restore" | "flag"

export type TimeCorrectionState = {
  scenario: TimeScenario
  sessionId: string // "" for a missing session
  date: string // YYYY-MM-DD — only used for the missing-session case
  timeIn: string // HH:MM (24h)
  timeOut: string // HH:MM (24h)
}

export const EMPTY_TIME_CORRECTION: TimeCorrectionState = {
  scenario: "",
  sessionId: "",
  date: "",
  timeIn: "",
  timeOut: "",
}

export const SCENARIO_LABELS: Record<Exclude<TimeScenario, "">, string> = {
  wrong_time: "Wrong time on a session",
  missing: "Missing session (forgot to time in/out)",
  restore: "Restore an auto-timed-out (voided) session",
  flag: "Explain / correct an off-site flag",
}

// Asia/Manila is a fixed UTC+8 offset (no DST) — build an ISO instant from a
// local date + HH:MM the student entered.
export function manilaIso(date: string, hm: string): string | null {
  if (!date || !hm) return null
  const d = new Date(`${date}T${hm}:00+08:00`)
  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

// Which sessions are selectable for a given scenario.
export function sessionsForScenario(
  scenario: TimeScenario,
  sessions: RequestSessionOption[]
): RequestSessionOption[] {
  switch (scenario) {
    case "restore":
      return sessions.filter((s) => s.statusCode === "voided")
    case "flag":
      return sessions.filter((s) => s.isFlagged)
    case "wrong_time":
      return sessions.filter((s) => s.statusCode !== "voided")
    default:
      return sessions
  }
}

export function buildStructuredCorrection(
  tc: TimeCorrectionState,
  sessions: RequestSessionOption[]
):
  | { ok: true; value: StructuredCorrection }
  | { ok: false; error: string } {
  const sess = sessions.find((s) => s.sessionId === tc.sessionId)

  switch (tc.scenario) {
    case "missing": {
      if (!tc.date || !tc.timeIn || !tc.timeOut) {
        return { ok: false, error: "Enter the date and both times for the missing session." }
      }
      if (tc.timeOut <= tc.timeIn) {
        return { ok: false, error: "Time-out must be after time-in." }
      }
      return {
        ok: true,
        value: {
          attendanceSessionId: null,
          requestedTimeIn: manilaIso(tc.date, tc.timeIn),
          requestedTimeOut: manilaIso(tc.date, tc.timeOut),
        },
      }
    }
    case "wrong_time": {
      if (!sess) return { ok: false, error: "Select the session to correct." }
      if (!tc.timeIn || !tc.timeOut) {
        return { ok: false, error: "Enter the corrected time-in and time-out." }
      }
      if (tc.timeOut <= tc.timeIn) {
        return { ok: false, error: "Time-out must be after time-in." }
      }
      return {
        ok: true,
        value: {
          attendanceSessionId: sess.sessionId,
          requestedTimeIn: manilaIso(sess.dateKey, tc.timeIn),
          requestedTimeOut: manilaIso(sess.dateKey, tc.timeOut),
        },
      }
    }
    case "restore": {
      if (!sess) return { ok: false, error: "Select the voided session to restore." }
      if (!tc.timeOut) return { ok: false, error: "Enter the correct time-out." }
      if (sess.timeIn && tc.timeOut <= sess.timeIn) {
        return { ok: false, error: "Time-out must be after your time-in." }
      }
      return {
        ok: true,
        value: {
          attendanceSessionId: sess.sessionId,
          requestedTimeIn: null,
          requestedTimeOut: manilaIso(sess.dateKey, tc.timeOut),
        },
      }
    }
    case "flag": {
      if (!sess) return { ok: false, error: "Select the flagged session." }
      return {
        ok: true,
        value: {
          attendanceSessionId: sess.sessionId,
          requestedTimeIn: null,
          requestedTimeOut: null,
        },
      }
    }
    default:
      return { ok: false, error: "Select what kind of time problem you're reporting." }
  }
}
