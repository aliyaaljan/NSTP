"use client"

import { useState, useEffect, useMemo } from "react"
import { Montserrat } from "next/font/google"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import type { StudentDashboardData } from "@/lib/student/dashboard-actions"
import { getMyAttendanceHistory } from "@/lib/student/attendance-history-actions"
import type { AttendanceHistoryRow } from "@/lib/student/attendance-history-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import { 
  IconUser, 
  IconBook,
  IconChevronUp,
  IconChevronDown,
  IconSettings
} from "@tabler/icons-react"
import LoadingPage from "@/components/shared/LoadingPage"
import { getNotificationPreferences, setEmailNotifications, setPushNotifications } from "@/lib/settings/NotificationPreferences"
import { usePushSubscription } from "@/lib/push/usePushSubscription"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  maroon: "#6B1A1A",
  maroonDark: "#6B0D10",
  gold: "#C8A84B",
  goldBg: "#FFF3CD",
  goldText: "#4A2C00",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  cardShadow: "0 2px 6px rgba(0,0,0,0.07)",
  border: "#ECECEA",
  hoursBg: "#E8EDE5",
  hoursBorder: "#C5D4BC",
  track: "#D4D9CC",
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  textMuted: "#C8C8C4",
  textSub: "#5A5A58",
  iconBg: "#F8DCDD",
}

const COLLAPSED_W = 88
const RAIL_MARGIN = 16

type SortField = "date" | null;
type SortDirection = "asc" | "desc" | null;

interface ProfileProps {
  Sidebar: React.ComponentType
  classTypeBadge?: boolean
}

function isIosSafariNotInstalled() {
  if (typeof window === "undefined") return false
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
  return isIos && !isStandalone
}

function ToggleSwitch({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      disabled={disabled}
      style={{
        position: "relative",
        width: 36,
        height: 20,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? C.green : "#D1D5DB",
        flexShrink: 0,
        padding: 0,
        opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.15s",
        }}
      />
    </button>
  )
}

