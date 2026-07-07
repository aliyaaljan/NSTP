"use client"

import { useState, useEffect, useRef } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { C } from "./theme"

export function WeekFilter({
  isMobile,
  selectedWeek,
  onSelectWeek,
  months,
  selectedMonth,
  setSelectedMonth,
  onGeneralAllClick,
}: {
  isMobile: boolean
  selectedWeek: string
  onSelectWeek: (week: string) => void
  months: string[]
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  onGeneralAllClick: () => void // General All
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const getMonthIndex = (monthStr: string) => {
    const date = new Date(monthStr)
    return Number.isNaN(date.getTime())
      ? new Date().getMonth()
      : date.getMonth()
  }

  const getYearFromMonth = (monthStr: string) => {
    const date = new Date(monthStr)
    return Number.isNaN(date.getTime())
      ? new Date().getFullYear()
      : date.getFullYear()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      setPickerYear(getYearFromMonth(selectedMonth))
      setPickerMonth(getMonthIndex(selectedMonth))
    }
  }, [selectedMonth])

  const isWeekSelected = (weekNum: number) => {
    if (selectedWeek === "all") return false
    if (selectedWeek === `week-${weekNum}`) return true
    return false
  }

  const handleWeekSelect = (weekNum: number) => {
    onSelectWeek(`week-${weekNum}`)
  }

  const handleMonthSelect = (monthIndex: number) => {
    const date = new Date(pickerYear, monthIndex, 1)
    const monthStr = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    setSelectedMonth(monthStr)
    setPickerMonth(monthIndex)
    setIsDropdownOpen(false)
    onSelectWeek("week-1")
  }

  const navigateYear = (delta: number) => {
    setPickerYear((prev) => prev + delta)
  }

  const goToToday = () => {
    const today = new Date()
    const monthStr = today.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    setSelectedMonth(monthStr)
    setPickerYear(today.getFullYear())
    setPickerMonth(today.getMonth())
    setIsDropdownOpen(false)
    onSelectWeek("week-1") 
  }

  // Week "All"
  const handleWeekAllClick = () => {
    onSelectWeek("all")
  }

  const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  const isSelectedMonth = (monthIndex: number) => {
    if (!selectedMonth) return false
    return (
      getMonthIndex(selectedMonth) === monthIndex &&
      getYearFromMonth(selectedMonth) === pickerYear
    )
  }

  const isCurrentMonth = (monthIndex: number) => {
    const today = new Date()
    return monthIndex === today.getMonth() && pickerYear === today.getFullYear()
  }

  const [buttonPosition, setButtonPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)

  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isDropdownOpen])

  const dropdownWidth = isMobile ? "160px" : "200px"
  const dropdownLeftOffset = isMobile ? 60 : 80

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* General "All" button */}
        <button
          onClick={onGeneralAllClick}
          style={{
            fontSize: isMobile ? "10px" : "14px",
            fontWeight: 700,
            padding: isMobile ? "4px 10px" : "10px 24px",
            borderRadius: "999px",
            border: `2px solid ${!selectedMonth && selectedWeek === "all" ? C.green : C.border}`,
            background: !selectedMonth && selectedWeek === "all" ? C.greenBg : C.cardBg,
            color: !selectedMonth && selectedWeek === "all" ? C.green : C.textGray,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
            fontFamily: "'Montserrat', sans-serif",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (selectedMonth || selectedWeek !== "all") {
              e.currentTarget.style.background = C.greenBg
              e.currentTarget.style.borderColor = C.green
            }
          }}
          onMouseLeave={(e) => {
            if (selectedMonth || selectedWeek !== "all") {
              e.currentTarget.style.background = C.cardBg
              e.currentTarget.style.borderColor = C.border
            }
          }}
        >
          All
        </button>

        {/* Month selector dropdown */}
        <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
          <div
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              fontSize: isMobile ? "10px" : "14px",
              fontWeight: 700,
              padding: isMobile ? "4px 10px" : "10px 24px",
              borderRadius: "999px",
              border: `2px solid ${selectedMonth ? C.green : C.border}`,
              background: selectedMonth ? C.greenBg : C.cardBg,
              color: selectedMonth ? C.green : C.textDark,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              fontFamily: "'Montserrat', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              minWidth: isMobile ? "auto" : "200px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.greenBg
              e.currentTarget.style.borderColor = C.green
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedMonth ? C.greenBg : C.cardBg
              e.currentTarget.style.borderColor = selectedMonth ? C.green : C.border
            }}
          >
            <span
              style={{
                fontSize: isMobile ? "9px" : "14px",
              }}
            >
              {selectedMonth || "Select Month"}
            </span>
            <IconChevronDown
              size={isMobile ? 12 : 16}
              stroke={2}
              style={{
                color: C.textGray,
                transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
                flexShrink: 0,
              }}
            />
          </div>

          {/* Dropdown menu */}
          {isDropdownOpen && buttonPosition && (
            <div
              style={{
                position: "fixed",
                top: buttonPosition.top,
                left:
                  buttonPosition.left +
                  buttonPosition.width / 2 -
                  dropdownLeftOffset,
                width: dropdownWidth,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: isMobile ? "6px" : "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                padding: isMobile ? "5px" : "8px",
                zIndex: 1000,
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              {/* Year navigation */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: isMobile ? "3px" : "6px",
                  padding: "0 1px",
                  gap: "1px",
                }}
              >
                <button
                  onClick={() => navigateYear(-1)}
                  style={{
                    padding: isMobile ? "1px 4px" : "2px 8px",
                    border: `1px solid ${C.border}`,
                    background: C.cardBg,
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: isMobile ? "10px" : "12px",
                    color: C.textDark,
                    transition: "all 0.15s",
                    minWidth: isMobile ? "18px" : "28px",
                    minHeight: isMobile ? "16px" : "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.greenBg
                    e.currentTarget.style.borderColor = C.green
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.cardBg
                    e.currentTarget.style.borderColor = C.border
                  }}
                >
                  ‹
                </button>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: isMobile ? "10px" : "13px",
                    color: C.textDark,
                  }}
                >
                  {pickerYear}
                </span>
                <button
                  onClick={() => navigateYear(1)}
                  style={{
                    padding: isMobile ? "1px 4px" : "2px 8px",
                    border: `1px solid ${C.border}`,
                    background: C.cardBg,
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontSize: isMobile ? "10px" : "12px",
                    color: C.textDark,
                    transition: "all 0.15s",
                    minWidth: isMobile ? "18px" : "28px",
                    minHeight: isMobile ? "16px" : "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.greenBg
                    e.currentTarget.style.borderColor = C.green
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.cardBg
                    e.currentTarget.style.borderColor = C.border
                  }}
                >
                  ›
                </button>
              </div>

              {/* Today button */}
              <button
                onClick={goToToday}
                style={{
                  width: "100%",
                  padding: isMobile ? "2px" : "4px",
                  marginBottom: isMobile ? "3px" : "6px",
                  border: `1.5px solid ${C.maroon}`,
                  background: "rgba(123, 17, 19, 0.08)",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: isMobile ? "8px" : "11px",
                  fontWeight: 600,
                  color: C.maroon,
                  transition: "all 0.15s",
                  fontFamily: "'Montserrat', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(123, 17, 19, 0.15)"
                  e.currentTarget.style.transform = "scale(1.02)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(123, 17, 19, 0.08)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                Today
              </button>

              {/* Month grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: isMobile ? "2px" : "4px",
                }}
              >
                {MONTHS_SHORT.map((monthName, idx) => {
                  const isSelected = isSelectedMonth(idx)
                  const isCurrent = isCurrentMonth(idx)

                  return (
                    <button
                      key={idx}
                      onClick={() => handleMonthSelect(idx)}
                      style={{
                        padding: isMobile ? "2px 1px" : "4px 2px",
                        fontSize: isMobile ? "8px" : "11px",
                        fontWeight: isSelected ? 700 : 600,
                        borderRadius: "2px",
                        border: `1.5px solid ${
                          isSelected ? C.green : isCurrent ? C.maroon : C.border
                        }`,
                        background: isSelected
                          ? C.greenBg
                          : isCurrent
                          ? "rgba(123, 17, 19, 0.08)"
                          : C.cardBg,
                        color: isSelected
                          ? C.green
                          : isCurrent
                          ? C.maroon
                          : C.textDark,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontFamily: "'Montserrat', sans-serif",
                        position: "relative" as const,
                        minHeight: isMobile ? "18px" : "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = C.greenBg
                          e.currentTarget.style.borderColor = C.green
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isCurrent
                            ? "rgba(123, 17, 19, 0.08)"
                            : C.cardBg
                          e.currentTarget.style.borderColor = isCurrent
                            ? C.maroon
                            : C.border
                        }
                      }}
                    >
                      {monthName}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Week options */}
      {selectedMonth && (
        <div
          style={{
            display: "flex",
            gap: "3px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Week "All" button */}
          <button
            onClick={handleWeekAllClick}
            style={{
              fontSize: isMobile ? "9px" : "14px",
              fontWeight: 600,
              padding: isMobile ? "3px 8px" : "10px 24px",
              borderRadius: "999px",
              border: `2px solid ${selectedWeek === "all" ? C.green : C.border}`,
              background: selectedWeek === "all" ? C.greenBg : C.cardBg,
              color: selectedWeek === "all" ? C.green : C.textGray,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              fontFamily: "'Montserrat', sans-serif",
              flex: isMobile ? "1" : "0 1 auto",
              minWidth: isMobile ? "0" : "auto",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (selectedWeek !== "all") {
                e.currentTarget.style.background = C.greenBg
                e.currentTarget.style.borderColor = C.green
              }
            }}
            onMouseLeave={(e) => {
              if (selectedWeek !== "all") {
                e.currentTarget.style.background = C.cardBg
                e.currentTarget.style.borderColor = C.border
              }
            }}
          >
            All
          </button>

          {[1, 2, 3, 4, 5].map((weekNum) => {
            const isSelected = selectedWeek === `week-${weekNum}`
            return (
              <button
                key={weekNum}
                onClick={() => handleWeekSelect(weekNum)}
                style={{
                  fontSize: isMobile ? "9px" : "14px",
                  fontWeight: 600,
                  padding: isMobile ? "3px 8px" : "10px 24px",
                  borderRadius: "999px",
                  border: `2px solid ${isSelected ? C.green : C.border}`,
                  background: isSelected ? C.greenBg : C.cardBg,
                  color: isSelected ? C.green : C.textGray,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  fontFamily: "'Montserrat', sans-serif",
                  flex: isMobile ? "1" : "0 1 auto",
                  minWidth: isMobile ? "0" : "auto",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = C.greenBg
                    e.currentTarget.style.borderColor = C.green
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = C.cardBg
                    e.currentTarget.style.borderColor = C.border
                  }
                }}
              >
                Week {weekNum}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}