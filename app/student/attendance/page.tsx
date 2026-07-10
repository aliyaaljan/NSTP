"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Montserrat } from "next/font/google"
import { QRCodeSVG } from "qrcode.react"
import StudentSidebar from "@/components/shared/ResponsiveStudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import AttendanceSessionCard from "@/components/shared/AttendanceSessionCard"
import { generateQrToken, getMyOpenSession, recordStudentTimeOut, recordLeaderTimeIn, recordLeaderTimeOut } from "@/lib/attendance/qr-actions"
import type { QrDisplayInfo } from "@/lib/attendance/qr-actions"
import { captureGeo, geoErrorMessage } from "@/lib/attendance/geo-client"
import {
  subscribeToAttendanceSignal,
  subscribeToAttendanceSessions,
} from "@/lib/attendance/realtime"
import { playSuccessSound, primeAudio } from "@/lib/attendance/sounds"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import { manilaClock } from "@/lib/student/leader/scan-history"
import {
  KpiStatCard,
  KpiStatCardGrid,
  ChartStyles,
} from "@/components/shared/ChartModule"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { IconCalendar, IconClock } from "@tabler/icons-react"
import { createClient } from "@/lib/client"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0F0F0",
  cardShadow: "0 3px 10px rgba(0,0,0,0.15)",
  qrBg: "#C8D6D0",
  green: '#14492E',
  greenBg: '#E8F5EF',
  cardBg: "#FFFFFF",
  border: "#EDE9E6",
  textDark: "#1A1A1A",
  textGray: "#8A8580",
}

const COLLAPSED_W = 88
const RAIL_MARGIN = 16

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return isMobile
}