function StudentEmailNotification({ isSmallMobile }: { isSmallMobile: boolean }) {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getNotificationPreferences().then((res) => {
      if (res.ok) setEnabled(res.data.email_notifications_enabled)
      setLoading(false)
    })
  }, [])

  async function toggle() {
    const next = !enabled
    setEnabled(next)
    setBusy(true)
    const res = await setEmailNotifications(next)
    if (!res.ok) setEnabled(!next)
    setBusy(false)
  }

  if (loading) return null

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: isSmallMobile ? "8px 4px" : "10px 4px",
      fontFamily: "'Montserrat', 'Fallback Montserrat'",
    }}>
      <div style={{
        width: isSmallMobile ? 28 : 32,
        height: isSmallMobile ? 28 : 32,
        borderRadius: 8,
        background: "#F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className="ti ti-mail" style={{ fontSize: isSmallMobile ? 15 : 17, color: C.textGray }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: isSmallMobile ? 11 : 12.5, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
          Email notifications
        </p>
        <p style={{ fontSize: isSmallMobile ? 10 : 11, color: C.textGray, margin: "1px 0 0", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
          Sent to your @up.edu.ph address
        </p>
      </div>
      <ToggleSwitch checked={enabled} onClick={toggle} disabled={busy} />
    </div>
  )
}

function StudentPushNotification({ isSmallMobile }: { isSmallMobile: boolean }) {
  const { subscribe, unsubscribe, isSubscribed, setIsSubscribed, isSupported } = usePushSubscription()
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [needsInstall, setNeedsInstall] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setNeedsInstall(isIosSafariNotInstalled())
  }, [])

  useEffect(() => {
    if (!isSupported) return
    let cancelled = false
    ;(async () => {
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        if (!cancelled) setIsSubscribed(!!sub)
      } catch (err) {
        console.error("Failed to check push subscription:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSupported])

  useEffect(() => {
    getNotificationPreferences().then((res) => {
      if (res.ok) setEnabled(res.data.push_notifications_enabled)
      setLoading(false)
    })
  }, [])


  async function toggle() {
    setBusy(true)
    try {
      if (isSubscribed) {
        await unsubscribe()
        await setPushNotifications(false)
      } else {
        await subscribe()
        await setPushNotifications(true)
      }
    } catch (err) {
      console.error("Push toggle failed:", err)
      alert("Could not update push notification settings.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: isSmallMobile ? "8px 4px" : "10px 4px",
      fontFamily: "'Montserrat', 'Fallback Montserrat'",
    }}>
      <div style={{
        width: isSmallMobile ? 28 : 32,
        height: isSmallMobile ? 28 : 32,
        borderRadius: 8,
        background: "#F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <i className="ti ti-bell" style={{ fontSize: isSmallMobile ? 15 : 17, color: C.textGray }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: isSmallMobile ? 11 : 12.5, fontWeight: 700, color: C.textDark, margin: 0, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
          Push notifications
        </p>
        <p style={{ fontSize: isSmallMobile ? 10 : 11, color: C.textGray, margin: "1px 0 0", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
          {needsInstall ? "Add to home screen to enable on iOS." : "Receive instant alerts for new updates"}
        </p>
      </div>

      {needsInstall ? (
        <i className="ti ti-info-circle" style={{ fontSize: 16, color: C.textGray, flexShrink: 0 }} />
      ) : !isSupported ? (
        <span style={{ fontSize: 10.5, color: C.textGray, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Not supported</span>
      ) : (
        <ToggleSwitch checked={isSubscribed && enabled} onClick={toggle} disabled={busy} />
      )}
    </div>
  )
}

export default function Profile({ Sidebar, classTypeBadge = false }: ProfileProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortField, setSortField] = useState<SortField>(null) 
  const [sortDirection, setSortDirection] = useState<SortDirection>(null) 
  const [isPageLoading, setIsPageLoading] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1200)
      setIsSmallMobile(width < 480)
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function load() {
      const [dashRes, historyRes] = await Promise.all([
        getStudentDashboard(),
        getMyAttendanceHistory(),
      ])
      if (dashRes.ok) setDashboard(dashRes.data)
      if (historyRes.ok) {
        setAttendanceHistory(historyRes.data)
      } else {
        console.error("[Profile] failed to load attendance history", historyRes.error)
      }
      setLoadingHistory(false)
      setIsPageLoading(false)
    }
    load()
  }, [])

  // Sort then paginate
  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) {
      return [...attendanceHistory]
    }

    return [...attendanceHistory].sort((a, b) => {
      let comparison = 0
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [attendanceHistory, sortField, sortDirection])

  // Pagination calculations
  const totalEntries = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalEntries)
  const currentEntries = sortedData.slice(startIndex, endIndex)

  // Loading page 
  if (isPageLoading) {
    return (
      <LoadingPage 
        Sidebar={Sidebar}
      />
    )
  }

  // Get data
  const fullName = dashboard?.fullName ?? ""
  const initials = fullName ? getInitials(fullName) : ""
  const avatarUrl = dashboard?.avatarUrl ?? null
  const sectionName = dashboard?.sectionName ?? ""
  const studentNumber = dashboard?.studentNumber ?? ""
  const email = dashboard?.email ?? ""
  const course = dashboard?.programName ?? ""
  const year = dashboard?.classificationName ?? ""
  const classType = dashboard?.nstpType ?? ""
  const location = dashboard?.siteLocation ?? ""
  const adviser = dashboard?.adviserName ?? ""

  // Student data
  const student = {
    initials: initials,
    fullName: fullName,
    section: sectionName,
    studentNumber: studentNumber,
    email: email,
    course: course,
    year: year,
    classType: classType,
    location: location,
    adviser: adviser,
  }

  // Responsive padding
  const getResponsivePadding = () => {
    if (isSmallMobile) {
      return {
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '20px',
        paddingBottom: '110px',
        gap: '12px',
      }
    }
    if (isMobile) {
      return {
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '20px',
        paddingBottom: '110px',
        gap: '14px',
      }
    }
    if (isTablet) {
      const tabletRailWidth = Math.max(70, COLLAPSED_W * (window.innerWidth / 768))
      return {
        paddingLeft: `120px`,
        paddingRight: '20px',
        paddingTop: '28px',
        paddingBottom: '28px',
        gap: '16px',
      }
    }
    return {
      paddingLeft: `${COLLAPSED_W + RAIL_MARGIN * 2}px`,
      paddingRight: '32px',
      paddingTop: '28px',
      paddingBottom: '28px',
      gap: '24px',
    }
  }

  const responsivePadding = getResponsivePadding()

  const formatStudentNumber = (num: string) => {
    if (!num) return ""
    if (num.length === 10) {
      return `${num.slice(0, 4)}-${num.slice(4, 6)}-${num.slice(6)}`
    }
    return num
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else if (sortDirection === "desc") {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const getSortIcons = (field: SortField) => {
    const isActive = sortField === field
    const isAsc = isActive && sortDirection === "asc"
    const isDesc = isActive && sortDirection === "desc"

    return (
      <span style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        marginLeft: 4,
        verticalAlign: "middle",
        lineHeight: 1,
      }}>
        <IconChevronUp 
          size={12} 
          stroke={2} 
          style={{ 
            display: "block",
            transition: "all 0.2s ease",
            opacity: isAsc ? 1 : 0.35,
            color: isAsc ? "#7B1D1D" : "#4A4A4A",
            marginBottom: -2
          }}
        />
        <IconChevronDown 
          size={12} 
          stroke={2} 
          style={{ 
            display: "block",
            transition: "all 0.2s ease",
            opacity: isDesc ? 1 : 0.35,
            color: isDesc ? "#7B1D1D" : "#4A4A4A",
            marginTop: -2
          }}
        />
      </span>
    )
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value))
    setCurrentPage(1)
  }

  // Check if data exists
  const hasData = student.fullName || student.studentNumber

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', 'Fallback Montserrat'",
        background: C.pageBg,
        minHeight: "100vh",
        display: "flex",
        fontSize: isSmallMobile ? "12px" : "13px",
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: responsivePadding.gap,
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
          paddingLeft: responsivePadding.paddingLeft,
          paddingRight: responsivePadding.paddingRight,
          paddingTop: responsivePadding.paddingTop,
          paddingBottom: responsivePadding.paddingBottom,
          marginTop: isMobile ? 0 : 0,
        }}
      >
        {/* Header */}
        <div className="profile-header" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: isMobile ? "16px" : "24px",
        }}>
          <div className="profile-header-left" style={{ flex: 1, minWidth: "200px" }}>
            <h1 style={{
              fontSize: isSmallMobile ? "24px" : isMobile ? "28px" : "34px",
              fontWeight: 800,
              color: C.maroon,
              margin: 0,
              letterSpacing: "-0.01em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              paddingTop: isMobile ? "clamp(43px, 0.5vw, 20px)" : 0,
            }}>
              Profile & Settings
            </h1>
          </div>
        </div>

        {/* Two rectangles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1fr 3fr",
          gap: isMobile ? "16px" : isTablet ? "16px" : "24px",
          flex: 1,
          alignItems: "stretch", 
          fontFamily: "'Montserrat', 'Fallback Montserrat'",
          width: "100%",
        }}>
          {/* Left side (profile) */}
          <div style={{
            background: C.cardBg,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            boxShadow: C.cardShadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: isSmallMobile ? 32 : isMobile ? 36 : 50,
            paddingLeft: isSmallMobile ? 12 : isMobile ? 16 : 24,
            paddingRight: isSmallMobile ? 12 : isMobile ? 16 : 24,
            paddingBottom: isSmallMobile ? 16 : isMobile ? 18 : 28,
            position: "relative",
            transition: "all 0.2s ease",
            height: "auto",
            flexShrink: 0,
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
            width: "100%",
            alignSelf: "start",
          }}>
            {/* Profile circle w/ initials */}
            <div
              style={{
                position: "absolute",
                top: isSmallMobile ? -24 : isMobile ? -28 : -40,
                left: "50%",
                transform: "translateX(-50%)",
                width: isSmallMobile ? 52 : isMobile ? 60 : 80,
                height: isSmallMobile ? 52 : isMobile ? 60 : 80,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.gold}, #D4B05C)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(123, 17, 19, 0.2)",
                border: `3px solid ${C.cardBg}`,
                zIndex: 2,
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: isSmallMobile ? 18 : isMobile ? 22 : 30,
                    fontWeight: 800,
                    color: C.maroon,
                    letterSpacing: "0.02em",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  }}
                >
                  {initials}
                </span>
              )}
            </div>

            {/* Name */}
            <h2
              style={{
                fontSize: isSmallMobile ? "14px" : isMobile ? "16px" : "20px",
                fontWeight: 700,
                color: C.maroon,
                margin: isSmallMobile ? "2px 0 2px 0" : isMobile ? "4px 0 4px 0" : "8px 0 4px 0",
                textAlign: "center",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                wordBreak: "break-word", 
                maxWidth: "100%",
              }}
            >
              {student.fullName}
            </h2>
            
            {/* Section badge */}
            {student.section && (
              <div style={{
                display: "inline-block",
                background: C.hoursBg,
                padding: isSmallMobile ? "2px 10px" : isMobile ? "3px 12px" : "4px 14px",
                borderRadius: 20,
                fontSize: isSmallMobile ? "10px" : isMobile ? "11px" : "12px",
                fontWeight: 600,
                color: C.textSub,
                marginBottom: isSmallMobile ? 10 : isMobile ? 12 : 18,
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                {student.section}
              </div>
            )}

            {/* Student Information */}
            {(student.studentNumber || student.email || student.course || student.year) && (
              <div style={{
                width: "100%",
                borderTop: `1px solid ${C.border}`,
                paddingTop: isSmallMobile ? 10 : isMobile ? 12 : 16,
                marginBottom: isSmallMobile ? 10 : isMobile ? 12 : 16,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: isSmallMobile ? 6 : isMobile ? 8 : 10,
                }}>
                  <IconUser size={isSmallMobile ? 12 : isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                  <h3
                    style={{
                      fontSize: isSmallMobile ? "10px" : "11px",
                      fontWeight: 700,
                      color: C.textDark,
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    }}
                  >
                    Student Information
                  </h3>
                </div>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isSmallMobile ? "auto 1fr" : "auto 1fr",
                  gap: isSmallMobile ? "1px 6px" : isMobile ? "2px 8px" : "4px 12px",
                  fontSize: isSmallMobile ? "11px" : isMobile ? "12px" : "13px",
                  color: C.textSub,
                  lineHeight: isSmallMobile ? 1.4 : isMobile ? 1.5 : 1.8,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  {student.studentNumber && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>No.</span>
                      <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'", wordBreak: "break-all" }}>
                        {formatStudentNumber(student.studentNumber)}
                      </span>
                    </>
                  )}
                  
                  {student.email && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Email</span>
                      <span style={{ fontSize: isSmallMobile ? "11px" : "13px", wordBreak: "break-all", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.email}</span>
                    </>
                  )}
                  
                  {student.course && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Course</span>
                      <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'", wordBreak: "break-word" }}>{student.course}</span>
                    </>
                  )}
                  
                  {student.year && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Year</span>
                      <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.year}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Class Information */}
            {(student.classType || student.location || student.adviser) && (
              <div style={{
                width: "100%",
                borderTop: `1px solid ${C.border}`,
                paddingTop: isSmallMobile ? 10 : isMobile ? 12 : 16,
                marginBottom: isSmallMobile ? 10 : isMobile ? 12 : 16,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: isSmallMobile ? 6 : isMobile ? 8 : 10,
                }}>
                  <IconBook size={isSmallMobile ? 12 : isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                  <h3
                    style={{
                      fontSize: isSmallMobile ? "10px" : "11px",
                      fontWeight: 700,
                      color: C.textDark,
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    }}
                  >
                    Class Information
                  </h3>
                </div>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isSmallMobile ? "auto 1fr" : "auto 1fr",
                  gap: isSmallMobile ? "1px 6px" : isMobile ? "2px 8px" : "4px 12px",
                  fontSize: isSmallMobile ? "11px" : isMobile ? "12px" : "13px",
                  color: C.textSub,
                  lineHeight: isSmallMobile ? 1.4 : isMobile ? 1.5 : 1.8,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  {student.classType && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Type</span>
                      {classTypeBadge ? (
                        <span>
                          <span style={{
                            display: "inline-block",
                            background: C.goldBg,
                            color: C.goldText,
                            padding: "0px 6px",
                            borderRadius: 4,
                            fontSize: isSmallMobile ? "9px" : isMobile ? "10px" : "12px",
                            fontWeight: 600,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          }}>
                            {student.classType}
                          </span>
                        </span>
                      ) : (
                        <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.classType}</span>
                      )}
                    </>
                  )}

                  {/* Location field */}
                  <>
                    <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Location</span>
                    <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'", wordBreak: "break-word" }}>{student.location || "—"}</span>
                  </>

                  {student.adviser && (
                    <>
                      <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Adviser</span>
                      <span style={{ fontSize: isSmallMobile ? "11px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'", wordBreak: "break-word" }}>{student.adviser}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Settings */}
            {(student.studentNumber || student.email || student.course || student.year || student.classType || student.location || student.adviser) && (
              <div style={{
                width: "100%",
                borderTop: `1px solid ${C.border}`,
                paddingTop: isSmallMobile ? 10 : isMobile ? 12 : 16,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: isSmallMobile ? 6 : isMobile ? 8 : 10,
                }}>
                  <IconSettings size={isSmallMobile ? 12 : isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                  <h3
                    style={{
                      fontSize: isSmallMobile ? "10px" : "11px",
                      fontWeight: 700,
                      color: C.textDark,
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    }}
                  >
                    settings
                  </h3>
                </div>
                
                <div style={{
                  background: C.cardBg,
                  overflow: "hidden",
                }}>
                  <StudentPushNotification isSmallMobile={isSmallMobile} />
                  <StudentEmailNotification isSmallMobile={isSmallMobile} />
                </div>
              </div>
            )}
          </div>

          {/* Right side (rendered services) */}
          <div style={{
            background: C.cardBg,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            boxShadow: C.cardShadow,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            height: "auto",
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
            width: "100%", 
            alignSelf: "start",
          }}>
            {/* Header */}
            <div
              style={{
                padding: isSmallMobile ? "10px 12px" : isMobile ? "12px 16px" : "16px 20px",
                borderBottom: `1px solid #E5E7EB`,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{
                  fontSize: isSmallMobile ? "13px" : isMobile ? "14px" : "15px",
                  fontWeight: 700,
                  color: "#111827",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  Rendered Services
                </div>
                <div style={{
                  fontSize: isSmallMobile ? "10px" : isMobile ? "11px" : "12px",
                  color: "#6B7280",
                  marginTop: 1,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  {totalEntries} entries
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{
              flex: 1,
              overflow: "visible",
              minHeight: 0,
            }}>
              {isMobile ? (
                <div style={{ padding: isSmallMobile ? "6px" : "8px" }}>
                  {loadingHistory ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: isSmallMobile ? "12px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                      Loading attendance history…
                    </div>
                  ) : currentEntries.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: isSmallMobile ? "12px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                      No attendance records yet.
                    </div>
                  ) : currentEntries.map((row, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#FAFAFA",
                        borderRadius: 8,
                        padding: isSmallMobile ? "10px" : "12px",
                        marginBottom: "6px",
                        border: `1px solid ${C.border}`,
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, color: C.textDark, fontSize: isSmallMobile ? "12px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                            {formatDate(row.date)}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 700,
                          color: C.maroon,
                          fontSize: isSmallMobile ? "13px" : "14px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.hours} hrs
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isSmallMobile ? "1fr 1fr" : "1fr 1fr",
                        gap: "2px 8px",
                        fontSize: isSmallMobile ? "11px" : "12px",
                        color: C.textSub,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>QR Generated:</span>
                          <span style={{ marginLeft: 3, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.qrGen}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>QR Scanned:</span>
                          <span style={{ marginLeft: 3, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.qrScan}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Time Out:</span>
                          <span style={{ marginLeft: 3, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.timeOut}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: isSmallMobile ? "10px" : "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Site:</span>
                          <span style={{
                            display: "inline",
                            color: C.textDark,
                            fontSize: isSmallMobile ? "11px" : "12px",
                            marginLeft: 3,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                            wordBreak: "break-word",
                          }}>
                            {row.site}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: isTablet ? "12px" : "13px",
                  tableLayout: "fixed",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: `1px solid #E5E7EB`,
                      background: "#F9FAFB",
                    }}>
                      <th 
                        style={{
                          textAlign: "left",
                          padding: isTablet ? "8px 14px" : "10px 20px",
                          fontWeight: 700,
                          fontSize: isTablet ? "10px" : "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                          color: "#7B1D1D",
                          width: "15%",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "background 0.2s ease",
                        }}
                        onClick={() => handleSort("date")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F5F5F7"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#F9FAFB"
                        }}
                      >
                        Date
                        {getSortIcons("date")}
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: isTablet ? "8px 14px" : "10px 20px",
                        fontWeight: 700,
                        fontSize: isTablet ? "10px" : "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "#7B1D1D",
                        width: "25%",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}>
                        QR Code
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: isTablet ? "8px 14px" : "10px 20px",
                        fontWeight: 700,
                        fontSize: isTablet ? "10px" : "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "#7B1D1D",
                        width: "15%",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}>
                        Time Out
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: isTablet ? "8px 14px" : "10px 20px",
                        fontWeight: 700,
                        fontSize: isTablet ? "10px" : "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "#7B1D1D",
                        width: "15%",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}>
                        Hours
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: isTablet ? "8px 14px" : "10px 20px",
                        fontWeight: 700,
                        fontSize: isTablet ? "10px" : "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "#7B1D1D",
                        width: "30%",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}>
                        Site
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: isTablet ? "12px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                          Loading attendance history…
                        </td>
                      </tr>
                    ) : currentEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#6B7280", fontSize: isTablet ? "12px" : "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                          No attendance records yet.
                        </td>
                      </tr>
                    ) : currentEntries.map((row, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: index < currentEntries.length - 1 ? `1px solid #F3F4F6` : "none",
                          transition: "background 0.12s ease",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#FAFAFA"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent"
                        }}
                      >
                        <td style={{
                          padding: isTablet ? "10px 14px" : "14px 20px",
                          fontWeight: 600,
                          color: "#111827",
                          fontSize: isTablet ? "12px" : "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {formatDate(row.date)}
                        </td>
                        <td style={{
                          padding: isTablet ? "10px 14px" : "14px 20px",
                          color: "#6B7280",
                          textAlign: "center",
                          fontSize: isTablet ? "12px" : "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <div>
                              <span style={{ fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Generated: {row.qrGen}</span>
                            </div>
                            <div>
                              <span style={{ fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Scanned: {row.qrScan}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{
                          padding: isTablet ? "10px 14px" : "14px 20px",
                          color: "#6B7280",
                          textAlign: "center",
                          fontSize: isTablet ? "12px" : "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.timeOut}
                        </td>
                        <td style={{
                          padding: isTablet ? "10px 14px" : "14px 20px",
                          fontWeight: 700,
                          color: "#7B1D1D",
                          textAlign: "center",
                          fontSize: isTablet ? "12px" : "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.hours}
                          <span style={{
                            fontSize: isTablet ? "10px" : "11px",
                            fontWeight: 400,
                            color: "#6B7280",
                            marginLeft: 2,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          }}>
                            hrs
                          </span>
                        </td>
                        <td style={{
                          padding: isTablet ? "10px 14px" : "14px 20px",
                          textAlign: "center",
                          fontSize: isTablet ? "12px" : "13px",
                          color: "#6B7280",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          wordBreak: "break-word",
                        }}>
                          {row.site}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isSmallMobile ? "8px 10px" : isMobile ? "10px 14px" : "14px 20px",
              borderTop: `1px solid #E5E7EB`,
              gap: isSmallMobile ? "4px" : "8px",
              flexShrink: 0,
              background: "#FFFFFF",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              flexWrap: "nowrap", 
              overflow: "hidden", 
            }}>
              {/* Showing entries */}
              <div style={{
                fontSize: isSmallMobile ? "8px" : isMobile ? "10px" : "12px",
                color: "#6B7280",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}>
                Showing {totalEntries === 0 ? "0" : `${startIndex + 1}–${endIndex}`} of {totalEntries}
              </div>

              {/* Pagination */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: isSmallMobile ? "1px" : "2px",
                flexShrink: 0,
                justifyContent: "center",
              }}>
                <button
                  style={{
                    minWidth: isSmallMobile ? "20px" : "28px",
                    height: isSmallMobile ? "20px" : "28px",
                    borderRadius: "4px",
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    fontSize: isSmallMobile ? "9px" : "12px",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    fontWeight: 500,
                    color: "#111827",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s, border-color 0.12s",
                    opacity: currentPage === 1 ? 0.35 : 1,
                    padding: 0,
                  }}
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  &#8249;
                </button>
                
                {(() => {
                  const maxVisible = isSmallMobile ? 3 : 5;
                  let pages = [];
                  
                  if (totalPages <= maxVisible + 2) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    
                    let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
                    let end = Math.min(totalPages - 1, currentPage + Math.floor(maxVisible / 2));
                    
                    if (currentPage <= Math.floor(maxVisible / 2) + 1) {
                      end = maxVisible;
                    }
                    if (currentPage >= totalPages - Math.floor(maxVisible / 2)) {
                      start = totalPages - maxVisible + 1;
                    }
                    
                    if (start > 2) {
                      pages.push(-1); 
                    }
                    
                    for (let i = start; i <= end; i++) {
                      if (i > 1 && i < totalPages) {
                        pages.push(i);
                      }
                    }
                    
                    if (end < totalPages - 1) {
                      pages.push(-2); 
                    }
                    
                    if (totalPages > 1) {
                      pages.push(totalPages);
                    }
                  }
                  
                  return pages.map((p, index) => {
                    if (p === -1 || p === -2) {
                      return (
                        <span key={`ellipsis-${index}`} style={{ 
                          color: "#6B7280", 
                          fontSize: isSmallMobile ? 8 : 12, 
                          fontFamily: "'Montserrat', 'Fallback Montserrat'", 
                          padding: "0 2px" 
                        }}>
                          …
                        </span>
                      );
                    }
                    return (
                      <button
                        key={p}
                        style={{
                          minWidth: isSmallMobile ? "20px" : "28px",
                          height: isSmallMobile ? "20px" : "28px",
                          borderRadius: "4px",
                          border: p === currentPage ? "1px solid #7B1D1D" : "1px solid #E5E7EB",
                          background: p === currentPage ? "#7B1D1D" : "#FFFFFF",
                          fontSize: isSmallMobile ? "9px" : "12px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          fontWeight: p === currentPage ? 700 : 500,
                          color: p === currentPage ? "#FFFFFF" : "#111827",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.12s, border-color 0.12s",
                          padding: 0,
                        }}
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
                
                <button
                  style={{
                    minWidth: isSmallMobile ? "20px" : "28px",
                    height: isSmallMobile ? "20px" : "28px",
                    borderRadius: "4px",
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    fontSize: isSmallMobile ? "9px" : "12px",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    fontWeight: 500,
                    color: "#111827",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s, border-color 0.12s",
                    opacity: currentPage === totalPages ? 0.35 : 1,
                    padding: 0,
                  }}
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  &#8250;
                </button>
              </div>

              {/* Rows per page */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: isSmallMobile ? "2px" : "4px",
                fontSize: isSmallMobile ? "8px" : isMobile ? "10px" : "12px",
                color: "#6B7280",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}>
                <span style={{
                  fontSize: isSmallMobile ? "7px" : isMobile ? "9px" : "12px",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>Rows per page:</span>
                <select
                  style={{
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 4,
                    padding: isSmallMobile ? "1px 4px" : "4px 8px",
                    fontSize: isSmallMobile ? "8px" : isMobile ? "10px" : "12px",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    color: "#111827",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    outline: "none",
                    minWidth: isSmallMobile ? "32px" : "auto",
                  }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {[5, 10, 20, 50].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}