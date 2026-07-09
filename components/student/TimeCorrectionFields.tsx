"use client"

import type { RequestSessionOption } from "@/lib/student/attendance-history-actions"
import {
  SCENARIO_LABELS,
  sessionsForScenario,
  type TimeCorrectionState,
  type TimeScenario,
} from "@/lib/student/time-correction"

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  display: "block",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1.5px solid #E5E7EB",
  fontSize: 14,
  boxSizing: "border-box",
}

const SCENARIOS: Exclude<TimeScenario, "">[] = [
  "wrong_time",
  "missing",
  "restore",
  "flag",
]

export default function TimeCorrectionFields({
  sessions,
  value,
  onChange,
  loading = false,
}: {
  sessions: RequestSessionOption[]
  value: TimeCorrectionState
  onChange: (next: TimeCorrectionState) => void
  loading?: boolean
}) {
  const set = (patch: Partial<TimeCorrectionState>) =>
    onChange({ ...value, ...patch })

  const needsSession = value.scenario && value.scenario !== "missing"
  const pickable = sessionsForScenario(value.scenario, sessions)
  const selected = sessions.find((s) => s.sessionId === value.sessionId)

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        borderRadius: 12,
        border: "1.5px solid #E5E7EB",
        background: "#FAFAF7",
      }}
    >
      <label style={labelStyle}>What&apos;s the time problem?</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {SCENARIOS.map((s) => (
          <label
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="time-scenario"
              checked={value.scenario === s}
              onChange={() =>
                set({ scenario: s, sessionId: "", date: "", timeIn: "", timeOut: "" })
              }
            />
            {SCENARIO_LABELS[s]}
          </label>
        ))}
      </div>

      {needsSession && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Which session?</label>
          <select
            value={value.sessionId}
            onChange={(e) => {
              const sess = sessions.find((s) => s.sessionId === e.target.value)
              set({
                sessionId: e.target.value,
                // pre-fill the requested times from the existing session
                timeIn: sess?.timeIn ?? "",
                timeOut: sess?.timeOut ?? "",
              })
            }}
            style={inputStyle}
          >
            <option value="">
              {loading
                ? "Loading your sessions…"
                : pickable.length === 0
                ? "No matching sessions"
                : "Select a session…"}
            </option>
            {pickable.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.dateLabel} · {s.timeInLabel}
                {s.timeOut ? `–${s.timeOutLabel}` : ""} · {s.statusCode}
                {s.isFlagged ? " · off-site" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.scenario === "missing" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={value.date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => set({ date: e.target.value })}
            style={inputStyle}
          />
        </div>
      )}

      {/* Requested times — which inputs show depends on the scenario */}
      {(value.scenario === "wrong_time" || value.scenario === "missing") && (
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>
              {value.scenario === "missing" ? "Time In" : "Correct Time In"}
            </label>
            <input
              type="time"
              value={value.timeIn}
              onChange={(e) => set({ timeIn: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>
              {value.scenario === "missing" ? "Time Out" : "Correct Time Out"}
            </label>
            <input
              type="time"
              value={value.timeOut}
              onChange={(e) => set({ timeOut: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {value.scenario === "restore" && selected && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Your Time In</label>
            <input value={selected.timeInLabel} disabled style={{ ...inputStyle, background: "#F3F4F6" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Correct Time Out</label>
            <input
              type="time"
              value={value.timeOut}
              onChange={(e) => set({ timeOut: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {value.scenario === "flag" && (
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
          Your session still counts — the off-site flag is just a marker. Explain it in
          the details below; your facilitator can review and clear it.
        </p>
      )}
    </div>
  )
}
