"use client"

import { useState, useEffect, useRef } from "react"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const HOLIDAYS: CalendarEvent[] = [
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

export interface CalendarEvent {
  day: number
  month: number
  title: string
  type: "holiday" | "deadline" | "submitted"
  note?: string
  status?: "submitted" | "pending"
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

export default function CalendarOverview({
  month,
  year,
  renderedDaysByMonth = {},
  renderedTimeByMonth = {},
  onMonthChange,
  onDayClick,
  onRenderedDayClick,
}: CalendarOverviewProps) {
  const today = new Date()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [currentYear, setCurrentYear] = useState(year ?? today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(month ?? today.getMonth())
  const [selectedEvent, setSelectedEvent] = useState<{ event: CalendarEvent; day: number } | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ events: CalendarEvent[]; day: number } | null>(null)
  const [selectedRenderedDay, setSelectedRenderedDay] = useState<number | null>(null)
  const [rowGap, setRowGap] = useState<number>(8)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Row gap calculation based on container height
  useEffect(() => {
    const calculateRowGap = () => {
      if (!containerRef.current) return
      
      const container = containerRef.current
      const containerHeight = container.clientHeight
      
      // Fixed heights
      const headerHeight = 45 
      const legendHeight = 50 
      const dayLabelsHeight = 30
      const padding = 56 
      const cellMinHeight = 32 
      const totalRows = 6 
      
      const availableHeight = containerHeight - headerHeight - legendHeight - dayLabelsHeight - padding
      const maxRowGap = (availableHeight - (cellMinHeight * totalRows)) / (totalRows - 1)
      setRowGap(Math.max(4, Math.min(40, maxRowGap)))
    }
    
    const timer = setTimeout(calculateRowGap, 50)
    window.addEventListener('resize', calculateRowGap)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', calculateRowGap)
    }
  }, [currentMonth, currentYear])

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

  const allEvents = [...HOLIDAYS]
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

  const isHoliday = (day: number) => {
    return HOLIDAYS.some(e => e.month === currentMonth && e.day === day && e.type === 'holiday')
  }

  const isFutureDate = (day: number) => {
    if (currentYear > today.getFullYear()) return true
    if (currentYear === today.getFullYear() && currentMonth > today.getMonth()) return true
    if (currentYear === today.getFullYear() && currentMonth === today.getMonth() && day > today.getDate()) return true
    return false
  }

  const handleDayClick = (day: number, dayEvents: CalendarEvent[]) => {
    const allEventsForDay = [...dayEvents]
    
    const isRendered = isClient && renderedDays.includes(day) && !isFutureDate(day)
    const hasRenderedTime = isRendered && renderedTime[day]
    
    if (isRendered && hasRenderedTime) {
      allEventsForDay.push({
        day: day,
        month: currentMonth,
        title: "Rendered Time",
        type: 'holiday' as const,
        note: renderedTime[day]
      })
    }
    
    allEventsForDay.sort((a, b) => {
      const aIsRendered = a.title === "Rendered Time"
      const bIsRendered = b.title === "Rendered Time"
      if (aIsRendered && !bIsRendered) return 1
      if (!aIsRendered && bIsRendered) return -1
      return 0
    })

    if (allEventsForDay.length > 0) {
      if (allEventsForDay.length === 1) {
        setSelectedEvent({ event: allEventsForDay[0], day })
        onDayClick?.(day, allEventsForDay[0])
      } else {
        setSelectedDayEvents({ events: allEventsForDay, day })
        onDayClick?.(day, allEventsForDay[0])
      }
    }
  }

  const handleRenderedDayClick = (day: number) => {
    setSelectedRenderedDay(day)
    onRenderedDayClick?.(day)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEvent(null)
        setSelectedDayEvents(null)
        setSelectedRenderedDay(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const getEventLabel = (event: CalendarEvent) => {
    if (event.type === 'holiday') {
      if (event.note && event.title === "Rendered Time") {
        return 'RENDERED'
      }
      return 'HOLIDAY'
    }
    if (event.type === 'submitted') return 'SUBMITTED'
    if (event.type === 'deadline') return 'PENDING'
    return ''
  }

  // Event Popup
  const EventPopup = ({ event, day, onClose }: { event: CalendarEvent; day: number; onClose: () => void }) => {
    const isRenderedTime = event.title === "Rendered Time" && event.note
    const label = getEventLabel(event)
    const isHolidayEvent = event.type === 'holiday'

    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
          <div style={styles.popupHeader}>
            <span style={styles.popupDate}>
              {MONTHS[currentMonth]} {day}, {currentYear}
            </span>
            <button
              onClick={onClose}
              style={styles.closeButton}
            >
              <span style={{ fontSize: '20px' }}>✕</span>
            </button>
          </div>
          <div style={styles.popupBody}>
            <div style={styles.popupTitle}>
              {event.title}
              {isRenderedTime && (
                <span style={styles.renderedTimeLarge}>
                  {event.note}
                </span>
              )}
            </div>
            <div style={styles.popupBadgeContainer}>
              <span style={{
                ...styles.popupBadge,
                background: isRenderedTime ? '#1B4332' : (isHolidayEvent ? '#D97706' : '#7B1D1D'),
                color: 'white',
              }}>
                {isRenderedTime ? 'RENDERED' : label}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Multiple Events Popup
  const MultipleEventsPopup = ({ events, day, onClose }: { events: CalendarEvent[]; day: number; onClose: () => void }) => {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
          <div style={styles.popupHeader}>
            <span style={styles.popupDate}>
              {MONTHS[currentMonth]} {day}, {currentYear}
            </span>
            <button
              onClick={onClose}
              style={styles.closeButton}
            >
              <span style={{ fontSize: '20px' }}>✕</span>
            </button>
          </div>
          <div style={styles.multiplePopupBody}>
            {events.map((event, index) => {
              const isLast = index === events.length - 1
              const isRenderedTime = event.title === "Rendered Time" && event.note
              const label = getEventLabel(event)
              const isHolidayEvent = event.type === 'holiday'

              return (
                <div key={index}>
                  <div style={styles.multipleEventItem}>
                    <div style={styles.multipleEventTitle}>
                      {event.title}
                      {isRenderedTime && (
                        <span style={styles.renderedTimeLarge}>
                          {event.note}
                        </span>
                      )}
                    </div>
                    <div style={styles.popupBadgeContainer}>
                      <span style={{
                        ...styles.popupBadge,
                        background: isRenderedTime ? '#1B4332' : (isHolidayEvent ? '#D97706' : '#7B1D1D'),
                        color: 'white',
                      }}>
                        {isRenderedTime ? 'RENDERED' : label}
                      </span>
                    </div>
                  </div>
                  {!isLast && <div style={styles.popupDivider} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cal-wrap" ref={containerRef} style={styles.container}>
      {/* Month and Navigation */}
      <div style={styles.calHeader}>
        <button style={styles.calNavBtn} onClick={() => navigate(-1)}>
          <IconChevronLeft size={15} stroke={2} />
        </button>
        <span style={styles.calMonthLabel}>
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <button style={styles.calNavBtn} onClick={() => navigate(1)}>
          <IconChevronRight size={15} stroke={2} />
        </button>
      </div>

      {/* Single Event Popup */}
      {selectedEvent && (
        <EventPopup
          event={selectedEvent.event}
          day={selectedEvent.day}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Multiple Events Popup */}
      {selectedDayEvents && (
        <MultipleEventsPopup
          events={selectedDayEvents.events}
          day={selectedDayEvents.day}
          onClose={() => setSelectedDayEvents(null)}
        />
      )}

      {selectedRenderedDay !== null && renderedTime[selectedRenderedDay] && (
        <div style={styles.overlay} onClick={() => setSelectedRenderedDay(null)}>
          <div style={styles.popupContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popupHeader}>
              <span style={styles.popupDate}>
                {MONTHS[currentMonth]} {selectedRenderedDay}, {currentYear}
              </span>
              <button
                onClick={() => setSelectedRenderedDay(null)}
                style={styles.closeButton}
              >
                <span style={{ fontSize: '20px' }}>✕</span>
              </button>
            </div>
            <div style={styles.popupBody}>
              <div style={styles.popupTitle}>Rendered Time</div>
              <div style={styles.renderedTimeDisplay}>{renderedTime[selectedRenderedDay]}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        ...styles.calGrid,
        rowGap: rowGap,
      }}>
        {DAYS.map(d => (
          <div key={d} style={styles.calDayLabel}>{d}</div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.inMonth) {
            return <div key={idx} style={styles.calCellEmpty} />
          }

          const dayEvents = eventMap.get(cell.day) || []
          const hasEvent = dayEvents.length > 0
          const isToday = currentYear === today.getFullYear() &&
            currentMonth === today.getMonth() &&
            cell.day === today.getDate()
          const isHolidayDay = isHoliday(cell.day)
          const isFuture = isFutureDate(cell.day)
          const isRendered = isClient && renderedDays.includes(cell.day) && !isFuture
          const hasRenderedTime = isRendered && renderedTime[cell.day]
          const hasAnyContent = hasEvent || hasRenderedTime

          return (
            <div
              key={idx}
              onClick={() => {
                if (hasAnyContent) {
                  handleDayClick(cell.day, dayEvents)
                }
              }}
              style={{
                ...styles.calCell,
                cursor: hasAnyContent ? 'pointer' : 'default',
                backgroundColor: isToday ? '#7B1D1D' : 'transparent',
                color: isToday ? '#FFFFFF' : '#111827',
                fontWeight: isToday ? 700 : 500,
                borderRadius: isToday ? '50%' : '6px',
                position: 'relative' as const,
              }}
              onMouseEnter={(e) => {
                if (hasAnyContent && !isToday) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5'
                }
              }}
              onMouseLeave={(e) => {
                if (!isToday) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {cell.day}

              {hasAnyContent && !isToday && (
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 14,
                  height: 4,
                  borderRadius: 3,
                  backgroundColor: isHolidayDay ? '#D97706' : (hasRenderedTime ? '#1B4332' : '#D97706'),
                  transition: 'all 0.2s ease',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{
            width: 24,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#7B1D1D',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: '#6B7280' }}>Today</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{
            width: 14,
            height: 4,
            borderRadius: 3,
            backgroundColor: '#D97706',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: '#6B7280' }}>Holiday</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{
            width: 14,
            height: 4,
            borderRadius: 3,
            backgroundColor: '#1B4332',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: '#6B7280' }}>Rendered</span>
        </div>
      </div>
    </div>
  )
}

// CSS part 
const styles = {
  container: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '14px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
    padding: '28px 24px',
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'var(--font-content, sans-serif)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  calHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexShrink: 0,
  },
  calNavBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    padding: '3px',
    borderRadius: '6px',
    transition: 'background 0.12s',
  },
  calMonthLabel: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#111827',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px',
    flex: 1,
    alignContent: 'center',
    height: '100%',
  },
  calDayLabel: {
    textAlign: 'center' as const,
    fontSize: '10px',
    fontWeight: 700,
    color: '#6B7280',
    padding: '3px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
  },
  calCell: {
    position: 'relative' as const,
    textAlign: 'center' as const,
    fontSize: '12px',
    padding: '8px 2px',
    borderRadius: '6px',
    color: '#111827',
    cursor: 'default',
    lineHeight: 1,
    transition: 'all 0.15s',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellEmpty: {
    visibility: 'hidden' as const,
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  },
  popupContainer: {
    width: '380px',
    maxWidth: '95vw',
    overflow: 'hidden',
    borderRadius: '16px',
    background: '#FFFFFF',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  popupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#1B4332',
    padding: '16px 20px',
  },
  popupDate: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#FFFFFF',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s',
  },
  popupBody: {
    padding: '24px 20px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  multiplePopupBody: {
    padding: '24px 20px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '60vh',
    overflowY: 'auto' as const,
  },
  popupTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  popupBadgeContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  popupBadge: {
    borderRadius: '12px',
    padding: '4px 14px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  renderedTimeLarge: {
    fontWeight: 700,
    color: '#7B1D1D',
    display: 'inline-block',
  },
  renderedTimeDisplay: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#7B1D1D',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
  multipleEventItem: {
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  multipleEventTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  popupDivider: {
    height: '1px',
    background: '#E5E7EB',
    margin: '4px 0',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
    marginTop: '12px',
    flexWrap: 'wrap' as const,
    flexShrink: 0,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
}