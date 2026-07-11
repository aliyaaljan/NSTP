"use client"

import { TYPE } from "@/lib/admin-typography"
import { COLORS } from "@/components/admin/import/import-ui"

export interface SummaryChip {
  label: string
  count: number
  tone?: "default" | "amber" | "red"
}

const TONE_COLOR: Record<NonNullable<SummaryChip["tone"]>, string> = {
  default: COLORS.textDark,
  amber: COLORS.amber,
  red: COLORS.error,
}

export default function ImportSummaryBar({ chips }: { chips: SummaryChip[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {chips.map((chip) => (
        <div
          key={chip.label}
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "8px 14px",
            minWidth: 90,
          }}
        >
          <div style={{ ...TYPE.h1, color: TONE_COLOR[chip.tone ?? "default"] }}>
            {chip.count}
          </div>
          <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{chip.label}</div>
        </div>
      ))}
    </div>
  )
}
