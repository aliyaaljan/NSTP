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

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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
          gap: isMobile ? "20px" : "28px",
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
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "12px" : "16px",
        }}>
          <div style={{
            background: C.cardBg,
            borderRadius: "16px",
            padding: isMobile ? "16px 20px" : "20px 28px",
            border: `2px solid ${C.border}`,
            boxShadow: C.cardShadow,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "14px" : "20px",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: isMobile ? "44px" : "52px",
              height: isMobile ? "44px" : "52px",
              borderRadius: "12px",
              background: C.greenBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.green,
              flexShrink: 0,
            }}>
              <IconCalendar size={isMobile ? 22 : 26} stroke={1.5} />
            </div>
            <div>
              <div style={{
                fontSize: isMobile ? "11px" : "12px",
                fontWeight: 600,
                color: C.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "2px",
              }}>
                Date
              </div>
              <div style={{
                fontSize: isMobile ? "16px" : "20px",
                fontWeight: 700,
                color: C.textDark,
              }}>
                {formatDate(currentTime)}
              </div>
            </div>
          </div>

          <div style={{
            background: C.cardBg,
            borderRadius: "16px",
            padding: isMobile ? "16px 20px" : "20px 28px",
            border: `2px solid ${C.border}`,
            boxShadow: C.cardShadow,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "14px" : "20px",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: isMobile ? "44px" : "52px",
              height: isMobile ? "44px" : "52px",
              borderRadius: "12px",
              background: C.greenBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.green,
              flexShrink: 0,
            }}>
              <IconClock size={isMobile ? 22 : 26} stroke={1.5} />
            </div>
            <div>
              <div style={{
                fontSize: isMobile ? "11px" : "12px",
                fontWeight: 600,
                color: C.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                marginBottom: "2px",
              }}>
                Time
              </div>
              <div style={{
                fontSize: isMobile ? "16px" : "20px",
                fontWeight: 700,
                color: C.textDark,
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: "0.5px",
              }}>
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
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
