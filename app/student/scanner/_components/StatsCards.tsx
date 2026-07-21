"use client"

import { useState } from "react"
import { IconClock, IconCheck, IconUserX } from "@tabler/icons-react"
import { C } from "./theme"

export function StatsCards({
  isMobile,
  totalScans,
  presentCount,
  averageHours,
  notScannedCount,
  selectedMonth,
  selectedWeek,
  onCardClick,
  activeFilter,
}: {
  isMobile: boolean
  totalScans: number
  presentCount: number
  averageHours: number
  notScannedCount: number
  selectedMonth?: string
  selectedWeek?: string
  onCardClick?: (filterType: "present" | "not-scanned") => void
  activeFilter?: "present" | "not-scanned" | null
}) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const presentColor = {
    bg: "#C8D8C0",
    text: "#2D5C3A",
    border: "#8AAE8A",
    icon: "#3A7A4A",
  }

  const hoursColor = {
    bg: "#E8F4F8",
    text: "#1E4B5E",
    border: "#90C2D5",
    icon: "#2A6B85",
  }

  const notScannedColor = {
    bg: "#E8EDE5",
    text: "#6B7280",
    border: "#D1D5DB",
    icon: "#9CA3AF",
  }

  const stats = [
    {
      label: "Present",
      value: presentCount,
      color: presentColor,
      icon: "ti-circle-check",
      filterType: "present" as const,
      clickable: true,
    },
    {
      label: "Avg Hours", // Updated Label
      // Formats nicely: 2.5 hrs vs 0 hrs
      value: `${
        averageHours % 1 !== 0 ? averageHours.toFixed(1) : averageHours
      } hrs`,
      color: hoursColor,
      icon: "ti-clock",
      filterType: null,
      clickable: false,
    },
    {
      label: "Not Scanned",
      value: notScannedCount,
      color: notScannedColor,
      icon: "ti-user-x",
      filterType: "not-scanned" as const,
      clickable: true,
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
        return <IconCheck size={size} stroke={2} color={color} />
      case "ti-user-x":
        return <IconUserX size={size} stroke={2} color={color} />
      default:
        return null
    }
  }

  const defaultColor = "#666666"

  const isFilterActive = (filterType: "present" | "not-scanned" | null) => {
    if (!filterType) return false
    return activeFilter === filterType
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: isMobile ? "10px" : "13px",
          fontWeight: 500,
          color: "#6B7280",
          fontFamily: "'Montserrat', 'Fallback Montserrat'",
          paddingLeft: "2px",
        }}
      >
        {getTimeContext()}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? "8px" : "20px",
          width: "100%",
        }}
      >
        {stats.map((stat) => {
          const isHovered = hoveredCard === stat.label
          const isNotScanned = stat.filterType === "not-scanned"
          const isActive = isFilterActive(stat.filterType)

          return (
            <div
              key={stat.label}
              onMouseEnter={() => stat.clickable && setHoveredCard(stat.label)}
              onMouseLeave={() => stat.clickable && setHoveredCard(null)}
              onClick={() =>
                stat.clickable &&
                stat.filterType &&
                onCardClick?.(stat.filterType as any)
              }
              style={{
                position: "relative",
                flex: 1,
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "#FFFFFF",
                backgroundImage:
                  "linear-gradient(to bottom right, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0))",
                border: `2px solid ${
                  isActive
                    ? stat.color.icon
                    : isHovered
                    ? stat.color.icon
                    : "#ECECEA"
                }`,
                borderRadius: "14px",
                padding: isMobile ? "10px 14px" : "16px 18px",
                boxShadow: isActive
                  ? "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                  : isHovered
                  ? "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
                cursor: stat.clickable ? "pointer" : "default",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                overflow: "hidden",
                color: "inherit",
                transform:
                  (isActive || isHovered) && stat.clickable
                    ? "translateY(-2px)"
                    : "translateY(0)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: isMobile ? "4px" : "10px",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: isMobile ? "9px" : "11.5px",
                    fontWeight: 600,
                    color: isActive
                      ? isNotScanned
                        ? "#000000"
                        : stat.color.icon
                      : isHovered
                      ? isNotScanned
                        ? "#000000"
                        : stat.color.icon
                      : defaultColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    transition: "color .25s ease",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: isMobile ? "22px" : "34px",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  color: isActive
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : isHovered
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : defaultColor,
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
              <div
                style={{
                  position: "absolute",
                  right: "-15px",
                  bottom: "-23px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isActive ? 0.2 : isHovered ? 0.2 : 0.08,
                  color: isActive
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : isHovered
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : defaultColor,
                  pointerEvents: "none",
                  zIndex: 0,
                  transition: "all 0.3s ease",
                  transform:
                    (isActive || isHovered) && stat.clickable
                      ? "rotate(0deg) scale(1.08)"
                      : "rotate(0deg) scale(1)",
                }}
              >
                {getIcon(
                  stat.icon,
                  isMobile ? 70 : 110,
                  isActive
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : isHovered
                    ? isNotScanned
                      ? "#000000"
                      : stat.color.icon
                    : defaultColor
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
