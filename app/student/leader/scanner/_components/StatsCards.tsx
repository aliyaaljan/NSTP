"use client"

import { useState } from "react"
import { IconClock, IconClockPause, IconUserX } from "@tabler/icons-react"
import { C } from "./theme"

export function StatsCards({
  isMobile,
  totalScans,
  onTimeCount,
  lateCount,
  notScannedCount,
  selectedMonth,
  selectedWeek,
}: {
  isMobile: boolean
  totalScans: number
  onTimeCount: number
  lateCount: number
  notScannedCount: number
  selectedMonth?: string
  selectedWeek?: string
}) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const onTimeColor = {
    bg: "#C8D8C0",
    text: "#2D5C3A",
    border: "#8AAE8A",
    icon: "#3A7A4A",
  }

  const lateColor = {
    bg: "#F5E6C0",
    text: "#8B5E1A",
    border: "#D4A840",
    icon: "#C8882A",
  }

  const notScannedColor = {
    bg: "#E8EDE5",
    text: "#6B7280",
    border: "#D1D5DB",
    icon: "#9CA3AF",
  }

  const stats = [
    {
      label: "On Time",
      value: onTimeCount,
      color: onTimeColor,
      icon: "ti-circle-check",
    },
    {
      label: "Late",
      value: lateCount,
      color: lateColor,
      icon: "ti-clock",
    },
    {
      label: "Not Scanned",
      value: notScannedCount,
      color: notScannedColor,
      icon: "ti-user-x",
    },
  ]

  // Get the time period
  const getTimeContext = () => {
    if (selectedMonth && selectedWeek && selectedWeek !== "all") {
      return `${selectedMonth} (Week ${selectedWeek.replace("week-", "")})`
    } else if (selectedMonth && selectedWeek === "all") {
      return `${selectedMonth} (All Weeks)`
    } else if (selectedMonth) {
      return `${selectedMonth}`
    } else {
      return "All Records"
    }
  }

  const getIcon = (iconName: string, size: number, color: string) => {
    switch (iconName) {
      case "ti-circle-check":
        return <IconClock size={size} stroke={2} color={color} />
      case "ti-clock":
        return <IconClockPause size={size} stroke={2} color={color} />
      case "ti-user-x":
        return <IconUserX size={size} stroke={2} color={color} />
      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: isMobile ? "11px" : "13px",
          fontWeight: 500,
          color: "#6B7280",
          fontFamily: "'Montserrat', 'Fallback Montserrat'",
          paddingLeft: "2px",
        }}
      >
        {getTimeContext()}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "8px" : "20px",
          width: "100%",
        }}
      >
        {stats.map((stat) => {
          const isHovered = hoveredCard === stat.label

          return (
            <div
              key={stat.label}
              onMouseEnter={() => setHoveredCard(stat.label)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                position: "relative",
                flex: 1,
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "#FFFFFF",
                backgroundImage: "linear-gradient(to bottom right, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0))",
                border: `1px solid ${isHovered ? stat.color.icon : "#ECECEA"}`,
                borderRadius: "14px",
                padding: "16px 18px",
                boxShadow: isHovered 
                  ? "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                transform: isHovered ? "translateY(-2px)" : "translateY(0)",
              }}
            >
              {/* Header with label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: isHovered ? stat.color.icon : "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    transition: "color .25s ease",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  }}
                >
                  {stat.label}
                </span>
              </div>

              {/* Value */}
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  color: isHovered ? stat.color.icon : "#111827",
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "baseline",
                  gap: "4px",
                  transition: "color .25s ease",
                }}
              >
                {stat.value}
              </div>

              {/* Icon */}
              <div
                style={{
                  position: "absolute",
                  right: "-15px",
                  bottom: "-23px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isHovered ? 0.2 : 0.08,
                  color: isHovered ? stat.color.icon : "#000000",
                  pointerEvents: "none",
                  zIndex: 0,
                  transition: "all 0.3s ease",
                  transform: isHovered ? "rotate(0deg) scale(1.08)" : "rotate(0deg) scale(1)",
                }}
              >
                {getIcon(stat.icon, 110, isHovered ? stat.color.icon : "#000000")}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}