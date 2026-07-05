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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export default function AdminCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}) {
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

  const dateForDay = (d: number) => new Date(current.year, current.month, d)

  const isToday = (d: number) => isSameDay(dateForDay(d), today)

  const isSelected = (d: number) => isSameDay(dateForDay(d), selectedDate)

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
          if (d === null) {
            return (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  padding: "5px 2px",
                  color: "transparent",
                }}
              />
            )
          }

          const selected = isSelected(d)
          const todayCell = isToday(d)

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDate(dateForDay(d))}
              aria-label={`Select ${MONTHS[current.month]} ${d}, ${current.year}`}
              aria-pressed={selected}
              style={{
                textAlign: "center",
                fontSize: 12,
                padding: "5px 2px",
                borderRadius: selected ? "50%" : 6,
                color: selected ? "#fff" : COLORS.textDark,
                background: selected ? COLORS.maroon : "transparent",
                fontWeight: selected ? 700 : 400,
                lineHeight: 1,
                border: todayCell && !selected ? `1px solid ${COLORS.maroon}` : "none",
                cursor: "pointer",
                fontFamily: FONT_BODY,
              }}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
