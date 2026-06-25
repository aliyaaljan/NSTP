"use client"

import { useState } from "react"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { TYPE } from "@/lib/admin-typography"

export interface CompletionDonutData {
  onTrackPct: number
  inProgressPct: number
  atRiskPct: number
}

type Segment = { pct: number; color: string; label: string }

export default function CompletionDonutChart({ data }: { data: CompletionDonutData }) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)

  const size = 260
  const strokeWidth = 34
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r

  const segments: Segment[] = [
    { pct: data.onTrackPct, color: COLORS.green, label: "On track" },
    { pct: data.inProgressPct, color: COLORS.amber, label: "In progress" },
    { pct: data.atRiskPct, color: COLORS.maroon, label: "At risk" },
  ]

  const hovered = segments.find((seg) => seg.label === hoveredLabel) ?? null

  let offsetAcc = 0

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 300,
        aspectRatio: "1",
        margin: "0 auto",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS.track}
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          if (seg.pct <= 0) return null
          const dash = (seg.pct / 100) * c
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offsetAcc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
              style={{
                cursor: "pointer",
                opacity: hoveredLabel && hoveredLabel !== seg.label ? 0.45 : 1,
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={() => setHoveredLabel(seg.label)}
              onMouseLeave={() => setHoveredLabel(null)}
            />
          )
          offsetAcc += dash
          return el
        })}
      </svg>

      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: hovered.color,
            }}
          />
          <span style={{ ...TYPE.bodyBold, color: COLORS.textDark, textAlign: "center" }}>
            {hovered.label}
          </span>
          <span style={{ ...TYPE.h2, color: hovered.color, lineHeight: 1 }}>
            {hovered.pct}%
          </span>
        </div>
      )}
    </div>
  )
}
