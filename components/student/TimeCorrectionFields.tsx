"use client"

import { useId } from "react"
import {
  IconClockHour4,
  IconCalendarExclamation,
  IconRotateClockwise2,
  IconMapPinOff,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react"
import type { RequestSessionOption } from "@/lib/student/attendance-history-actions"
import {
  SCENARIO_LABELS,
  sessionsForScenario,
  type TimeCorrectionState,
  type TimeScenario,
} from "@/lib/student/time-correction"

const P = {
  green: "#1A3C2D",
  greenSoft: "#E8EDE5",
  greenBg: "#F3F7F1",
  gold: "#C8963C",
  ink: "#2C2C2A",
  muted: "#6B7280",
  border: "#E5E7EB",
  panelBg: "#FAFAF7",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: P.muted,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  display: "block",
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: `1.5px solid ${P.border}`,
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: P.ink,
  background: "#fff",
}

const SCENARIO_META: Record<
  Exclude<TimeScenario, "">,
  { icon: React.ElementType; hint: string }
> = {
  wrong_time: {
    icon: IconClockHour4,
    hint: "Your time in or time out was logged incorrectly",
  },
  missing: {
    icon: IconCalendarExclamation,
    hint: "You attended but no log was recorded",
  },
  restore: {
    icon: IconRotateClockwise2,
    hint: "A session was removed and needs to be restored",
  },
  flag: {
    icon: IconMapPinOff,
    hint: "Your log was flagged for being off-site",
  },
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
  const groupName = useId()
  const set = (patch: Partial<TimeCorrectionState>) =>
    onChange({ ...value, ...patch })

  const needsSession = value.scenario && value.scenario !== "missing"
  const pickable = sessionsForScenario(value.scenario, sessions)
  const selected = sessions.find((s) => s.sessionId === value.sessionId)

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 18,
        borderRadius: 14,
        border: `1.5px solid ${P.border}`,
        background: P.panelBg,
      }}
    >
      <label style={labelStyle}>What&apos;s the time problem?</label>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {SCENARIOS.map((s) => {
          const meta = SCENARIO_META[s]
          const Icon = meta.icon
          const isSelected = value.scenario === s
          return (
            <label
              key={s}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: `1.5px solid ${isSelected ? P.green : P.border}`,
                background: isSelected ? P.greenBg : "#fff",
                cursor: "pointer",
                transition: "border-color .15s, background .15s",
              }}
            >
              <input
                type="radio"
                name={groupName}
                checked={isSelected}
                onChange={() =>
                  set({ scenario: s, sessionId: "", date: "", timeIn: "", timeOut: "" })
                }
                style={{ accentColor: P.green, width: 15, height: 15, margin: "3px 0 0" }}
              />
              <Icon
                size={16}
                stroke={1.8}
                color={isSelected ? P.green : P.muted}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isSelected ? P.green : P.ink,
                  }}
                >
                  {SCENARIO_LABELS[s]}
                </span>
                <span style={{ fontSize: 11.5, color: P.muted, lineHeight: 1.4 }}>
                  {meta.hint}
                </span>
              </div>
            </label>
          )
        })}
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

          {selected && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: P.greenSoft,
                fontSize: 12,
                color: P.green,
                fontWeight: 600,
              }}
            >
              {selected.dateLabel} · logged {selected.timeInLabel}
              {selected.timeOut ? `–${selected.timeOutLabel}` : " (no time out)"}
            </div>
          )}
        </div>
      )}

      {value.scenario === "missing" && (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Date to be adjusted</label>
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
        <div>
          <label style={labelStyle}>
            {value.scenario === "missing" ? "Time attended" : "Corrected time"}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                From
              </span>
              <input
                type="time"
                value={value.timeIn}
                onChange={(e) => set({ timeIn: e.target.value })}
                style={inputStyle}
              />
            </div>
            <IconArrowRight size={16} stroke={2} color={P.muted} style={{ marginTop: 14, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                To
              </span>
              <input
                type="time"
                value={value.timeOut}
                onChange={(e) => set({ timeOut: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {value.scenario === "restore" && selected && (
        <div>
          <label style={labelStyle}>Corrected time</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                From (on record)
              </span>
              <input
                value={selected.timeInLabel}
                disabled
                style={{ ...inputStyle, background: "#F3F4F6", color: P.muted }}
              />
            </div>
            <IconArrowRight size={16} stroke={2} color={P.muted} style={{ marginTop: 14, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: P.muted, display: "block", marginBottom: 4 }}>
                To
              </span>
              <input
                type="time"
                value={value.timeOut}
                onChange={(e) => set({ timeOut: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {value.scenario === "flag" && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#FFF4D6",
            border: "1px solid #D4A840",
          }}
        >
          <IconInfoCircle size={16} stroke={2} color={P.gold} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "#8B5E1A", margin: 0, lineHeight: 1.5 }}>
            Your session still counts — the off-site flag is just a marker. Explain it in
            the details below; your facilitator can review and clear it.
          </p>
        </div>
      )}
    </div>
  )
}
