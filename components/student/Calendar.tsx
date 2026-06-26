"use client"

import { useState, useEffect, useRef } from "react"

const COLORS = {
  maroon: "#7B1113",
  gold: "#F3AA2C",
  border: "#DDDDDD",
  text: "#2C2C2A",
  muted: "#888888",
  white: "#FFFFFF",
  disabled: "#BBBBBB",
  green: "#2E7D32",
  yellow: "#F9A825",
  hover: "#F5F5F5",
  hoverDark: "#E8E8E8",
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
]
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

export interface CalendarEvent {
  day: number
  month: number
  title: string
  type: 'holiday' | 'deadline' | 'submitted'
  status?: 'submitted' | 'pending'
  note?: string
}

export interface CalendarOverviewProps {
  month?: number
  year?: number
  documentEvents?: CalendarEvent[]
  renderedDaysByMonth?: Record<number, number[]>
  renderedTimeByMonth?: Record<number, Record<number, string>>
  onMonthChange?: (year: number, month: number) => void
  onDayClick?: (day: number, event?: CalendarEvent) => void
  onRenderedDayClick?: (day: number) => void
}

// Manual typings of holidays and docs deadline
const HOLIDAYS: CalendarEvent[] = [
  // Holidays
  { day: 1, month: 0, title: "New Year's Day", type: 'holiday' },
  { day: 6, month: 1, title: "Chinese/Lunar New Year", type: 'holiday' },
  { day: 23, month: 1, title: "Commemoration of Ibaloy Day", type: 'holiday' },
  { day: 25, month: 2, title: "Maundy Thursday", type: 'holiday' },
  { day: 26, month: 2, title: "Good Friday", type: 'holiday' },
  { day: 27, month: 2, title: "Black Saturday", type: 'holiday' },
  { day: 9, month: 3, title: "Araw ng Kagitingan", type: 'holiday' },
  { day: 1, month: 4, title: "Labor Day", type: 'holiday' },
  { day: 12, month: 5, title: "Independence Day", type: 'holiday' },
  { day: 15, month: 6, title: "Cordillera Day", type: 'holiday' },
  { day: 21, month: 7, title: "Ninoy Aquino Day", type: 'holiday' },
  { day: 31, month: 7, title: "National Heroes Day", type: 'holiday' },
  { day: 1, month: 8, title: "Baguio Charter Day", type: 'holiday' },
  { day: 13, month: 8, title: "Commemoration of the 1986 Sipat Peace Talks", type: 'holiday' },
  { day: 1, month: 10, title: "All Saints Day", type: 'holiday' },
  { day: 2, month: 10, title: "All Souls Day", type: 'holiday' },
  { day: 30, month: 10, title: "Bonifacio Day", type: 'holiday' },
  { day: 8, month: 11, title: "Feast of the Immaculate Conception of Mary", type: 'holiday' },
  { day: 24, month: 11, title: "Christmas Eve", type: 'holiday' },
  { day: 25, month: 11, title: "Christmas Day", type: 'holiday' },
  { day: 30, month: 11, title: "Rizal Day", type: 'holiday' },
  { day: 31, month: 11, title: "Last Day of the Year", type: 'holiday' },
]

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function CalendarOverview({
  month,
  year,
  documentEvents = [],
  renderedDaysByMonth = {},
  renderedTimeByMonth = {},
  onMonthChange,
  onDayClick,
  onRenderedDayClick,
}: CalendarOverviewProps) {
  const today = new Date()
  const [isClient, setIsClient] = useState(false)
  const [currentYear, setCurrentYear] = useState(year ?? today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(month ?? today.getMonth())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<{ event: CalendarEvent; day: number } | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ events: CalendarEvent[]; day: number } | null>(null)
  const [selectedRenderedDay, setSelectedRenderedDay] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isVerySmall, setIsVerySmall] = useState(false)
  const [selectedPickerMonth, setSelectedPickerMonth] = useState<number | null>(null)
  const monthBtnRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsVerySmall(width < 380)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle click outside to close month picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMonthPicker && 
          pickerRef.current && 
          !pickerRef.current.contains(event.target as Node) &&
          monthBtnRef.current &&
          !monthBtnRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMonthPicker])

  const getRenderedDaysForMonth = () => {
    const allDays = renderedDaysByMonth[currentMonth] || []
    const todayDay = today.getDate()
    const todayMonth = today.getMonth()
    const todayYear = today.getFullYear()

    if (currentYear === todayYear && currentMonth === todayMonth) {
      return allDays.filter(day => day <= todayDay)
    }
    if (currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth)) {
      return allDays
    }
    return []
  }

  const renderedDays = getRenderedDaysForMonth()
  const renderedTime: { [key: number]: string } = {}
  const allRenderedTime = renderedTimeByMonth[currentMonth] || {}
  renderedDays.forEach(day => {
    if (allRenderedTime[day]) {
      renderedTime[day] = allRenderedTime[day]
    }
  })

  const allEvents = [...HOLIDAYS, ...documentEvents]
  const currentMonthEvents = allEvents.filter(e => e.month === currentMonth)
  const eventMap = new Map<number, CalendarEvent[]>()
  currentMonthEvents.forEach(e => {
    if (!eventMap.has(e.day)) {
      eventMap.set(e.day, [])
    }
    eventMap.get(e.day)!.push(e)
  })

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true })
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({ day: nextDay++, inMonth: false })
  }

  const navigate = (delta: number) => {
    let m = currentMonth + delta
    let y = currentYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCurrentMonth(m)
    setCurrentYear(y)
    onMonthChange?.(y, m)
  }

  const goToToday = () => {
    const d = new Date()
    setCurrentYear(d.getFullYear())
    setCurrentMonth(d.getMonth())
    onMonthChange?.(d.getFullYear(), d.getMonth())
  }

  const goToMonth = (m: number, y: number) => {
    setCurrentMonth(m)
    setCurrentYear(y)
    setSelectedPickerMonth(null)
    onMonthChange?.(y, m)
    setShowMonthPicker(false)
  }

  const handleDayClick = (day: number, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length > 0) {
      if (dayEvents.length === 1) {
        setSelectedEvent({ event: dayEvents[0], day })
        onDayClick?.(day, dayEvents[0])
      } else {
        setSelectedDayEvents({ events: dayEvents, day })
        onDayClick?.(day, dayEvents[0])
      }
    }
  }

  const handleRenderedDayClick = (day: number) => {
    setSelectedRenderedDay(day)
    onRenderedDayClick?.(day)
  }

  const isHoliday = (day: number) => {
    return HOLIDAYS.some(e => e.month === currentMonth && e.day === day && e.type === 'holiday')
  }

  const isFutureDate = (day: number) => {
    if (currentYear > today.getFullYear()) return true
    if (currentYear === today.getFullYear() && currentMonth > today.getMonth()) return true
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day > today.getDate()) return true
    return false
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
        setSelectedDayEvents(null)
        setSelectedRenderedDay(null)
        setShowMonthPicker(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const getDayIndicator = (events: CalendarEvent[]) => {
    const hasHoliday = events.some(e => e.type === 'holiday')
    const hasDocuments = events.some(e => e.type === 'deadline' || e.type === 'submitted')
    const totalDocs = events.filter(e => e.type === 'deadline' || e.type === 'submitted').length

    if (hasDocuments) {
      if (totalDocs >= 2) {
        return { type: 'multiple', count: totalDocs - 1, color: COLORS.maroon }
      } else {
        return { type: 'single', color: COLORS.maroon }
      }
    }

    if (hasHoliday) return { type: 'holiday' }
    return null
  }

  const getEventLabel = (event: CalendarEvent) => {
    if (event.type === 'holiday') return 'HOLIDAY'
    if (event.type === 'submitted') return 'SUBMITTED'
    if (event.type === 'deadline') return 'PENDING'
    return ''
  }

  // Responsive sizes
  const cellSize = isVerySmall ? 24 : isMobile ? 28 : 32
  const fontSize = isVerySmall ? 10 : isMobile ? 11 : 12
  const indicatorWidth = isVerySmall ? 12 : isMobile ? 16 : 20
  const dayLabelSize = isVerySmall ? 9 : isMobile ? 10 : 11
  const legendFontSize = isVerySmall ? 9 : isMobile ? 10 : 11
  const gridGap = isVerySmall ? 0 : isMobile ? 1 : 2

  // Month picker responsive sizes
  const pickerWidth = isMobile ? Math.min(200, window.innerWidth - 32) : Math.min(240, window.innerWidth - 24)
  const pickerPadding = isMobile ? "10px 12px 12px" : "14px 16px 16px"
  const pickerFontSize = isMobile ? "12px" : "15px"
  const pickerBtnFontSize = isMobile ? "10px" : "11px"
  const pickerBtnPadding = isMobile ? "4px 3px" : "6px 4px"
  const pickerYearFontSize = isMobile ? "13px" : "15px"
  const pickerNavBtnSize = isMobile ? "12px" : "14px"
  const pickerGap = isMobile ? "2px" : "4px"

  return (
    <div 
      ref={containerRef}
      style={{
        ...styles.container,
        padding: isVerySmall ? "10px 6px 12px" : isMobile ? "16px 12px 16px" : "24px 20px 20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: 'relative' as const,
      }}
    >
      <div style={{
        ...styles.header,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "10px" : "0",
        alignItems: isMobile ? "stretch" : "center",
        flexShrink: 0,
        marginBottom: isVerySmall ? "10px" : "16px",
        position: 'relative' as const,
        zIndex: 10,
      }}>
        <div style={{
          ...styles.leftGroup,
          justifyContent: isMobile ? "center" : "flex-start",
          width: isMobile ? "100%" : "auto",
          gap: isVerySmall ? "1px" : "2px",
          position: 'relative' as const,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              ...styles.iconBtn,
              width: isVerySmall ? "28px" : "36px",
              height: isVerySmall ? "28px" : "36px",
              fontSize: isVerySmall ? "18px" : "22px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            ‹
          </button>

          <button
            ref={monthBtnRef}
            onClick={() => {
              setShowMonthPicker(!showMonthPicker)
              if (!showMonthPicker) {
                setSelectedPickerMonth(currentMonth)
              }
            }}
            style={{
              ...styles.monthBtn,
              padding: isVerySmall ? "4px 6px" : isMobile ? "6px 10px" : "6px 14px",
              width: isMobile ? "auto" : "190px",
              fontSize: isVerySmall ? "12px" : isMobile ? "13px" : "15px",
              gap: isVerySmall ? "4px" : "8px",
              background: showMonthPicker ? COLORS.hover : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!showMonthPicker) {
                e.currentTarget.style.background = COLORS.hover
              }
            }}
            onMouseLeave={(e) => {
              if (!showMonthPicker) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span style={styles.monthText}>{MONTHS[currentMonth]}</span>
            <span style={styles.yearText}>{currentYear}</span>
            <span style={styles.arrowDown}>{showMonthPicker ? '▴' : '▾'}</span>
          </button>

          <button
            onClick={() => navigate(1)}
            style={{
              ...styles.iconBtn,
              width: isVerySmall ? "28px" : "36px",
              height: isVerySmall ? "28px" : "36px",
              fontSize: isVerySmall ? "18px" : "22px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            ›
          </button>

          {showMonthPicker && (
            <div
              ref={pickerRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: isMobile ? '4px' : '6px',
                width: pickerWidth,
                background: COLORS.white,
                borderRadius: isMobile ? '10px' : '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                border: `1px solid ${COLORS.border}`,
                padding: pickerPadding,
                zIndex: 100,
              }}
            >
              {/* Year navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isMobile ? '8px' : '12px',
              }}>
                <button
                  onClick={() => {
                    setCurrentYear(y => y - 1)
                    setSelectedPickerMonth(null)
                  }}
                  style={{
                    padding: isMobile ? '1px 8px' : '2px 10px',
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.white,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: pickerNavBtnSize,
                    color: COLORS.text,
                    transition: 'all 0.15s',
                    minWidth: isMobile ? '28px' : '32px',
                    minHeight: isMobile ? '24px' : '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.white
                  }}
                >
                  ‹
                </button>
                <span style={{
                  fontWeight: 700,
                  fontSize: pickerYearFontSize,
                  color: COLORS.text,
                }}>{currentYear}</span>
                <button
                  onClick={() => {
                    setCurrentYear(y => y + 1)
                    setSelectedPickerMonth(null)
                  }}
                  style={{
                    padding: isMobile ? '1px 8px' : '2px 10px',
                    border: `1px solid ${COLORS.border}`,
                    background: COLORS.white,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: pickerNavBtnSize,
                    color: COLORS.text,
                    transition: 'all 0.15s',
                    minWidth: isMobile ? '28px' : '32px',
                    minHeight: isMobile ? '24px' : '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = COLORS.white
                  }}
                >
                  ›
                </button>
              </div>

              {/* Month grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: pickerGap,
              }}>
                {MONTHS.map((name, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToMonth(idx, currentYear)}
                    style={{
                      padding: pickerBtnPadding,
                      fontSize: pickerBtnFontSize,
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: `1px solid ${selectedPickerMonth === idx ? COLORS.maroon : 'transparent'}`,
                      background: selectedPickerMonth === idx ? COLORS.maroon : 'transparent',
                      color: selectedPickerMonth === idx ? COLORS.white : COLORS.text,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      minHeight: isMobile ? '28px' : '32px',
                      letterSpacing: isMobile ? '0.2px' : '0.3px',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPickerMonth !== idx) {
                        e.currentTarget.style.background = COLORS.hover
                        e.currentTarget.style.borderColor = COLORS.border
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPickerMonth !== idx) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'transparent'
                      }
                    }}
                  >
                    {isMobile ? name.slice(0, 3) : name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={goToToday}
          style={{
            ...styles.todayBtn,
            width: isMobile ? "100%" : "auto",
            textAlign: "center",
            padding: isVerySmall ? "4px 12px" : isMobile ? "6px 16px" : "6px 16px",
            fontSize: isVerySmall ? "11px" : isMobile ? "12px" : "13px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.hover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.white
          }}
        >
          Today
        </button>
      </div>

      {/* Event Popup */}
      {selectedEvent && (
        <div style={styles.overlay} onClick={() => setSelectedEvent(null)}>
          <div style={{
            ...styles.eventPopup,
            maxWidth: isVerySmall ? "95%" : isMobile ? "90%" : "380px",
            padding: isVerySmall ? "16px" : isMobile ? "20px" : "28px",
            minHeight: isVerySmall ? "120px" : isMobile ? "140px" : "160px",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.eventPopupHeader}>
              <span style={{
                ...styles.eventPopupDate,
                fontSize: isVerySmall ? "11px" : isMobile ? "13px" : "15px",
              }}>
                {MONTH_NAMES_SHORT[currentMonth]} {selectedEvent.day}, {currentYear}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  ...styles.closeBtn,
                  fontSize: isVerySmall ? "16px" : isMobile ? "20px" : "22px",
                  padding: isVerySmall ? "4px 8px" : isMobile ? "6px 10px" : "8px 12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = COLORS.maroon
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = COLORS.muted
                }}
              >
                ✕
              </button>
            </div>
            <div style={styles.eventPopupBody}>
              <div style={{
                ...styles.eventPopupTitle,
                fontSize: isVerySmall ? "15px" : isMobile ? "18px" : "20px",
                marginBottom: isVerySmall ? "4px" : isMobile ? "8px" : "12px",
              }}>{selectedEvent.event.title}</div>
              <div style={styles.eventPopupType}>
                <span style={{
                  ...styles.typeBadge,
                  background: selectedEvent.event.type === 'holiday' ? COLORS.green : COLORS.maroon,
                  color: 'white',
                  fontSize: isVerySmall ? "9px" : isMobile ? "11px" : "12px",
                  padding: isVerySmall ? "3px 8px" : isMobile ? "4px 12px" : "5px 14px",
                }}>
                  {getEventLabel(selectedEvent.event)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Events Popup */}
      {selectedDayEvents && (
        <div style={styles.overlay} onClick={() => setSelectedDayEvents(null)}>
          <div style={{
            ...styles.eventPopup,
            maxWidth: isVerySmall ? "95%" : isMobile ? "92%" : "420px",
            padding: isVerySmall ? "16px" : isMobile ? "20px" : "28px",
            maxHeight: isVerySmall ? "70vh" : isMobile ? "75vh" : "85vh",
            minHeight: isVerySmall ? "150px" : isMobile ? "180px" : "200px",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.eventPopupHeader}>
              <span style={{
                ...styles.eventPopupDate,
                fontSize: isVerySmall ? "11px" : isMobile ? "13px" : "15px",
              }}>
                {MONTH_NAMES_SHORT[currentMonth]} {selectedDayEvents.day}, {currentYear}
              </span>
              <button
                onClick={() => setSelectedDayEvents(null)}
                style={{
                  ...styles.closeBtn,
                  fontSize: isVerySmall ? "16px" : isMobile ? "20px" : "22px",
                  padding: isVerySmall ? "4px 8px" : isMobile ? "6px 10px" : "8px 12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = COLORS.maroon
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = COLORS.muted
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              ...styles.eventPopupBody,
              maxHeight: isVerySmall ? "45vh" : isMobile ? "55vh" : "65vh",
              gap: isVerySmall ? "8px" : isMobile ? "12px" : "16px",
              paddingRight: isVerySmall ? "2px" : isMobile ? "4px" : "8px",
            }}>
              {selectedDayEvents.events.map((event, index) => {
                const isLast = index === selectedDayEvents.events.length - 1
                const label = getEventLabel(event)
                const isHoliday = event.type === 'holiday'

                return (
                  <div key={index}>
                    <div style={{
                      padding: isVerySmall ? "6px 0" : isMobile ? "10px 0" : "14px 0",
                    }}>
                      <div style={{
                        fontSize: isVerySmall ? "13px" : isMobile ? "15px" : "17px",
                        fontWeight: 600,
                        color: COLORS.text,
                        marginBottom: isVerySmall ? "3px" : '6px',
                      }}>{event.title}</div>
                      <div style={styles.eventPopupType}>
                        <span style={{
                          ...styles.typeBadge,
                          background: isHoliday ? COLORS.green : COLORS.maroon,
                          color: 'white',
                          fontSize: isVerySmall ? "8px" : isMobile ? "10px" : "11px",
                          padding: isVerySmall ? "2px 8px" : isMobile ? "3px 10px" : "4px 12px",
                        }}>
                          {label}
                        </span>
                      </div>
                    </div>
                    {!isLast && (
                      <div style={{
                        height: '1px',
                        background: COLORS.border,
                        margin: isVerySmall ? '4px 0' : isMobile ? '6px 0' : '8px 0',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedRenderedDay !== null && renderedTime[selectedRenderedDay] && (
        <div style={styles.overlay} onClick={() => setSelectedRenderedDay(null)}>
          <div style={{
            ...styles.eventPopup,
            maxWidth: isVerySmall ? "95%" : isMobile ? "90%" : "380px",
            padding: isVerySmall ? "16px" : isMobile ? "20px" : "28px",
            minHeight: isVerySmall ? "120px" : isMobile ? "140px" : "160px",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.eventPopupHeader}>
              <span style={{
                ...styles.eventPopupDate,
                fontSize: isVerySmall ? "11px" : isMobile ? "13px" : "15px",
              }}>
                {MONTH_NAMES_SHORT[currentMonth]} {selectedRenderedDay}, {currentYear}
              </span>
              <button
                onClick={() => setSelectedRenderedDay(null)}
                style={{
                  ...styles.closeBtn,
                  fontSize: isVerySmall ? "16px" : isMobile ? "20px" : "22px",
                  padding: isVerySmall ? "4px 8px" : isMobile ? "6px 10px" : "8px 12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = COLORS.maroon
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = COLORS.muted
                }}
              >
                ✕
              </button>
            </div>
            <div style={styles.eventPopupBody}>
              <div style={{
                ...styles.eventPopupTitle,
                fontSize: isVerySmall ? "15px" : isMobile ? "18px" : "20px",
                marginBottom: isVerySmall ? "4px" : isMobile ? "8px" : "12px",
              }}>Rendered Time</div>
              <div style={{
                ...styles.timeDisplay,
                fontSize: isVerySmall ? "20px" : isMobile ? "24px" : "28px",
              }}>{renderedTime[selectedRenderedDay]}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        ...styles.dayLabels,
        gap: gridGap,
      }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{
            ...styles.dayLabel,
            fontSize: dayLabelSize,
            padding: isVerySmall ? "2px 0" : "4px 0",
          }}>{d}</div>
        ))}
      </div>

      <div style={{
        ...styles.grid,
        flex: 1,
        minHeight: isVerySmall ? "160px" : isMobile ? "200px" : "240px",
        gap: gridGap,
        maxWidth: "100%",
        overflow: "hidden",
      }}>
        {cells.map((cell, idx) => {
          const dayEvents = cell.inMonth ? eventMap.get(cell.day) || [] : []
          const hasEvent = dayEvents.length > 0
          const isToday = cell.inMonth &&
            currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            cell.day === today.getDate()
          const isHolidayDay = cell.inMonth && isHoliday(cell.day)
          const isFuture = cell.inMonth && isFutureDate(cell.day)
          const isRendered = isClient && cell.inMonth && renderedDays.includes(cell.day) && !isHolidayDay && !isFuture
          const indicator = getDayIndicator(dayEvents)
          const isClickable = isRendered || (hasEvent && cell.inMonth)

          return (
            <div
              key={idx}
              onClick={() => {
                if (isRendered) handleRenderedDayClick(cell.day)
                else if (hasEvent && cell.inMonth) handleDayClick(cell.day, dayEvents)
              }}
              style={{
                ...styles.cell,
                cursor: isClickable ? 'pointer' : 'default',
                opacity: cell.inMonth ? 1 : 0.3,
                padding: isVerySmall ? "2px 0" : isMobile ? "3px 0" : "4px 0",
                minHeight: isVerySmall ? "28px" : isMobile ? "32px" : "36px",
              }}
              onMouseEnter={(e) => {
                if (isClickable) {
                  e.currentTarget.style.background = COLORS.hover
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{
                ...styles.dayWrapper,
                width: cellSize,
                height: cellSize,
                fontSize: fontSize,
                background: isToday ? COLORS.gold : 'transparent',
                color: isToday ? COLORS.white : COLORS.text,
                minWidth: cellSize,
                minHeight: cellSize,
              }}>
                {cell.day}
                {isClient && isRendered && !isToday && (
                  <div style={{
                    ...styles.renderedDot,
                    width: isVerySmall ? "6px" : "8px",
                    height: isVerySmall ? "6px" : "8px",
                    borderWidth: isVerySmall ? "1px" : "2px",
                    bottom: isVerySmall ? "-1px" : "-2px",
                    right: isVerySmall ? "-1px" : "-2px",
                  }} />
                )}
              </div>

              {hasEvent && cell.inMonth && indicator && (
                <>
                  <div style={{
                    ...styles.eventIndicator,
                    background: indicator.type === 'holiday' ? COLORS.green : indicator.color,
                    width: indicatorWidth,
                    height: isVerySmall ? "3px" : "4px",
                    borderRadius: '3px',
                    marginTop: isVerySmall ? "1px" : "2px",
                  }} />

                  {indicator.type === 'multiple' && indicator.count !== undefined && indicator.count > 0 && (
                    <div style={{
                      fontSize: isVerySmall ? "6px" : isMobile ? "7px" : "8px",
                      fontWeight: 700,
                      color: indicator.color,
                      lineHeight: 1,
                      marginTop: isVerySmall ? "0px" : "1px",
                    }}>
                      +{indicator.count}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        ...styles.legend,
        gap: isVerySmall ? "6px" : isMobile ? "10px" : "16px",
        flexWrap: "wrap",
        flexShrink: 0,
        marginTop: "auto",
        paddingTop: isVerySmall ? "6px" : isMobile ? "10px" : "12px",
      }}>
        <div style={styles.legendItem}>
          <div style={{
            ...styles.legendDot,
            background: COLORS.gold,
            borderRadius: '50%',
            width: isVerySmall ? "10px" : "12px",
            height: isVerySmall ? "10px" : "12px",
          }} />
          <span style={{ fontSize: legendFontSize }}>Today</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{
            ...styles.legendDot,
            background: COLORS.green,
            borderRadius: '3px',
            height: isVerySmall ? "3px" : "4px",
            width: isVerySmall ? "8px" : "10px",
          }} />
          <span style={{ fontSize: legendFontSize }}>Holiday</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{
            ...styles.legendDot,
            background: COLORS.maroon,
            borderRadius: '3px',
            height: isVerySmall ? "3px" : "4px",
            width: isVerySmall ? "8px" : "10px",
          }} />
          <span style={{ fontSize: legendFontSize }}>Document</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{
            width: isVerySmall ? "5px" : "6px",
            height: isVerySmall ? "5px" : "6px",
            borderRadius: '50%',
            background: COLORS.gold,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: legendFontSize }}>Rendered</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    background: COLORS.white,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
    width: '100%',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexShrink: 0,
    position: 'relative' as const,
    zIndex: 10,
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    minWidth: '200px',
    position: 'relative' as const,
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '22px',
    color: COLORS.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    padding: 0,
    flexShrink: 0,
  },
  monthBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
    color: COLORS.text,
    transition: 'background 0.15s',
    justifyContent: 'center',
    flexShrink: 0,
  },
  monthText: {
    fontWeight: 700,
  },
  yearText: {
    fontWeight: 400,
    color: COLORS.muted,
  },
  arrowDown: {
    fontSize: '12px',
    color: COLORS.muted,
    marginLeft: '2px',
  },
  todayBtn: {
    padding: '6px 16px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.white,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: COLORS.text,
    transition: 'all 0.15s',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  popup: {
    background: COLORS.white,
    borderRadius: '16px',
    padding: '24px',
    width: '280px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  popupYear: {
    fontWeight: 700,
    fontSize: '18px',
  },
  popupNav: {
    padding: '4px 12px',
    border: `1px solid ${COLORS.border}`,
    background: COLORS.white,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.15s',
  },
  popupGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  monthOption: {
    padding: '10px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'all 0.15s',
    background: 'transparent',
  },
  closePopupBtn: {
    width: '100%',
    padding: '8px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: COLORS.muted,
    transition: 'all 0.15s',
    marginTop: '4px',
  },
  eventPopup: {
    background: COLORS.white,
    borderRadius: '20px',
    padding: '28px',
    maxWidth: '420px',
    width: '90%',
    boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '160px',
  },
  eventPopupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexShrink: 0,
  },
  eventPopupDate: {
    fontWeight: 600,
    fontSize: '15px',
    color: COLORS.muted,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: COLORS.muted,
    padding: '8px 12px',
    transition: 'color 0.15s',
    borderRadius: '8px',
  },
  eventPopupBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    flex: 1,
    overflowY: 'auto' as const,
    paddingRight: '8px',
  },
  eventPopupTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: COLORS.text,
    lineHeight: 1.4,
  },
  eventPopupType: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  statusBadge: {
    borderRadius: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap' as const,
  },
  typeBadge: {
    borderRadius: '12px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  timeDisplay: {
    fontSize: '28px',
    fontWeight: 700,
    color: COLORS.maroon,
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  dayLabels: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: '4px',
    flexShrink: 0,
  },
  dayLabel: {
    textAlign: 'center' as const,
    fontWeight: 600,
    color: COLORS.disabled,
    padding: '4px 0',
    letterSpacing: '0.3px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    width: '100%',
  },
  cell: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '4px 0',
    borderRadius: '8px',
    transition: 'all 0.15s',
    position: 'relative' as const,
    minHeight: '36px',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  dayWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontWeight: 500,
    position: 'relative' as const,
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  renderedDot: {
    position: 'absolute' as const,
    bottom: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: COLORS.gold,
    border: `2px solid ${COLORS.white}`,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  eventIndicator: {
    height: '4px',
    borderRadius: '3px',
    marginTop: '2px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${COLORS.border}`,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: COLORS.muted,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    flexShrink: 0,
  },
} as const