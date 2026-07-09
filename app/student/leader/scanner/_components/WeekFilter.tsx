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
    onSelectWeek("all")
  }

  const navigateYear = (delta: number) => {
    setPickerYear((prev) => prev + delta)
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
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
        width: rect.width,
      })
    }
  }, [isDropdownOpen])

  const dropdownWidth = isMobile ? "180px" : "200px"

  // Pill style constants
  const pillActiveColor = '#2D6A4F'
  const pillActiveBg = 'rgba(45,106,79,0.10)'
  const pillBorderColor = '#E5E7EB'
  const pillTextColor = '#6B7280'
  const pillHoverBg = '#F5F5F5'
  const pillHoverBorder = '#6B7280'
  const pillHeight = '38px'
  const pillRadius = '999px'
  const pillPaddingX = isMobile ? "14px" : "20px"

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
            height: pillHeight,
            fontSize: isMobile ? "10px" : "12px",
            fontWeight: 600,
            padding: `0 ${pillPaddingX}`,
            borderRadius: pillRadius,
            border: `2px solid ${!selectedMonth && selectedWeek === "all" ? pillActiveColor : pillBorderColor}`,
            background: !selectedMonth && selectedWeek === "all" ? pillActiveBg : '#FFFFFF',
            color: !selectedMonth && selectedWeek === "all" ? pillActiveColor : pillTextColor,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
            fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (selectedMonth || selectedWeek !== "all") {
              e.currentTarget.style.background = pillHoverBg
              e.currentTarget.style.borderColor = pillHoverBorder
            }
          }}
          onMouseLeave={(e) => {
            if (selectedMonth || selectedWeek !== "all") {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.borderColor = pillBorderColor
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
              height: pillHeight,
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: 600,
              padding: `0 ${pillPaddingX}`,
              borderRadius: pillRadius,
              border: `2px solid ${selectedMonth ? pillActiveColor : pillBorderColor}`,
              background: selectedMonth ? pillActiveBg : '#FFFFFF',
              color: selectedMonth ? pillActiveColor : pillTextColor,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = pillHoverBg
              e.currentTarget.style.borderColor = pillHoverBorder
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedMonth ? pillActiveBg : '#FFFFFF'
              e.currentTarget.style.borderColor = selectedMonth ? pillActiveColor : pillBorderColor
            }}
          >
            <span
              style={{
                fontSize: isMobile ? "10px" : "12px",
              }}
            >
              {selectedMonth || "Select Month"}
            </span>
            <IconChevronDown
              size={isMobile ? 12 : 14}
              stroke={2}
              style={{
                color: pillTextColor,
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
                left: buttonPosition.left - (parseInt(dropdownWidth) / 2),
                width: dropdownWidth,
                background: '#FFFFFF',
                border: `1px solid ${pillBorderColor}`,
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
                padding: isMobile ? "10px" : "12px",
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
                  marginBottom: isMobile ? "8px" : "10px",
                  padding: "0 2px",
                }}
              >
                <button
                  onClick={() => navigateYear(-1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: "pointer",
                    color: '#9CA3AF',
                    display: "flex",
                    alignItems: "center",
                    padding: "2px",
                    borderRadius: "4px",
                    transition: "background 0.12s",
                    fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = pillHoverBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <IconChevronDown 
                    size={14} 
                    stroke={2} 
                    style={{ transform: 'rotate(90deg)' }}
                  />
                </button>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: isMobile ? "12px" : "13px",
                    color: '#111827',
                    fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
                  }}
                >
                  {pickerYear}
                </span>
                <button
                  onClick={() => navigateYear(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: "pointer",
                    color: '#9CA3AF',
                    display: "flex",
                    alignItems: "center",
                    padding: "2px",
                    borderRadius: "4px",
                    transition: "background 0.12s",
                    fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = pillHoverBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <IconChevronDown 
                    size={14} 
                    stroke={2} 
                    style={{ transform: 'rotate(-90deg)' }}
                  />
                </button>
              </div>

              {/* Month grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: isMobile ? "4px" : "6px",
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
                        padding: isMobile ? "4px 2px" : "6px 2px",
                        fontSize: isMobile ? "10px" : "11px",
                        fontWeight: isSelected ? 700 : isCurrent ? 700 : 500,
                        border: `2px solid ${
                          isSelected ? pillActiveColor : 'transparent'
                        }`,
                        background: isSelected
                          ? pillActiveBg
                          : isCurrent
                          ? '#7B1D1D'
                          : 'transparent',
                        color: isSelected
                          ? pillActiveColor
                          : isCurrent
                          ? '#FFFFFF'
                          : '#6B7280',
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
                        position: "relative" as const,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: isCurrent ? '50%' : '4px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isCurrent) {
                          e.currentTarget.style.background = pillHoverBg
                          e.currentTarget.style.borderColor = pillHoverBorder
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isCurrent) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = 'transparent'
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
            gap: isMobile ? "6px" : "8px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {/* Week "All" button */}
          <button
            onClick={handleWeekAllClick}
            style={{
              height: pillHeight,
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: 600,
              padding: `0 ${pillPaddingX}`,
              borderRadius: pillRadius,
              border: `2px solid ${selectedWeek === "all" ? pillActiveColor : pillBorderColor}`,
              background: selectedWeek === "all" ? pillActiveBg : '#FFFFFF',
              color: selectedWeek === "all" ? pillActiveColor : pillTextColor,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
              flex: isMobile ? "1" : "0 1 auto",
              minWidth: isMobile ? "0" : "auto",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (selectedWeek !== "all") {
                e.currentTarget.style.background = pillHoverBg
                e.currentTarget.style.borderColor = pillHoverBorder
              }
            }}
            onMouseLeave={(e) => {
              if (selectedWeek !== "all") {
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.borderColor = pillBorderColor
              }
            }}
          >
            All
          </button>

          {/* Week 1-5 buttons */}
          {[1, 2, 3, 4, 5].map((weekNum) => {
            const isSelected = selectedWeek === `week-${weekNum}`
            return (
              <button
                key={weekNum}
                onClick={() => handleWeekSelect(weekNum)}
                style={{
                  height: pillHeight,
                  fontSize: isMobile ? "10px" : "12px",
                  fontWeight: 600,
                  padding: `0 ${pillPaddingX}`,
                  borderRadius: pillRadius,
                  border: `2px solid ${isSelected ? pillActiveColor : pillBorderColor}`,
                  background: isSelected ? pillActiveBg : '#FFFFFF',
                  color: isSelected ? pillActiveColor : pillTextColor,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  fontFamily: "'Montserrat', Fallback Montserrat, sans-serif",
                  flex: isMobile ? "1" : "0 1 auto",
                  minWidth: isMobile ? "0" : "auto",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = pillHoverBg
                    e.currentTarget.style.borderColor = pillHoverBorder
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#FFFFFF'
                    e.currentTarget.style.borderColor = pillBorderColor
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