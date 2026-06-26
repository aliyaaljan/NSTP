'use client'

import { useState, useEffect, useRef } from 'react'
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { QrScanner } from "@/components/shared/QrScanner"
import { 
  IconQrcode, 
  IconClock, 
  IconCheck, 
  IconX, 
  IconUser,
  IconCalendar,
  IconChevronRight,
  IconDeviceMobile,
  IconCamera,
  IconCameraOff,
  IconRefresh,
  IconChevronDown,
} from "@tabler/icons-react"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  greenLight: '#1A5C3A',
  greenBg: '#E8F5EF',
  maroon: "#7B1113",
  maroonLight: "#9E1A1C",
  gold: "#C8A84B",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  cardShadow: "0 2px 12px rgba(0,0,0,0.06)",
  cardShadowHover: "0 4px 20px rgba(0,0,0,0.1)",
  border: "#E8E8E8",
  borderLight: "#F0F0F0",
  textDark: "#1A1A1A",
  textGray: "#8A8A8A",
  textMuted: "#B8B8B8",
  textLight: "#6B6B6B",
  success: "#0B6E4F",
  successBg: "#E6F4ED",
  warning: "#8B5E00",
  warningBg: "#FFF3E0",
}

const COLLAPSED_W = 88
const RAIL_MARGIN = 16

type ScanStatus = 'On Time' | 'Late'

type Scan = {
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  status: ScanStatus
}

// basis for now: 15 mins is late
// hardcoded student data
const SCAN_HISTORY: Scan[] = [
  { name: 'Rhona Lope', date: '2026-06-23', generatedTime: '7:45 AM', scannedTime: '8:00 AM', status: 'On Time' },
  { name: 'Janine Tulic', date: '2026-06-23', generatedTime: '7:50 AM', scannedTime: '8:04 AM', status: 'On Time' },
  { name: 'Aliya Mendoza', date: '2026-06-23', generatedTime: '7:58 AM', scannedTime: '8:05 AM', status: 'On Time' },
  { name: 'Jaerish Rabang', date: '2026-06-23', generatedTime: '8:02 AM', scannedTime: '9:15 AM', status: 'Late' },
  { name: 'Charles Joaquin', date: '2026-06-23', generatedTime: '7:48 AM', scannedTime: '7:50 AM', status: 'On Time' },
  { name: 'Axel Valido', date: '2026-06-23', generatedTime: '7:52 AM', scannedTime: '8:03 AM', status: 'On Time' },
  { name: 'Saffi Limbaro', date: '2026-06-23', generatedTime: '8:05 AM', scannedTime: '8:30 AM', status: 'Late' },
  { name: 'Rhona Shayne Lopez', date: '2026-06-26', generatedTime: '7:45 AM', scannedTime: '8:00 AM', status: 'On Time' },
  { name: 'Janine Irish Tulic', date: '2026-06-26', generatedTime: '7:50 AM', scannedTime: '8:04 AM', status: 'On Time' },
  { name: 'Aliya Aljan Mendoza', date: '2026-06-26', generatedTime: '7:58 AM', scannedTime: '8:05 AM', status: 'On Time' },
  { name: 'Jaerish Kyle Rabang', date: '2026-06-26', generatedTime: '8:02 AM', scannedTime: '9:15 AM', status: 'Late' },
  { name: 'Charles Ansbert Joaquin', date: '2026-06-26', generatedTime: '7:48 AM', scannedTime: '7:50 AM', status: 'On Time' },
  { name: 'Axel Xandrei Valido', date: '2026-06-25', generatedTime: '7:52 AM', scannedTime: '8:03 AM', status: 'On Time' },
  { name: 'Saffi Limbaro', date: '2026-06-25', generatedTime: '8:05 AM', scannedTime: '8:30 AM', status: 'Late' },
  { name: 'Rhona Shayne Lopez', date: '2026-06-25', generatedTime: '7:45 AM', scannedTime: '8:00 AM', status: 'On Time' },
  { name: 'Janine Irish Tulic', date: '2026-06-24', generatedTime: '7:50 AM', scannedTime: '8:04 AM', status: 'On Time' },
  { name: 'Aliya Aljan Mendoza', date: '2026-06-24', generatedTime: '7:58 AM', scannedTime: '8:05 AM', status: 'On Time' },
  { name: 'Jaerish Kyle Rabang', date: '2026-06-24', generatedTime: '8:02 AM', scannedTime: '9:15 AM', status: 'Late' },
  { name: 'Charles Ansbert Joaquin', date: '2026-06-23', generatedTime: '7:48 AM', scannedTime: '7:50 AM', status: 'On Time' },
  { name: 'Axel Xandrei Valido', date: '2026-06-22', generatedTime: '7:52 AM', scannedTime: '8:03 AM', status: 'On Time' },
  { name: 'Saffi Limbaro', date: '2026-06-21', generatedTime: '8:05 AM', scannedTime: '8:30 AM', status: 'Late' },
  { name: 'Rhona Shayne Lopez', date: '2026-06-20', generatedTime: '7:45 AM', scannedTime: '8:00 AM', status: 'On Time' },
  { name: 'Janine Irish Tulic', date: '2026-06-19', generatedTime: '7:50 AM', scannedTime: '8:04 AM', status: 'On Time' },
  { name: 'Aliya Aljan Mendoza', date: '2026-06-18', generatedTime: '7:58 AM', scannedTime: '8:05 AM', status: 'On Time' },
]

