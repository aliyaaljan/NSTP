"use client"

import { TYPE } from "@/lib/admin-typography"
import { COLORS, SEVERITY_COLORS } from "@/components/admin/import/import-ui"
import { countBySeverity, ISSUE_TITLES, type ErrorRow, type RowIssue } from "@/lib/admin/import/types"
import {
  digitsOnly,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  SAIS_ID_MAX_LENGTH,
  STUDENT_NUMBER_LENGTH,
} from "@/lib/admin/user-field-validation"

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const

interface IssueGroup {
  code: string
  severity: RowIssue["severity"]
  issues: RowIssue[]
}

function groupIssues(issues: RowIssue[]): IssueGroup[] {
  const groups = new Map<string, IssueGroup>()
  for (const issue of issues) {
    const existing = groups.get(issue.code)
    if (existing) {
      existing.issues.push(issue)
    } else {
      groups.set(issue.code, { code: issue.code, severity: issue.severity, issues: [issue] })
    }
  }
  return [...groups.values()].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.issues.length - a.issues.length
  })
}

const inputStyle: React.CSSProperties = {
  ...TYPE.caption,
  background: COLORS.fieldBg,
  border: "none",
  borderRadius: 6,
  padding: "8px 10px",
  width: 260,
  outline: "none",
}

function FieldEditor({
  fieldKey,
  value,
  onChange,
  facilitatorOptions,
}: {
  fieldKey: string
  value: string
  onChange: (value: string) => void
  facilitatorOptions: { userId: string; fullName: string }[]
}) {
  if (fieldKey === "facilitator") {
    return (
      <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, appearance: "none", cursor: "pointer", paddingRight: 32 }}
        >
          <option value="" disabled>
            Pick facilitator…
          </option>
          {facilitatorOptions.map((f) => (
            <option key={f.userId} value={f.fullName}>
              {f.fullName}
            </option>
          ))}
        </select>
        <i
          className="ti ti-chevron-down"
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            fontSize: 14,
            color: COLORS.textGray,
          }}
        />
      </div>
    )
  }
  const maxLength =
    fieldKey === "email"
      ? EMAIL_MAX_LENGTH
      : fieldKey === "full_name"
        ? FULL_NAME_MAX_LENGTH
        : fieldKey === "student_number"
          ? STUDENT_NUMBER_LENGTH
          : fieldKey === "sais_id"
            ? SAIS_ID_MAX_LENGTH
            : undefined
  const numeric = fieldKey === "student_number" || fieldKey === "sais_id"
  return (
    <input
      type="text"
      value={value}
      onChange={(e) =>
        onChange(
          numeric && maxLength != null
            ? digitsOnly(e.target.value, maxLength)
            : e.target.value
        )
      }
      maxLength={maxLength}
      inputMode={numeric ? "numeric" : undefined}
      style={{ ...inputStyle, marginTop: 4, display: "block" }}
    />
  )
}

export default function ImportIssuesPanel({
  issues,
  errorRows,
  facilitatorOptions,
  editable,
  fixes,
  onFixChange,
  onRecheck,
  recheckPending,
}: {
  issues: RowIssue[]
  errorRows: ErrorRow[]
  facilitatorOptions: { userId: string; fullName: string }[]
  editable: boolean
  fixes: Record<number, Record<string, string>>
  onFixChange: (rowNumber: number, key: string, value: string) => void
  onRecheck: () => void
  recheckPending: boolean
}) {
  if (issues.length === 0) return null

  const counts = countBySeverity(issues)
  const groups = groupIssues(issues)
  const errorRowsByNumber = new Map(errorRows.map((r) => [r.rowNumber, r]))
  const fixedCount = Object.keys(fixes).length

  const countSummary = (["error", "warning", "info"] as const)
    .filter((severity) => counts[severity] > 0)
    .map((severity) => (
      <span key={severity} style={{ color: SEVERITY_COLORS[severity] }}>
        {counts[severity]} {severity}
        {counts[severity] !== 1 ? "s" : ""}
      </span>
    ))
    .reduce<React.ReactNode[]>((acc, node, index) => {
      if (index > 0) acc.push(<span key={`sep-${index}`}> · </span>)
      acc.push(node)
      return acc
    }, [])

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ ...TYPE.sectionLabel, color: COLORS.textDark }}>ISSUES</div>
        <div style={{ ...TYPE.caption }}>{countSummary}</div>
      </div>

      {groups.map((group) => (
        <details
          key={group.code}
          open={group.severity === "error"}
          style={{
            marginTop: 8,
            background: "#fff",
            border: `1px solid ${COLORS.border}`,
            borderLeft: `3px solid ${SEVERITY_COLORS[group.severity]}`,
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          <summary
            style={{
              ...TYPE.bodyBold,
              color: SEVERITY_COLORS[group.severity],
              cursor: "pointer",
            }}
          >
            {group.issues.length} row{group.issues.length !== 1 ? "s" : ""} —{" "}
            {ISSUE_TITLES[group.code] ?? group.code}
          </summary>
          {group.issues.map((issue, index) => {
            const errorRow = errorRowsByNumber.get(issue.rowNumber)
            const showEditor = editable && group.severity === "error" && issue.field && errorRow
            const fieldKey = issue.field ?? ""
            const currentValue =
              fixes[issue.rowNumber]?.[fieldKey] ?? errorRow?.values[fieldKey] ?? ""
            return (
              <div key={`${issue.rowNumber}-${index}`} style={{ marginTop: 6 }}>
                <div style={{ ...TYPE.caption, color: COLORS.textGray }}>
                  Row {issue.rowNumber}: {issue.message}
                </div>
                {showEditor && (
                  <FieldEditor
                    fieldKey={fieldKey}
                    value={currentValue}
                    onChange={(value) => onFixChange(issue.rowNumber, fieldKey, value)}
                    facilitatorOptions={facilitatorOptions}
                  />
                )}
              </div>
            )
          })}
        </details>
      ))}

      {editable && fixedCount > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={onRecheck}
            disabled={recheckPending}
            style={{
              ...TYPE.bodyBold,
              color: "#fff",
              background: COLORS.headerGreen,
              border: "none",
              borderRadius: 999,
              padding: "8px 20px",
              cursor: recheckPending ? "not-allowed" : "pointer",
              opacity: recheckPending ? 0.6 : 1,
            }}
          >
            {recheckPending
              ? "Re-checking…"
              : `Re-check ${fixedCount} fixed row${fixedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  )
}
