"use client"

import { TYPE } from "@/lib/admin-typography"
import { COLORS } from "@/components/admin/import/import-ui"
import type {
  ConflictDecision,
  PriorDecision,
  StudentPreviewRow,
} from "@/lib/admin/student-import"

const bulkBtnStyle = {
  ...TYPE.caption,
  fontWeight: 700 as const,
  background: COLORS.fieldBg,
  color: COLORS.textDark,
  border: "none",
  borderRadius: 999,
  padding: "6px 14px",
  cursor: "pointer" as const,
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div style={{ display: "inline-flex" }}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...TYPE.caption,
              fontWeight: 700,
              background: selected ? COLORS.headerGreen : COLORS.fieldBg,
              color: selected ? "#fff" : COLORS.textDark,
              border: "none",
              padding: "6px 14px",
              cursor: "pointer",
              borderRadius:
                index === 0 ? "999px 0 0 999px" : index === options.length - 1 ? "0 999px 999px 0" : 0,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function HoursBadge({ met }: { met: boolean }) {
  return (
    <span
      style={{
        ...TYPE.caption,
        fontWeight: 700,
        borderRadius: 999,
        padding: "2px 10px",
        marginLeft: 8,
        background: met ? "#D4E4DA" : "#FDF0E0",
        color: met ? COLORS.headerGreen : COLORS.amber,
      }}
    >
      {met ? "Met" : "Short"}
    </span>
  )
}

const th: React.CSSProperties = {
  ...TYPE.caption,
  fontWeight: 700,
  color: COLORS.textGray,
  textAlign: "left",
  padding: "8px 12px",
  position: "sticky",
  top: 0,
  background: "#fff",
}

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderTop: `1px solid ${COLORS.border}`,
}

export default function ImportDecisionTable({
  returning,
  conflicts,
  priorDecisions,
  conflictDecisions,
  onPriorChange,
  onConflictChange,
  onBulkPrior,
}: {
  returning: StudentPreviewRow[]
  conflicts: StudentPreviewRow[]
  priorDecisions: Record<number, PriorDecision>
  conflictDecisions: Record<number, ConflictDecision>
  onPriorChange: (rowNumber: number, decision: PriorDecision) => void
  onConflictChange: (rowNumber: number, decision: ConflictDecision) => void
  onBulkPrior: (decision: PriorDecision | "suggested") => void
}) {
  if (returning.length === 0 && conflicts.length === 0) return null

  return (
    <div>
      {returning.length > 0 && (
        <div>
          <div style={{ ...TYPE.sectionLabel, color: COLORS.textDark }}>
            RETURNING STUDENTS ({returning.length})
          </div>
          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
            These students have an active enrollment from a previous term. Choose how to
            close it out — they&apos;ll then be enrolled in the new class.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={bulkBtnStyle} onClick={() => onBulkPrior("suggested")}>
              Apply suggested
            </button>
            <button type="button" style={bulkBtnStyle} onClick={() => onBulkPrior("complete")}>
              All complete
            </button>
            <button type="button" style={bulkBtnStyle} onClick={() => onBulkPrior("drop")}>
              All drop
            </button>
          </div>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={th}>Previous class</th>
                  <th style={th}>Hours</th>
                  <th style={th}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {returning.map(({ row, prior }) => {
                  if (!prior) return null
                  const decision = priorDecisions[row.rowNumber] ?? prior.suggested
                  const met = prior.hoursEarned >= prior.hoursRequired
                  return (
                    <tr key={row.rowNumber}>
                      <td style={td}>
                        <div style={{ ...TYPE.body, color: COLORS.textDark }}>{row.fullName}</div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{row.email}</div>
                      </td>
                      <td style={td}>
                        <div style={{ ...TYPE.body, color: COLORS.textDark }}>{prior.classLabel}</div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{prior.termName}</div>
                      </td>
                      <td style={td}>
                        <span style={{ ...TYPE.body, color: COLORS.textDark }}>
                          {prior.hoursEarned} / {prior.hoursRequired} hrs
                        </span>
                        <HoursBadge met={met} />
                      </td>
                      <td style={td}>
                        <SegmentedControl
                          value={decision}
                          options={[
                            { value: "complete", label: "Complete" },
                            { value: "drop", label: "Drop" },
                          ]}
                          onChange={(value) => onPriorChange(row.rowNumber, value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div style={{ marginTop: returning.length > 0 ? 18 : 0 }}>
          <div style={{ ...TYPE.sectionLabel, color: COLORS.textDark }}>
            CONFLICTS THIS TERM ({conflicts.length})
          </div>
          <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
            Already enrolled under a different facilitator this term. Keep them where they
            are, or move them to the facilitator in this file.
          </div>
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={th}>Currently with</th>
                  <th style={th}>File says</th>
                  <th style={th}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map(({ row, conflict }) => {
                  if (!conflict) return null
                  const decision = conflictDecisions[row.rowNumber] ?? "keep"
                  return (
                    <tr key={row.rowNumber}>
                      <td style={td}>
                        <div style={{ ...TYPE.body, color: COLORS.textDark }}>{row.fullName}</div>
                        <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{row.email}</div>
                      </td>
                      <td style={{ ...td, ...TYPE.body, color: COLORS.textDark }}>
                        {conflict.currentClassLabel}
                      </td>
                      <td style={{ ...td, ...TYPE.body, color: COLORS.textDark }}>
                        {conflict.targetClassLabel ?? "New class (will be created)"}
                      </td>
                      <td style={td}>
                        <SegmentedControl
                          value={decision}
                          options={[
                            { value: "keep", label: "Keep" },
                            { value: "move", label: "Move" },
                          ]}
                          onChange={(value) => onConflictChange(row.rowNumber, value)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