const STATUS_STYLES: Record<ScanStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  'On Time': { 
    color: C.success, 
    bg: C.successBg,
    icon: <IconCheck size={14} stroke={2.5} />
  },
  'Late': { 
    color: C.warning, 
    bg: C.warningBg,
    icon: <IconClock size={14} stroke={2.5} />
  },
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 640)
      setIsTablet(width >= 640 && width < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { isMobile, isTablet }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  })
}

// Get week number from date
function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr)
  const today = new Date()
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Get current week number
function getCurrentWeekNumber(): number {
  const today = new Date()
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Filter by week
function filterByWeek(scans: Scan[], weekOption: string): Scan[] {
  if (weekOption === 'all') return scans
  
  const currentWeek = getCurrentWeekNumber()
  let targetWeek: number
  
  if (weekOption === 'this-week') {
    targetWeek = currentWeek
  } else if (weekOption === 'last-week') {
    targetWeek = currentWeek - 1
  } else {
    const weekNum = parseInt(weekOption.split('-')[1])
    targetWeek = currentWeek - weekNum
  }
  
  return scans.filter(scan => getWeekNumber(scan.date) === targetWeek)
}

// Group scans by month
function groupByMonth(scans: Scan[]): Record<string, Scan[]> {
  return scans.reduce((acc, scan) => {
    const monthKey = new Date(scan.date).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(scan)
    return acc
  }, {} as Record<string, Scan[]>)
}

// Group scans by date
function groupByDate(scans: Scan[]): Record<string, Scan[]> {
  return scans.reduce((acc, scan) => {
    if (!acc[scan.date]) acc[scan.date] = []
    acc[scan.date].push(scan)
    return acc
  }, {} as Record<string, Scan[]>)
}

export default function LeaderScannerPage() {
  const { isMobile, isTablet } = useIsMobile()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  // Filter scans based on selected week
  const filteredScans = filterByWeek(SCAN_HISTORY, selectedWeek)
  
  // For all, group by month
  const groupedByMonth = selectedWeek === 'all' ? groupByMonth(filteredScans) : null
  
  // For week, group by date
  const groupedByDate = selectedWeek !== 'all' ? groupByDate(filteredScans) : null

  const totalScans = SCAN_HISTORY.length
  const onTimeCount = SCAN_HISTORY.filter(s => s.status === 'On Time').length
  const lateCount = SCAN_HISTORY.filter(s => s.status === 'Late').length

  const months = Array.from(new Set(SCAN_HISTORY.map(scan => {
    const date = new Date(scan.date)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }))).sort((a, b) => {
    const dateA = new Date(a)
    const dateB = new Date(b)
    return dateB.getTime() - dateA.getTime()
  })

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0])
    }
  }, [months])

  return (
    <div
      className={montserrat.variable}
      style={{ 
        fontFamily: "'Montserrat', sans-serif", 
        background: C.pageBg, 
        minHeight: "100vh", 
        display: "flex",
        position: "relative",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          paddingLeft: leftPadding,
          paddingRight: isMobile ? "12px" : "32px",
          paddingTop: isMobile ? "12px" : "28px",
          paddingBottom: isMobile ? "80px" : "28px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "12px" : "24px",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        {/* Header */}
        <PageHeader isMobile={isMobile} />

        {/* Stats Cards */}
        <StatsCards 
          isMobile={isMobile} 
          totalScans={totalScans}
          onTimeCount={onTimeCount}
          lateCount={lateCount}
        />

        {/* QR Scanner Card */}
        <QRCard isMobile={isMobile} onOpenScanner={() => setScannerOpen(true)} />

        {/* Week Filter */}
        <WeekFilter 
          isMobile={isMobile}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          months={months}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />

        {/* Scan History */}
        <ScanLogPanel 
          isMobile={isMobile} 
          scans={filteredScans}
          groupedByMonth={groupedByMonth}
          groupedByDate={groupedByDate}
          selectedWeek={selectedWeek}
        />

        {scannerOpen && <QrScanner onClose={() => setScannerOpen(false)} />}
      </main>
    </div>
  )
}

// Page Header
function PageHeader({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "flex-start",
      flexWrap: "wrap", 
      gap: "12px",
      width: "100%",
    }}>
      <div>
        <h1
          style={{
            fontSize: isMobile ? "18px" : "32px",
            fontWeight: 800,
            color: C.maroon,
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Scan History
        </h1>
        <p style={{
          fontSize: isMobile ? "10px" : "14px",
          color: C.textGray,
          margin: "4px 0 0 0",
          fontWeight: 400,
        }}>
          Track student attendance
        </p>
      </div>
      
      <div style={{ flexShrink: 0 }}>
        <ProfilePill name="Kim, Mingyu" initials="MK" section="H" />
      </div>
    </div>
  )
}

// Stats Cards
function StatsCards({ 
  isMobile, 
  totalScans, 
  onTimeCount, 
  lateCount 
}: { 
  isMobile: boolean
  totalScans: number
  onTimeCount: number
  lateCount: number
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3, 1fr)",
      gap: isMobile ? "4px" : "16px",
      width: "100%",
    }}>
      <div style={{
        background: C.cardBg,
        borderRadius: "8px",
        padding: isMobile ? "8px 4px" : "16px 20px",
        border: `1px solid ${C.border}`,
        textAlign: "center",
        boxShadow: C.cardShadow,
      }}>
        <div style={{ 
          fontSize: isMobile ? "14px" : "28px", 
          fontWeight: 800, 
          color: C.textDark,
        }}>
          {totalScans}
        </div>
        <div style={{ 
          fontSize: isMobile ? "8px" : "12px", 
          color: C.textGray,
          fontWeight: 500,
          marginTop: "1px",
        }}>
          Total
        </div>
      </div>
      <div style={{
        background: C.cardBg,
        borderRadius: "8px",
        padding: isMobile ? "8px 4px" : "16px 20px",
        border: `1px solid ${C.border}`,
        textAlign: "center",
        boxShadow: C.cardShadow,
      }}>
        <div style={{ 
          fontSize: isMobile ? "14px" : "28px", 
          fontWeight: 800, 
          color: C.success,
        }}>
          {onTimeCount}
        </div>
        <div style={{ 
          fontSize: isMobile ? "8px" : "12px", 
          color: C.textGray,
          fontWeight: 500,
          marginTop: "1px",
        }}>
          On Time
        </div>
      </div>
      <div style={{
        background: C.cardBg,
        borderRadius: "8px",
        padding: isMobile ? "8px 4px" : "16px 20px",
        border: `1px solid ${C.border}`,
        textAlign: "center",
        boxShadow: C.cardShadow,
      }}>
        <div style={{ 
          fontSize: isMobile ? "14px" : "28px", 
          fontWeight: 800, 
          color: C.warning,
        }}>
          {lateCount}
        </div>
        <div style={{ 
          fontSize: isMobile ? "8px" : "12px", 
          color: C.textGray,
          fontWeight: 500,
          marginTop: "1px",
        }}>
          Late
        </div>
      </div>
    </div>
  )
}

