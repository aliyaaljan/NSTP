"use client"

import { C } from "./theme"

export function StatsCards({
  isMobile,
  totalScans,
  onTimeCount,
  lateCount,
}: {
  isMobile: boolean
  totalScans: number
  onTimeCount: number
  lateCount: number
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3, 1fr)",
        gap: isMobile ? "4px" : "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          background: C.cardBg,
          borderRadius: "8px",
          padding: isMobile ? "8px 4px" : "16px 20px",
          border: `1px solid ${C.border}`,
          textAlign: "center",
          boxShadow: C.cardShadow,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "14px" : "28px",
            fontWeight: 800,
            color: C.textDark,
          }}
        >
          {totalScans}
        </div>
        <div
          style={{
            fontSize: isMobile ? "8px" : "12px",
            color: C.textGray,
            fontWeight: 500,
            marginTop: "1px",
          }}
        >
          Total
        </div>
      </div>
      <div
        style={{
          background: C.cardBg,
          borderRadius: "8px",
          padding: isMobile ? "8px 4px" : "16px 20px",
          border: `1px solid ${C.border}`,
          textAlign: "center",
          boxShadow: C.cardShadow,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "14px" : "28px",
            fontWeight: 800,
            color: C.success,
          }}
        >
          {onTimeCount}
        </div>
        <div
          style={{
            fontSize: isMobile ? "8px" : "12px",
            color: C.textGray,
            fontWeight: 500,
            marginTop: "1px",
          }}
        >
          On Time
        </div>
      </div>
      <div
        style={{
          background: C.cardBg,
          borderRadius: "8px",
          padding: isMobile ? "8px 4px" : "16px 20px",
          border: `1px solid ${C.border}`,
          textAlign: "center",
          boxShadow: C.cardShadow,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "14px" : "28px",
            fontWeight: 800,
            color: C.warning,
          }}
        >
          {lateCount}
        </div>
        <div
          style={{
            fontSize: isMobile ? "8px" : "12px",
            color: C.textGray,
            fontWeight: 500,
            marginTop: "1px",
          }}
        >
          Late
        </div>
      </div>
    </div>
  )
}
