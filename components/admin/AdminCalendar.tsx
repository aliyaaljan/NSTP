"use client"

import { useState } from "react"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export default function AdminCalendar() {
  const today = new Date()
  const [current, setCurrent] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })

  const firstDay = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  const isToday = (d: number) =>
    d === today.getDate() &&
    current.month === today.getMonth() &&
    current.year === today.getFullYear()

  const prev = () =>
    setCurrent((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
    )

  const next = () =>
    setCurrent((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
    )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={prev}
          aria-label="Previous month"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: COLORS.textGray,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            fontFamily: FONT_BODY,
            fontSize: 16,
          }}
        >
          ‹
        </button>
        <span style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
          {MONTHS[current.month]} {current.year}
        </span>
        <button
          type="button"
          onClick={next}
          aria-label="Next month"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: COLORS.textGray,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            fontFamily: FONT_BODY,
            fontSize: 16,
          }}
        >
          ›
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 700,
              color: COLORS.textGray,
              padding: "3px 0",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const todayCell = d !== null && isToday(d)
          return (
            <div
              key={i}
              style={{
                textAlign: "center",
                fontSize: 12,
                padding: "5px 2px",
                borderRadius: todayCell ? "50%" : 6,
                color: d === null ? "transparent" : todayCell ? "#fff" : COLORS.textDark,
                background: todayCell ? COLORS.maroon : "transparent",
                fontWeight: todayCell ? 700 : 400,
                lineHeight: 1,
              }}
            >
              {d ?? ""}
            </div>
          )
        })}
      </div>
    </div>
  )
}