export default function QRGenerationPage() {
  const isMobile = useIsMobile()
  const [isStudentLeader, setIsStudentLeader] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [display, setDisplay] = useState<QrDisplayInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [qrHidden, setQrHidden] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<
    "locating" | "generating" | null
  >(null)
  const [profile, setProfile] = useState<{
    fullName: string
    sectionName: string
  }>({
    fullName: "",
    sectionName: "",
  })

  const [hasOpenSession, setHasOpenSession] = useState(false)
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [justTimedIn, setJustTimedIn] = useState(false)
  const [timeoutPending, setTimeoutPending] = useState(false)
  const [timeoutFeedback, setTimeoutFeedback] = useState<string | undefined>(undefined)
  const [currentTime, setCurrentTime] = useState(new Date())

  const generatingRef = useRef(false)
  const displayRef = useRef<QrDisplayInfo | null>(null)
  const prevOpenRef = useRef(false)
  const initialLoadedRef = useRef(false)
  const timedInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadSeqRef = useRef(0)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    let cancelled = false
    
    const loadUserData = async () => {
      const res = await getStudentDashboard()
      if (cancelled || !res.ok) return
      
      setProfile({
        fullName: res.data.fullName,
        sectionName: res.data.sectionName ?? "",
      })
      
      // Check if leader
      const supabase = createClient()
      const { data: userData } = await supabase
        .from('enrollment')
        .select('is_student_leader')
        .eq('enrollment_id', res.data.enrollmentId)
        .single()
      
      if (userData) {
        setIsStudentLeader(userData.is_student_leader)
      }
    }
    
    loadUserData()
    
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadSessionStatus = useCallback(async () => {
    const seq = ++loadSeqRef.current
    const res = await getMyOpenSession()
    if (seq !== loadSeqRef.current) return

    if (!res.ok) {
      setSessionLoaded(true)
      initialLoadedRef.current = true
      return
    }
    const nowOpen = !!res.session

    if (initialLoadedRef.current && nowOpen && !prevOpenRef.current) {
      setJustTimedIn(true)
      playSuccessSound()
      if (timedInTimerRef.current) clearTimeout(timedInTimerRef.current)
      timedInTimerRef.current = setTimeout(() => setJustTimedIn(false), 5000)
    }

    prevOpenRef.current = nowOpen
    setHasOpenSession(nowOpen)
    setSessionStartedAt(res.session?.startedAt ?? null)
    setSessionLoaded(true)
    initialLoadedRef.current = true
  }, [])

  useEffect(() => {
    loadSessionStatus()
  }, [loadSessionStatus])

  useEffect(() => {
    const prime = () => primeAudio()
    window.addEventListener("pointerdown", prime, { once: true })
    window.addEventListener("keydown", prime, { once: true })
    return () => {
      window.removeEventListener("pointerdown", prime)
      window.removeEventListener("keydown", prime)
    }
  }, [])

  useEffect(() => {
    const unsubscribeSignal = subscribeToAttendanceSignal(() => loadSessionStatus())
    const unsubscribeChanges = subscribeToAttendanceSessions(() => loadSessionStatus())
    const reconcile = () => {
      if (!document.hidden) loadSessionStatus()
    }
    window.addEventListener("focus", reconcile)
    document.addEventListener("visibilitychange", reconcile)
    return () => {
      unsubscribeSignal()
      unsubscribeChanges()
      window.removeEventListener("focus", reconcile)
      document.removeEventListener("visibilitychange", reconcile)
      if (timedInTimerRef.current) clearTimeout(timedInTimerRef.current)
    }
  }, [loadSessionStatus])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          setLocationDenied(status.state === "denied")
          status.addEventListener("change", () => {
            setLocationDenied(status.state === "denied")
          })
        })
        .catch(() => { })
    }
  }, [])

  useEffect(() => {
    function onVisChange() {
      setQrHidden(document.hidden)
    }
    function onBlur() {
      setQrHidden(true)
    }
    function onFocus() {
      setQrHidden(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "PrintScreen" ||
        (e.key === "s" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        setQrHidden(true)
        navigator.clipboard?.writeText("")?.catch(() => { })
        setTimeout(() => setQrHidden(false), 800)
      }
    }

    document.addEventListener("visibilitychange", onVisChange)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("visibilitychange", onVisChange)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const runGenerate = useCallback(async (opts?: { silent?: boolean }) => {
    if (generatingRef.current) return
    generatingRef.current = true
    if (!opts?.silent) setLoadingPhase("locating")
    try {
      const result = await captureGeo()
      if (!result.ok) {
        setError(geoErrorMessage(result.reason))
        setToken(null)
        setDisplay(null)
        setGenerated(true)
        return
      }

      if (!opts?.silent) setLoadingPhase("generating")
      const res = await generateQrToken(result.geo)
      if (!res.ok) {
        setError(res.error)
        setToken(null)
        setDisplay(null)
        setGenerated(true)
        return
      }
      setError(null)
      setToken(res.token)
      setDisplay(res.display)
      setGenerated(true)
      setNow(Date.now())
    } catch (e) {
      console.error("[QR] generate failed", e)
      setError("Couldn't generate QR. Please try again.")
      setToken(null)
      setDisplay(null)
      setGenerated(true)
    } finally {
      generatingRef.current = false
      setLoadingPhase(null)
    }
  }, [])

  useEffect(() => {
    if (!generated) return
    const id = setInterval(() => {
      setNow(Date.now())
      const d = displayRef.current
      if (
        d &&
        new Date(d.expiresAt).getTime() <= Date.now() &&
        !generatingRef.current
      ) {
        runGenerate({ silent: true })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [generated, runGenerate])

  // Leader who timed in via the leader page (self_leader) and times out here
  // records a self_student-source time-out — cosmetic source mismatch, not a functional bug.
  const handleTimeOut = async () => {
    if (timeoutPending) return
    setTimeoutPending(true)
    setTimeoutFeedback(undefined)

    const geoResult = await captureGeo()
    const geo = geoResult.ok ? geoResult.geo : undefined

    if (!geoResult.ok) {
      setTimeoutFeedback(geoErrorMessage(geoResult.reason))
    }

    const res = await recordStudentTimeOut(geo)
    if (res.ok) {
      loadSeqRef.current++
      prevOpenRef.current = false
      setHasOpenSession(false)
      setSessionStartedAt(null)
      setTimeoutFeedback(undefined)
    } else {
      setTimeoutFeedback(res.error)
    }

    setTimeoutPending(false)
  }

  // Leader toggle
  const handleLeaderToggle = async () => {
    if (timeoutPending) return
    setTimeoutPending(true)
    setTimeoutFeedback(undefined)

    const geoResult = await captureGeo()
    const geo = geoResult.ok ? geoResult.geo : undefined

    if (!geoResult.ok) {
      setTimeoutFeedback(geoErrorMessage(geoResult.reason))
    }

    if (!hasOpenSession) {
      const res = await recordLeaderTimeIn(geo)
      if (res.ok) {
        setHasOpenSession(true)
        setTimeoutFeedback(undefined)
        loadSessionStatus()
      } else {
        setTimeoutFeedback(res.error)
      }
    } else {
      const res = await recordLeaderTimeOut(geo)
      if (res.ok) {
        setHasOpenSession(false)
        setTimeoutFeedback(undefined)
        loadSessionStatus()
      } else {
        setTimeoutFeedback(res.error)
      }
    }

    setTimeoutPending(false)
  }

  const timeLabel = display
    ? new Date(display.generatedAt).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : ""

  const locationLabel = display
    ? `${display.latitude.toFixed(5)}, ${display.longitude.toFixed(5)}`
    : ""

  const remainingMs = display
    ? Math.max(0, new Date(display.expiresAt).getTime() - now)
    : 0
  const remainingSec = Math.ceil(remainingMs / 1000)
  const pct = display
    ? Math.max(0, Math.min(100, (remainingMs / 60000) * 100))
    : 0

  const sessionHelperText = hasOpenSession && sessionStartedAt
    ? `since ${manilaClock(sessionStartedAt)}`
    : !hasOpenSession
      ? isStudentLeader 
        ? "Time in to start your attendance session" 
        : "Your leader scans your QR to time you in."
      : undefined

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

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  return (
    <>
      <style>{`
        .qr-page {
          min-height: 100vh;
          display: flex;
          background: ${C.pageBg};
          font-family: 'Montserrat', sans-serif;
        }

        .qr-main {
          flex: 1;
          margin-left: 120px;
          padding: 28px 32px;
          min-width: 0;
        }

        .qr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .qr-title {
          font-size: 34px;
          font-weight: 800;
          color: ${C.maroon};
          margin: 0;
          letter-spacing: -1px;
        }

        .qr-box{
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(127,165,143,.18), transparent 45%),
            radial-gradient(circle at bottom right, rgba(123,17,19,.08), transparent 40%),
            linear-gradient(180deg, #FBFCFB 0%, #F4F7F5 100%);
          border:2px solid #D9DDD8;
          border-radius:28px;
          min-height:650px;
          padding:40px;
          display:flex;
          justify-content:center;
          align-items:center;
      }


      .qr-card {
        width:420px;
        min-height:560px;
        background:#FFFFFF;
        border-radius:28px;
        box-shadow:0 8px 25px rgba(0,0,0,.08);
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
        padding:40px;
        border:1px solid #E7E7E7;
      }

        .qr-code {
          width: 220px;
          height: 220px;
          border-radius: 8px;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }

        .qr-spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #E3E8E4;
          border-top-color: #7FA58F;
          border-radius: 50%;
          animation: qr-spin 0.9s linear infinite;
        }

        .info-box{
          background:#F7F8F6;
          padding:12px;
          border-radius:14px;
          font-size:12px;
          font-weight:600;
          color:#555;
        }

        .qr-heading {
          text-align:center;
          margin-bottom:24px;
        }

        .qr-heading h2 {
          font-size:22px;
          font-weight:800;
          color:#7B1113;
          margin:0;
        }

        .qr-heading p {
          font-size:13px;
          color:#7A7A7A;
          margin-top:8px;
        }


        .qr-loading {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:18px;
        }

        .qr-loading p {
          font-size:14px;
          font-weight:600;
          color:#7B1113;
          text-align:center;
        }


        .qr-message {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:12px;
          text-align:center;
        }


        .qr-error {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:18px;
          text-align:center;
        }


        .qr-error p {
          font-size:14px;
          font-weight:600;
          color:#7B1113;
          max-width:300px;
        }


        .qr-button {
          background:#7FA58F;
          border:none;
          border-radius:40px;
          padding:14px 28px;
          font-size:16px;
          font-weight:800;
          cursor:pointer;
          transition:.2s;
        }


        .qr-button:hover {
          transform:translateY(-2px);
        }


        .qr-generate-button {
          padding:18px 38px;
          font-size:22px;
        }


        .qr-disabled {
          background:#ccc;
          cursor:not-allowed;
          opacity:.6;
        }


        .qr-active {
          background:#E4F0E7;
          color:#7FA58F;
          padding:6px 16px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
        }


        .qr-display {
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:16px;
          text-align:center;
        }


        .qr-progress-container {
          width:220px;
          max-width:100%;
        }


        .qr-progress {
          height:6px;
          border-radius:999px;
          background:#E3E8E4;
          overflow:hidden;
        }


        .qr-progress-bar {
          height:100%;
          background:#7FA58F;
          transition:width 1s linear;
        }


        .qr-countdown {
          font-size:12px;
          font-weight:600;
          margin-top:6px;
          text-align:center;
        }


        .qr-info {
          background:#F7F8F6;
          padding:12px;
          border-radius:14px;
          font-size:12px;
          font-weight:600;
          color:#555;
        }


        .qr-regenerate {
          box-shadow:0 8px 20px rgba(1,68,33,.25);
        }

        @keyframes qr-spin {
          to { transform: rotate(360deg); }
        }


        @media(max-width: 900px){

          .qr-main {
            margin-left: 100px;
            padding: 24px 20px;
          }

          .qr-title {
            font-size: 34px;
          }

          .qr-box {
            height:auto;
            min-height:520px;
          }

        }


        @media(max-width: 600px){

          .qr-main {
            margin-left: 0;
            padding: 20px 12px;
            padding-bottom: 110px;
          }


          .qr-header {
            gap: 10px;
          }


          .qr-title {
            font-size: 24px;
            letter-spacing: -0.5px;
          }


          .qr-box{
            position: relative;
            overflow: hidden;

            background: white;
            border: 2px solid #D9DDD8;
            border-radius: 28px;
            min-height: 650px;
            padding: 40px;

            display: flex;
            justify-content: center;
            align-items: center;
        }

          .qr-box::before{
            content: "";
            position: absolute;
            width: 350px;
            height: 350px;
            border-radius: 50%;
            background: rgba(127, 165, 143, 0.18);
            filter: blur(80px);

            top: -120px;
            left: -120px;

            z-index: 0;
        }

        .qr-box::after{
            content: "";
            position: absolute;
            width: 280px;
            height: 280px;
            border-radius: 50%;
            background: rgba(123, 17, 19, 0.12);
            filter: blur(70px);

            bottom: -100px;
            right: -100px;

            z-index: 0;
        }


          .qr-card {
            width: 100%;
            min-height: 360px;
            padding: 20px;
            border-radius: 22px;
            position: relative;
            z-index: 1;
          }


          .qr-code {
            width: 160px;
            height: 160px;
          }

        }


        @media(max-width: 420px){

          .qr-main {
            margin-left: 70px;
            padding: 16px 10px;
          }


          .qr-title {
            font-size: 20px;
          }


          .qr-card {
            padding: 15px;
          }

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

      `}</style>

      <div className={`${montserrat.variable} qr-page`}>
        <StudentSidebar isLeader={isStudentLeader} />

        <main className="qr-main" style={{
          paddingLeft: isStudentLeader ? leftPadding : undefined,
          paddingRight: isStudentLeader && isMobile ? "16px" : undefined,
          paddingTop: isStudentLeader && isMobile ? "16px" : undefined,
          paddingBottom: isStudentLeader && isMobile ? "80px" : undefined,
        }}>
          <div className="qr-header">
            <h1 className="qr-title">Attendance</h1>

            <ProfilePill
              name={profile.fullName}
              initials={getInitials(profile.fullName)}
              section={profile.sectionName}
            />
          </div>

          <div
            style={{
              background: "#D9DDD8",
              marginTop: 10,
              marginBottom: 24,
            }}
          />

          {isStudentLeader && (
            <>
              <ChartStyles />
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
            </>
          )}

          {justTimedIn && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                background: "#E8F5EF",
                color: "#14492E",
                border: "2px solid #14492E",
                borderRadius: 14,
                padding: "14px 20px",
                marginBottom: 20,
                fontWeight: 800,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              ✓ You&apos;ve been timed in!
              {sessionStartedAt ? ` (${manilaClock(sessionStartedAt)})` : ""}
            </div>
          )}

          {!sessionLoaded ? (
            <div className="qr-box">
              <div className="qr-card">
                <div className="qr-loading">
                  <div className="qr-spinner" />
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.maroon,
                      textAlign: "center",
                    }}
                  >
                    Checking your attendance status…
                  </p>
                </div>
              </div>
            </div>
          ) : hasOpenSession ? (
            <AttendanceSessionCard
              mode={isStudentLeader ? "toggle" : "timeoutOnly"}
              isActive={hasOpenSession}
              pending={timeoutPending}
              onPrimary={isStudentLeader ? handleLeaderToggle : handleTimeOut}
              isMobile={isMobile}
              helperText={timeoutFeedback ?? sessionHelperText}
            />
          ) : isStudentLeader ? (
            <AttendanceSessionCard
              mode="toggle"
              isActive={hasOpenSession}
              pending={timeoutPending}
              onPrimary={handleLeaderToggle}
              isMobile={isMobile}
              helperText={timeoutFeedback ?? sessionHelperText}
            />
          ) : (
            <div className="qr-box">
              <div className="qr-card">
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 24,
                  }}
                >
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: C.maroon,
                      margin: 0,
                    }}
                  >
                    ATTENDANCE QR
                  </h2>

                  <p
                    style={{
                      fontSize: 13,
                      color: "#7A7A7A",
                      marginTop: 8,
                    }}
                  >
                    Scan this QR code to record attendance
                  </p>
                </div>

                {loadingPhase ? (
                  <div className="qr-loading">
                    <div className="qr-spinner" />
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.maroon,
                        textAlign: "center",
                      }}
                    >
                      {loadingPhase === "locating"
                        ? "Getting your location…"
                        : "Generating secure QR…"}
                    </p>
                  </div>
                ) : !generated ? (
                  <div className="qr-message">
                    {locationDenied && (
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.maroon,
                          textAlign: "center",
                          maxWidth: 260,
                        }}
                      >
                        Location access is off. Enable it for this site in your
                        browser settings to generate a QR.
                      </p>
                    )}
                    <button
                      onClick={() => runGenerate()}
                      disabled={locationDenied}
                      className={`qr-button qr-generate-button ${locationDenied ? "qr-disabled" : ""
                        }`}
                    >
                      Generate QR
                    </button>
                  </div>
                ) : error ? (
                  <div className="qr-error">
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.maroon,
                        textAlign: "center",
                        maxWidth: 300,
                      }}
                    >
                      {error}
                    </p>
                    <button onClick={() => runGenerate()} className="qr-button">
                      REGENERATE QR
                    </button>
                  </div>
                ) : (
                  <div className="qr-display">
                    <div className="qr-active">● QR ACTIVE</div>

                    <div className="qr-code">
                      {token && !qrHidden && (
                        <QRCodeSVG
                          value={token}
                          size={220}
                          level="M"
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                          }}
                        />
                      )}
                      {token && qrHidden && (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "#000",
                            borderRadius: 8,
                          }}
                        />
                      )}
                    </div>

                    {token && (
                      <div className="qr-progress-container">
                        <div className="qr-progress">
                          <div
                            className="qr-progress-bar"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            marginTop: 6,
                            textAlign: "center",
                          }}
                        >
                          Refreshes in {remainingSec}s
                        </p>
                      </div>
                    )}

                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: "5px",
                        }}
                      >
                        Location of Generation:
                        <br />
                        {locationLabel || "—"}
                      </p>

                      <p style={{ fontSize: 14, fontWeight: 600 }}>
                        Time of Generation:
                        <br />
                        {timeLabel || "—"}
                      </p>
                    </div>

                    <button
                      onClick={() => runGenerate()}
                      className="qr-button qr-regenerate"
                    >
                      REGENERATE QR
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}