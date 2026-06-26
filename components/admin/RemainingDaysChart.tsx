"use client"

import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { TYPE } from "@/lib/admin-typography"

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function progressColor(pctRemaining: number) {
  if (pctRemaining <= 20) return COLORS.maroon
  if (pctRemaining <= 50) return COLORS.amber
  return COLORS.green
}

export default function RemainingDaysChart({
  endDate,
  startDate,
}: {
  endDate: string
  startDate: string
}) {
  const end = parseLocalDate(endDate)
  const start = parseLocalDate(startDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalDays = Math.max(1, daysBetween(start, end))
  const daysRemaining = Math.max(0, daysBetween(today, end))
  const daysElapsed = Math.min(totalDays, totalDays - daysRemaining)
  const pctElapsed = Math.round((daysElapsed / totalDays) * 100)
  const pctRemaining = Math.round((daysRemaining / totalDays) * 100)
  const color = progressColor(pctRemaining)
  const endLabel = formatShortDate(end)

  return (
    <div
      style={{
        width: "100%",
        marginBottom: 12,
      }}
      title={`${daysRemaining} days until ${endLabel}`}
      aria-label={`${daysRemaining} days remaining until ${endLabel}`}
    >
      <div
        style={{
          ...TYPE.caption,
          fontWeight: 700,
          color: COLORS.textDark,
          marginBottom: 6,
          whiteSpace: "nowrap",
        }}
      >
        {daysRemaining} days left
        <span style={{ fontWeight: 400, color: COLORS.textGray }}>
          {" "}
          · until {endLabel}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: COLORS.track,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pctElapsed}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  )
}
