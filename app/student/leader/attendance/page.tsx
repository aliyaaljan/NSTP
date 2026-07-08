'use client'

import { useState, useEffect } from 'react'
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import AttendanceSessionCard from "@/components/shared/AttendanceSessionCard"
import { IconCalendar, IconClock } from "@tabler/icons-react"
import { getMyOpenSession, recordLeaderTimeIn, recordLeaderTimeOut } from "@/lib/attendance/qr-actions"
import { captureGeo, geoErrorMessage } from "@/lib/attendance/geo-client"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  greenBg: '#E8F5EF',
  maroon: "#7B1113",
  pageBg: "#F8F6F3",
  cardBg: "#FFFFFF",
  cardShadow: "0 4px 20px rgba(0,0,0,0.06)",
  border: "#EDE9E6",
  textDark: "#1A1A1A",
  textGray: "#8A8580",
}

const COLLAPSED_W = 88
const RAIL_MARGIN = 16

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

export default function LeaderAttendancePage() {
  const isMobile = useIsMobile()
  const [isActive, setIsActive] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<string | undefined>(undefined)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [profile, setProfile] = useState<{
    name: string
    initials: string
    section: string
  } | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [isMounted])

  useEffect(() => {
    let cancelled = false
    getMyOpenSession().then((res) => {
      if (cancelled) return
      if (res.ok) setIsActive(!!res.session)
    })
    getStudentDashboard().then((res) => {
      if (cancelled || !res.ok) return
      setProfile({
        name: res.data.fullName,
        initials: getInitials(res.data.fullName),
        section: res.data.sectionName ?? "",
      })
    })
    return () => { cancelled = true }
  }, [])

  const handleToggle = async () => {
    if (pending) return
    setPending(true)
    setFeedback(undefined)

    const geoResult = await captureGeo()
    const geo = geoResult.ok ? geoResult.geo : undefined

    if (!geoResult.ok) {
      setFeedback(geoErrorMessage(geoResult.reason))
    }

    if (!isActive) {
      const res = await recordLeaderTimeIn(geo)
      if (res.ok) {
        setIsActive(true)
        setFeedback(undefined)
      } else {
        setFeedback(res.error)
      }
    } else {
      const res = await recordLeaderTimeOut(geo)
      if (res.ok) {
        setIsActive(false)
        setFeedback(undefined)
      } else {
        setFeedback(res.error)
      }
    }

    setPending(false)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const info = [
    {
      id: 'date',
      label: 'Date',
      value: formatDate(currentTime),
      icon: 'ti-calendar',
      color: {
        bg: "#C8D8C0",
        text: "#2D5C3A",
        border: "#8AAE8A",
        icon: "#3A7A4A",
      },
    },
    {
      id: 'time',
      label: 'Time',
      value: formatTime(currentTime),
      icon: 'ti-clock',
      color: {
        bg: "#F5E6C0",
        text: "#8B5E1A",
        border: "#D4A840",
        icon: "#C8882A",
      },
    },
  ]

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
          paddingRight: isMobile ? "16px" : "40px",
          paddingTop: isMobile ? "16px" : "32px",
          paddingBottom: isMobile ? "80px" : "32px",
          display: "flex",
          flexDirection: "column",
          gap: 0, 
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          width: "100%",
          marginBottom: isMobile ? "16px" : "24px", // Gap between header and stat cards
        }}>
          <div>
            <h1
              style={{
                fontSize: isMobile ? "24px" : "34px",
                fontWeight: 800,
                color: C.maroon,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              Attendance
            </h1>
          </div>

          <div style={{ flexShrink: 0 }}>
            <ProfilePill
              name={profile?.name ?? ""}
              initials={profile?.initials ?? ""}
              section={profile?.section ?? ""}
            />
          </div>
        </div>

        {/* Date and Time */}
        <ChartStyles />
        
        <style>{`
          .db-kpi-value {
            font-size: ${isMobile ? '11px' : '20px'} !important;
            line-height: 1.2 !important;
          }
          .db-kpi-label {
            font-size: ${isMobile ? '9px' : '15px'} !important;
            line-height: 1.2 !important;
          }
          .db-kpi-icon {
            font-size: ${isMobile ? '16px' : '20px'} !important;
          }
          .attendance-stat-card {
            cursor: default !important;
          }
          .attendance-stat-card .db-kpi-card {
            cursor: default !important;
          }
          .attendance-stat-card:hover {
            border-color: ${COLORS.border} !important;
            transform: none !important;
          }
          .attendance-stat-card:hover .db-kpi-card {
            transform: none !important;
          }
        `}</style>

        <div style={{ marginBottom: "1px" }}> 
          <KpiStatCardGrid columns={2}>
            {info.map((stat) => {
              return (
                <div
                  key={stat.id}
                  className="attendance-stat-card"
                  style={{
                    cursor: "default",
                    borderRadius: COLORS.radius,
                    overflow: "hidden",
                    background: COLORS.cardBg,
                    color: "#000000",
                    border: `2px solid ${COLORS.border}`,
                  }}
                >
                  <KpiStatCard
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                  />
                </div>
              )
            })}
          </KpiStatCardGrid>
        </div>

        {/* Session Card */}
        <AttendanceSessionCard
          mode="toggle"
          isActive={isActive}
          pending={pending}
          onPrimary={handleToggle}
          isMobile={isMobile}
          helperText={feedback}
        />
      </main>
    </div>
  )
}