// QR Scanner Card
function QRCard({ isMobile, onOpenScanner }: { isMobile: boolean; onOpenScanner: () => void }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`,
        borderRadius: "10px",
        padding: isMobile ? "10px 14px" : "20px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 16px rgba(20, 73, 46, 0.25)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onOpenScanner}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)"
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(20, 73, 46, 0.35)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(20, 73, 46, 0.25)"
      }}
    >
      <div style={{
        position: "absolute",
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.05)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        bottom: -50,
        left: -20,
        width: 150,
        height: 150,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.03)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "16px", position: "relative", zIndex: 1 }}>
        <div style={{
          width: isMobile ? "36px" : "52px",
          height: isMobile ? "36px" : "52px",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
          backdropFilter: "blur(4px)",
        }}>
          <IconQrcode size={isMobile ? 18 : 28} stroke={1.5} />
        </div>
        <div>
          <div style={{ 
            fontWeight: 700, 
            fontSize: isMobile ? "13px" : "18px", 
            color: "#fff",
          }}>
            Scan QR Code
          </div>
          <div style={{ 
            fontSize: isMobile ? "9px" : "13px", 
            color: "rgba(255,255,255,0.8)",
            marginTop: "1px",
          }}>
            Tap to open scanner
          </div>
        </div>
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        color: "#fff",
        fontWeight: 600,
        fontSize: isMobile ? "10px" : "14px",
        background: "rgba(255,255,255,0.15)",
        padding: isMobile ? "4px 10px" : "8px 20px",
        borderRadius: "20px",
        backdropFilter: "blur(4px)",
        position: "relative",
        zIndex: 1,
      }}>
        <span>Open</span>
        <IconChevronRight size={isMobile ? 12 : 20} stroke={2} />
      </div>
    </div>
  )
}

// Week Filter
function WeekFilter({ 
  isMobile, 
  selectedWeek, 
  onSelectWeek,
  months,
  selectedMonth,
  setSelectedMonth,
}: { 
  isMobile: boolean
  selectedWeek: string
  onSelectWeek: (week: string) => void
  months: string[]
  selectedMonth: string
  setSelectedMonth: (month: string) => void
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const getMonthIndex = (monthStr: string) => {
    const date = new Date(monthStr)
    return date.getMonth()
  }

  const getYearFromMonth = (monthStr: string) => {
    const date = new Date(monthStr)
    return date.getFullYear()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedMonth) {
      setPickerYear(getYearFromMonth(selectedMonth))
      setPickerMonth(getMonthIndex(selectedMonth))
    }
  }, [selectedMonth])

  const isWeekSelected = (weekNum: number) => {
    if (selectedWeek === 'all') return false
    if (selectedWeek === `week-${weekNum}`) return true
    return false
  }

  const handleWeekSelect = (weekNum: number) => {
    onSelectWeek(`week-${weekNum}`)
  }

  const handleMonthSelect = (monthIndex: number) => {
    const date = new Date(pickerYear, monthIndex, 1)
    const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    setSelectedMonth(monthStr)
    setPickerMonth(monthIndex)
    setIsDropdownOpen(false)
  }

  const navigateYear = (delta: number) => {
    setPickerYear(prev => prev + delta)
  }

  const goToToday = () => {
    const today = new Date()
    const monthStr = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    setSelectedMonth(monthStr)
    setPickerYear(today.getFullYear())
    setPickerMonth(today.getMonth())
    setIsDropdownOpen(false)
  }

  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const isSelectedMonth = (monthIndex: number) => {
    if (!selectedMonth) return false
    return getMonthIndex(selectedMonth) === monthIndex && getYearFromMonth(selectedMonth) === pickerYear
  }

  const isCurrentMonth = (monthIndex: number) => {
    const today = new Date()
    return monthIndex === today.getMonth() && pickerYear === today.getFullYear()
  }

  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number; width: number } | null>(null)

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

  const dropdownWidth = isMobile ? '160px' : '200px'
  const dropdownLeftOffset = isMobile ? 60 : 80

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      width: "100%",
      position: "relative",
    }}>
      {/* First row: All and Month dropdown */}
      <div style={{
        display: "flex",
        gap: "4px",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        {/* All button */}
        <button
          onClick={() => onSelectWeek('all')}
          style={{
            fontSize: isMobile ? "10px" : "14px",
            fontWeight: 700,
            padding: isMobile ? "4px 10px" : "10px 24px",
            borderRadius: "999px",
            border: `2px solid ${selectedWeek === 'all' ? C.green : C.border}`,
            background: selectedWeek === 'all' ? C.greenBg : C.cardBg,
            color: selectedWeek === 'all' ? C.green : C.textGray,
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
            if (selectedWeek !== 'all') {
              e.currentTarget.style.background = C.greenBg
              e.currentTarget.style.borderColor = C.green
            }
          }}
          onMouseLeave={(e) => {
            if (selectedWeek !== 'all') {
              e.currentTarget.style.background = C.cardBg
              e.currentTarget.style.borderColor = C.border
            }
          }}
        >
          All
        </button>

        {/* Month dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            ref={buttonRef}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              fontSize: isMobile ? "10px" : "14px",
              fontWeight: 700,
              padding: isMobile ? "4px 10px" : "10px 24px",
              borderRadius: "999px",
              border: `2px solid ${C.border}`,
              background: C.cardBg,
              color: C.textDark,
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
              e.currentTarget.style.background = C.cardBg
              e.currentTarget.style.borderColor = C.border
            }}
          >
            <span style={{
              fontSize: isMobile ? "9px" : "14px",
            }}>
              {selectedMonth || 'Select Month'}
            </span>
            <IconChevronDown 
              size={isMobile ? 12 : 16} 
              stroke={2} 
              style={{ 
                color: C.textGray,
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
                flexShrink: 0,
              }} 
            />
          </div>

          {/* Dropdown */}
          {isDropdownOpen && buttonPosition && (
            <div
              style={{
                position: 'fixed',
                top: buttonPosition.top,
                left: buttonPosition.left + (buttonPosition.width / 2) - dropdownLeftOffset,
                width: dropdownWidth,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: isMobile ? '6px' : '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
                padding: isMobile ? '5px' : '8px',
                zIndex: 1000,
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* Year navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isMobile ? '3px' : '6px',
                padding: '0 1px',
                gap: '1px',
              }}>
                <button
                  onClick={() => navigateYear(-1)}
                  style={{
                    padding: isMobile ? '1px 4px' : '2px 8px',
                    border: `1px solid ${C.border}`,
                    background: C.cardBg,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '10px' : '12px',
                    color: C.textDark,
                    transition: 'all 0.15s',
                    minWidth: isMobile ? '18px' : '28px',
                    minHeight: isMobile ? '16px' : '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                <span style={{
                  fontWeight: 700,
                  fontSize: isMobile ? '10px' : '13px',
                  color: C.textDark,
                }}>
                  {pickerYear}
                </span>
                <button
                  onClick={() => navigateYear(1)}
                  style={{
                    padding: isMobile ? '1px 4px' : '2px 8px',
                    border: `1px solid ${C.border}`,
                    background: C.cardBg,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '10px' : '12px',
                    color: C.textDark,
                    transition: 'all 0.15s',
                    minWidth: isMobile ? '18px' : '28px',
                    minHeight: isMobile ? '16px' : '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                  width: '100%',
                  padding: isMobile ? '2px' : '4px',
                  marginBottom: isMobile ? '3px' : '6px',
                  border: `1.5px solid ${C.maroon}`,
                  background: 'rgba(123, 17, 19, 0.08)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '8px' : '11px',
                  fontWeight: 600,
                  color: C.maroon,
                  transition: 'all 0.15s',
                  fontFamily: "'Montserrat', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(123, 17, 19, 0.15)'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(123, 17, 19, 0.08)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                Today
              </button>

              {/* Month grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: isMobile ? '2px' : '4px',
              }}>
                {MONTHS_SHORT.map((monthName, idx) => {
                  const isSelected = isSelectedMonth(idx)
                  const isCurrent = isCurrentMonth(idx)

                  return (
                    <button
                      key={idx}
                      onClick={() => handleMonthSelect(idx)}
                      style={{
                        padding: isMobile ? '2px 1px' : '4px 2px',
                        fontSize: isMobile ? '8px' : '11px',
                        fontWeight: isSelected ? 700 : 600,
                        borderRadius: '2px',
                        border: `1.5px solid ${
                          isSelected ? C.green : 
                          isCurrent ? C.maroon : 
                          C.border
                        }`,
                        background: isSelected ? C.greenBg : 
                                   isCurrent ? 'rgba(123, 17, 19, 0.08)' : 
                                   C.cardBg,
                        color: isSelected ? C.green : 
                               isCurrent ? C.maroon : 
                               C.textDark,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: "'Montserrat', sans-serif",
                        position: 'relative' as const,
                        minHeight: isMobile ? '18px' : '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = C.greenBg
                          e.currentTarget.style.borderColor = C.green
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = isCurrent ? 'rgba(123, 17, 19, 0.08)' : C.cardBg
                          e.currentTarget.style.borderColor = isCurrent ? C.maroon : C.border
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

      {/* Second row: Week 1-5 pills */}
      <div style={{
        display: "flex",
        gap: "3px",
        flexWrap: "wrap",
        width: "100%",
      }}>
        {[1, 2, 3, 4, 5].map(weekNum => {
          const isSelected = isWeekSelected(weekNum)
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
    </div>
  )
}

// Scan History Panel
function ScanLogPanel({ 
  isMobile, 
  scans,
  groupedByMonth,
  groupedByDate,
  selectedWeek,
}: { 
  isMobile: boolean
  scans: Scan[]
  groupedByMonth: Record<string, Scan[]> | null
  groupedByDate: Record<string, Scan[]> | null
  selectedWeek: string
}) {
  const totalScans = scans.length

  // Determine what to render
  const isAllView = selectedWeek === 'all'
  const hasScans = totalScans > 0

  // For all, use month grouping
  // For week, use date grouping
  const monthKeys = groupedByMonth ? Object.keys(groupedByMonth) : []
  const dateKeys = groupedByDate ? Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a)) : []

  return (
    <div
      style={{
        background: C.cardBg,
        borderRadius: "10px",
        border: `1px solid ${C.border}`,
        boxShadow: C.cardShadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
        minHeight: isMobile ? "200px" : "300px",
        maxHeight: isMobile ? "calc(100vh - 400px)" : "calc(100vh - 380px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "8px 12px" : "16px 24px",
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
          gap: "4px",
          background: "#FAFAFA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconUser size={isMobile ? 12 : 20} stroke={1.5} style={{ color: C.textGray }} />
          <span style={{ 
            fontSize: isMobile ? "10px" : "15px", 
            fontWeight: 700, 
            color: C.textDark,
          }}>
            Scan Records
          </span>
        </div>
        <span
          style={{
            fontSize: isMobile ? "8px" : "12px",
            fontWeight: 700,
            color: C.textGray,
            padding: "2px 8px",
            borderRadius: "20px",
            background: C.pageBg,
          }}
        >
          {totalScans} entries
        </span>
      </div>

      {/* Table Headers */}
      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 0.8fr",
            padding: "10px 24px",
            background: "#F7F7F7",
            borderBottom: `1px solid ${C.border}`,
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            color: C.textGray,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>
            Student / Time
          </div>
          <div style={{ 
            fontSize: "12px", 
            fontWeight: 700, 
            color: C.textGray,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "right",
          }}>
            Status
          </div>
        </div>
      )}

      {/* Scan List */}
      <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
        {hasScans ? (
          isAllView ? (
            // All view
            <>
              {monthKeys.sort((a, b) => {
                // Sort (most recent first)
                const dateA = new Date(a)
                const dateB = new Date(b)
                return dateB.getTime() - dateA.getTime()
              }).map((monthKey, monthIndex) => {
                const scansForMonth = groupedByMonth?.[monthKey] || []
                const scansGroupedByDate = groupByDate(scansForMonth)
                const dateKeysForMonth = Object.keys(scansGroupedByDate).sort((a, b) => b.localeCompare(a))
                
                return (
                  <div key={monthKey}>
                    {/* Month Header */}
                    <div
                      style={{
                        padding: isMobile ? "6px 12px" : "12px 24px",
                        background: C.greenBg,
                        borderBottom: `1px solid ${C.border}`,
                        borderTop: monthIndex > 0 ? `1px solid ${C.border}` : 'none',
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <IconCalendar size={isMobile ? 10 : 16} stroke={1.5} style={{ color: C.green }} />
                      <span style={{ 
                        fontSize: isMobile ? "10px" : "15px", 
                        fontWeight: 700, 
                        color: C.green,
                      }}>
                        {monthKey}
                      </span>
                      <span style={{ 
                        fontSize: isMobile ? "8px" : "12px", 
                        color: C.textGray, 
                        fontWeight: 500,
                      }}>
                        • {scansForMonth.length} entries
                      </span>
                    </div>

                    {dateKeysForMonth.map((date, dateIndex, dateArray) => {
                      const scansForDate = scansGroupedByDate[date] || []
                      return scansForDate.map((scan, i) => (
                        <ScanRow
                          key={`${scan.name}-${scan.date}-${i}`}
                          isMobile={isMobile}
                          scan={scan}
                          isLast={i === scansForDate.length - 1 && dateIndex === dateArray.length - 1}
                          showDateHeader={i === 0}
                          dateHeader={formatDate(scan.date)}
                        />
                      ))
                    })}
                  </div>
                )
              })}
            </>
          ) : (
            // Week view 
            <>
              {dateKeys.map((date, dateIndex) => {
                const scansForDate = groupedByDate?.[date] || []
                return scansForDate.map((scan, i) => (
                  <ScanRow
                    key={`${scan.name}-${date}-${i}`}
                    isMobile={isMobile}
                    scan={scan}
                    isLast={i === scansForDate.length - 1 && dateIndex === dateKeys.length - 1}
                    showDateHeader={i === 0}
                    dateHeader={formatDate(scan.date)}
                  />
                ))
              })}
            </>
          )
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "20px 12px" : "60px 20px",
            color: C.textGray,
          }}>
            <p style={{ fontSize: isMobile ? "11px" : "14px", fontWeight: 500 }}>No scan history for this period</p>
            <p style={{ fontSize: isMobile ? "9px" : "12px", color: C.textLight, marginTop: "4px" }}>
              Scans will appear here once students start checking in
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Scan Row
function ScanRow({
  isMobile,
  scan,
  isLast,
  showDateHeader,
  dateHeader,
}: {
  isMobile: boolean
  scan: Scan
  isLast: boolean
  showDateHeader?: boolean
  dateHeader?: string
}) {
  const { color, bg, icon } = STATUS_STYLES[scan.status]
  const initials = scan.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <>
      {showDateHeader && dateHeader && (
        <div
          style={{
            padding: isMobile ? "3px 12px" : "8px 24px",
            background: "#F7F7F7",
            borderBottom: `1px solid ${C.border}`,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <IconCalendar size={isMobile ? 8 : 14} stroke={1.5} style={{ color: C.textGray }} />
          <span style={{ 
            fontSize: isMobile ? "9px" : "13px", 
            fontWeight: 600, 
            color: C.textDark,
          }}>
            {dateHeader}
          </span>
        </div>
      )}
      
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "2fr 1.2fr 0.8fr",
          alignItems: "center",
          padding: isMobile ? "6px 12px" : "12px 24px",
          borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
          gap: isMobile ? "6px" : "16px",
          transition: "background 0.15s ease",
          background: "#FFFFFF",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = C.greenBg
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FFFFFF"
        }}
      >
        {/* Avatar + Name w/ time */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "6px",
          minWidth: 0,
        }}>
          <div style={{
            width: isMobile ? "24px" : "36px",
            height: isMobile ? "24px" : "36px",
            borderRadius: "50%",
            background: C.maroon,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: isMobile ? "7px" : "12px",
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ 
              fontSize: isMobile ? "10px" : "14px", 
              fontWeight: 600, 
              color: C.textDark, 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              margin: 0,
            }}>
              {scan.name}
            </p>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "3px",
              marginTop: "1px",
              flexWrap: "wrap",
            }}>
              <span style={{ 
                fontSize: isMobile ? "7px" : "11px", 
                color: C.textGray,
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}>
                <IconClock size={isMobile ? 6 : 12} stroke={1.5} />
                <span style={{ fontWeight: 400, color: C.textGray }}>QR generated:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.textDark }}>{scan.generatedTime}</span>
              </span>
              {!isMobile && (
                <span style={{ 
                  fontSize: "8px", 
                  color: C.textMuted,
                }}>
                  •
                </span>
              )}
              <span style={{ 
                fontSize: isMobile ? "7px" : "11px", 
                color: C.textGray,
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}>
                <IconQrcode size={isMobile ? 6 : 12} stroke={1.5} />
                <span style={{ fontWeight: 400, color: C.textGray }}>QR scanned:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: C.green }}>{scan.scannedTime}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end",
        }}>
          <span
            style={{
              fontSize: isMobile ? "7px" : "12px",
              fontWeight: 700,
              padding: isMobile ? "2px 6px" : "4px 14px",
              borderRadius: "20px",
              background: bg,
              color: color,
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              whiteSpace: "nowrap",
            }}
          >
            {!isMobile && icon}
            {scan.status}
          </span>
        </div>
      </div>
    </>
  )
}