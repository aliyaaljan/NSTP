"use client"

import CalendarOverview from "@/components/student/Calendar";
import Documents from "@/components/student/Forms";
import ScannedStudents from "@/components/student/ScannedStudents";
import type { GeneratedStudent } from "@/components/student/ScannedStudents";
import QuickAccess from "@/components/student/QuickAccess";

import { useState, useEffect } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/ResponsiveStudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import type { StudentDashboardData } from "@/lib/student/dashboard-actions"
import { getMyForms } from "@/lib/forms/submission-actions"
import type { StudentFormView } from "@/lib/forms/submission-actions"
import { getStudentRequests } from "@/lib/student/appeal-actions"
import { createClient } from "@/lib/client"
import { getInitials, formsToDocuments, formsToCalendarEvents } from "@/lib/student/dashboard-view"
import { manilaClock } from "@/lib/student/leader/scan-history"
import LoadingPage from "@/components/shared/LoadingPage"
import { useStudent } from "@/app/student/StudentContext"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  maroon:      "#7B1113",
  maroonDark:  "#6B0D10",
  gold:        "#14492E",
  goldBg:      "#FFF3CD",
  goldText:    "#4A2C00",
  pageBg:      "#F0F0F0",
  cardBg:      "#FFFFFF",
  cardShadow:  "0 1px 4px rgba(0,0,0,0.06)",
  border:      "#ECECEA",
  hoursBg:     "#E8EDE5",
  hoursBorder: "#C5D4BC",
  track:       "#D4D9CC",
  textDark:    "#2C2C2A",
  textGray:    "#8C8C88",
  textMuted:   "#C8C8C4",
  textSub:     "#5A5A58",
  iconBg: "#F8DCDD",
}

const COLLAPSED_W  = 88
const RAIL_MARGIN  = 16

// HOURS FUNCTION --------------- 

function HoursCard({
  rendered,
  target,
  isMobile,
  deadline,
}: {
  rendered: number
  target: number
  isMobile: boolean
  deadline: string | null
}) {
  const percent = Math.min(100, Math.round((rendered / target) * 100))
  const daysRemaining = deadline
  ? (() => {
      const diff =
        (new Date(deadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)

      return diff >= 0 ? Math.ceil(diff) : Math.floor(diff)
    })()
  : null

  return (
    <div style={{ 
      background: C.cardBg, 
      borderRadius: 15, 
      padding: "18px 22px", 
      transition: "all 0.3s ease",
      boxShadow: C.cardShadow,
    }}>
      <div
      style={{
        fontSize: "clamp(15px, 1.2vw, 15px)",
        fontWeight: 700,
        color: C.textDark,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "flex-end",
        gap: 6,
        width: "100%",
      }}
    >
      <span>Hours Accomplished:</span>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: "clamp(20px, 2vw, 26px)",
            color: C.gold,
            lineHeight: 1,
          }}
        >
          {rendered}
        </span>

        <span>/ {target} hours</span>
      </div>

      {daysRemaining !== null && (
        <span
          style={{
            marginLeft: isMobile ? 0 : "auto",
            fontSize: "clamp(12px, 1vw, 14px)",
            fontWeight: 700,
            color: C.textMuted,
            whiteSpace: "nowrap",
            alignSelf: isMobile ? "flex-start" : "auto",
          }}
        >
         {daysRemaining > 0
      ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`
      : daysRemaining === 0
      ? "Last day"
      : `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} past deadline`}
        </span>
      )}
    </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 12,
        flexWrap: "wrap",
      }}>
        <span style={{ 
          fontSize: "clamp(20px, 1.1vw, 14px)", 
          fontWeight: 700, 
          color: C.textDark, 
          minWidth: 36 
        }}>
          {percent}%
        </span>
        <div style={{ 
          flex: 1, 
          minWidth: "60px",
          height: "clamp(18px, 2vw, 22px)", 
          background: C.track, 
          borderRadius: 6,  //hehe if 14 po kasi itll look round lang kaya 7 nalang, medj same naman na sa container i thikn
          overflow: "hidden" 
        }}>
          <div style={{ 
            width: `${percent}%`, 
            height: "100%", 
            background: C.gold, 
            borderRadius: 4, 
            transition: "width 0.4s ease" 
          }} />
        </div>
      </div>
    </div>
  )
}

// MAIN PAGE -------------------------------

export default function StudentDashboardPage() {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isVerySmall, setIsVerySmall] = useState(false)
  const [isScannedExpanded, setIsScannedExpanded] = useState(false)
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [formViews, setFormViews] = useState<StudentFormView[]>([])
  const [rosterStudents, setRosterStudents] = useState<GeneratedStudent[]>([])
  const [recentRequests, setRecentRequests] = useState<
    { title: string; status: string; time: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const { isLeader, isLoading: contextLoading } = useStudent()

  useEffect(() => {
    const accepted = localStorage.getItem("privacyAccepted")
    setShowPrivacyModal(accepted !== "true")

    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsVerySmall(width < 480)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)

  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await getStudentDashboard()
        if (!res.ok) return
        setDashboard(res.data)

        if (res.data.enrollmentId) {
          const formsRes = await getMyForms(res.data.enrollmentId)
          if (formsRes.ok) setFormViews(formsRes.data)

          const requestsRes = await getStudentRequests(res.data.enrollmentId)
          if (requestsRes.ok) {
            setRecentRequests(
              requestsRes.data
                .slice(0, 3)
                .map((r) => ({ title: r.title, status: r.status, time: r.date }))
            )
          }
        }

        const supabase = createClient()
        const { data: rosterData } = await supabase.rpc("get_leader_section_dashboard")
        if (rosterData && rosterData.length > 0) {
          const row = rosterData[0]
          const students: GeneratedStudent[] = ((row.students as any[]) ?? []).map(
            (s: any, i: number) => ({
              id: s.enrollment_id ?? String(i),
              name: s.name ?? "",
              studentId: s.student_number ?? "",
              generatedAt: s.generated_at ? manilaClock(s.generated_at) : "",
              scanned: !!s.has_open_session,
              scannedAt: s.scanned_at ? manilaClock(s.scanned_at) : undefined,
            })
          )
          setRosterStudents(students)
        }
      } catch (err) {
        console.error("[student/dashboard] load failed", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fullName = dashboard?.fullName ?? ""
  const firstName = fullName.split(" ")[0] || ""
  const initials = getInitials(fullName)
  const sectionName = dashboard?.sectionName ?? ""
  const hoursRendered = dashboard?.hoursRendered ?? 0
  const hoursTarget = dashboard?.requiredHours ?? 60

  // Calculate left padding
  const getLeftPadding = () => {
    if (isMobile) {
      return "16px"
    }
    if (isTablet) {
      const width = window.innerWidth
      const minPadding = 70
      const maxPadding = 88
      const minWidth = 768
      const maxWidth = 1024
      const ratio = Math.min(1, Math.max(0, (width - minWidth) / (maxWidth - minWidth)))
      const padding = minPadding + ratio * (maxPadding - minPadding)
      return `${Math.round(padding)}px`
    }
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`
  }

  // Calculate padding
  const getPadding = () => {
    if (isVerySmall) {
      return {
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '20px',
        paddingBottom: '110px',
      }
    }
    if (isMobile) {
      return {
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingTop: '20px',
        paddingBottom: '110px',
      }
    }
    if (isTablet) {
      const width = window.innerWidth
      const minPadding = 70
      const maxPadding = 88
      const minWidth = 768
      const maxWidth = 1024
      const ratio = Math.min(1, Math.max(0, (width - minWidth) / (maxWidth - minWidth)))
      const leftPadding = minPadding + ratio * (maxPadding - minPadding)
      
      const rightMin = 20
      const rightMax = 32
      const rightPadding = rightMin + ratio * (rightMax - rightMin)
      
      return {
        paddingLeft: `${Math.round(leftPadding)}px`,
        paddingRight: `${Math.round(rightPadding)}px`,
        paddingTop: '28px',
        paddingBottom: '28px',
      }
    }
    return {
      paddingLeft: `${COLLAPSED_W + RAIL_MARGIN * 2}px`,
      paddingRight: '32px',
      paddingTop: '28px',
      paddingBottom: '28px',
    }
  }

  const padding = getPadding()

  const scannedCount = rosterStudents.filter((s) => s.scanned).length
  const totalStudents = rosterStudents.length
  const percentage = totalStudents > 0 ? Math.round((scannedCount / totalStudents) * 100) : 0

  // Select sidebar based on role
  const SidebarComponent = () => <Sidebar isLeader={isLeader} />

  if (loading || contextLoading) {
    return <LoadingPage Sidebar={SidebarComponent} />
  }

  return (
    <>
      <style>{`
        /* Desktop: 1100px and above */
        @media (min-width: 1100px) {
          .db-main { padding: 34px 40px 34px 130px !important; }
          .db-grid-3col { 
            display: grid !important;
            grid-template-columns: 3.5fr 3.5fr 1.5fr !important;
            gap: 20px !important;
          }
          .db-scanned-container { margin-top: 8px !important; }
          /* Desktop order: Calendar, Docs, QuickAccess */
          .db-col-calendar { order: 1 !important; }
          .db-col-docs { order: 2 !important; }
          .db-col-quick { order: 3 !important; }
        }

        /* Tablet: 768px to 1099px */
        @media (min-width: 768px) and (max-width: 1099px) {
          .db-main { padding: 28px 20px 28px 125px !important; }
          .db-header-title { font-size: 30px; }
          .db-grid-3col { 
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .db-grid-3col > div { 
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
          }
          .db-scanned-container { margin-top: 8px !important; }
          /* Tablet order: QuickAccess first, then Calendar, then Docs */
          .db-col-quick { order: 1 !important; }
          .db-col-calendar { order: 2 !important; }
          .db-col-docs { order: 3 !important; }
        }

        /* Mobile: 767px and below */
        @media (max-width: 767px) {
          .db-main { 
            margin-left: 0 !important;
            padding: 20px 16px 110px 16px !important;
          }
          .db-header { 
            gap: 12px; 
            align-items: center; 
            margin-bottom: 16px;
          }
          .db-header-title { 
            font-size: 24px !important;
            color: #6B1A1A !important;
            padding-top: clamp(43px, 0.5vw, 20px);
          }
          .db-scanned-card { 
            padding: 14px 18px !important;
          }
          .db-scanned-students { 
            margin-top: 10px !important;
          }
          .profile-pill-wrapper { display: none; }
          .db-grid-3col { 
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .db-grid-3col > div { 
            min-height: auto !important;
            max-height: none !important;
            height: auto !important;
          }
          .db-scanned-container { margin-top: 8px !important; }
          /* Mobile order: QuickAccess first, then Docs, then Calendar */
          .db-col-quick { order: 0 !important; }
          .db-col-docs { order: 1 !important; }
          .db-col-calendar { order: 2 !important; }
        }

        /* Small mobile: 480px and below */
        @media (max-width: 480px) {
          .db-main { padding: 20px 16px 110px 16px !important; }
          .db-header-title { 
            font-size: 20px !important;
            color: #6B1A1A !important;
          }
          .db-scanned-card { padding: 12px 14px !important; }
          .db-scanned-students { margin-top: 8px !important; }
          .db-scanned-container { margin-top: 6px !important; }
        }

        /* Profile pill visible on tablet and desktop */
        @media (min-width: 768px) {
          .profile-pill-wrapper { display: block; }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .db-scanned-students {
          animation: slideDown 0.3s ease-out;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .db-scanned-container {
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          position: relative;
          z-index: 1;
          flex-shrink: 0;
        }

        .db-content-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .db-grid-3col {
          flex: 1;
          min-height: 0;
        }

        .db-grid-3col > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <div
        className={montserrat.variable}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          background: C.pageBg,
          minHeight: "100vh",
          display: "flex",
        }}
      >
        <SidebarComponent />

        <main
          className="db-main"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: isVerySmall ? "12px" : isMobile ? "14px" : "20px",
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
            transition: "padding 0.3s ease",
            boxSizing: "border-box",
            paddingLeft: padding.paddingLeft,
            paddingRight: padding.paddingRight,
            paddingTop: padding.paddingTop,
            paddingBottom: padding.paddingBottom,
          }}
        >
          {/* header */}
          <div className="db-header" style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: isVerySmall ? "flex-start" : "center",
            flexDirection: isVerySmall ? "column" : "row",
            flexWrap: "wrap",
            gap: isVerySmall ? "8px" : "12px",
            width: "100%",
            flexShrink: 0,
          }}>
            <h1 className="db-header-title" style={{ 
              fontSize: isVerySmall ? "clamp(18px, 5vw, 20px)" : isMobile ? "clamp(20px, 5vw, 24px)" : "clamp(24px, 2.5vw, 30px)", 
              fontWeight: 800, 
              color: C.maroon, 
              margin: 0,
              wordBreak: "break-word",
            }}>
              Hello, {firstName}!
            </h1>
            <div className="profile-pill-wrapper">
              <ProfilePill
                name={fullName}
                initials={initials}
                section={sectionName}
                avatarUrl={dashboard?.avatarUrl ?? null}
              />
            </div>
          </div>

          {/* Hours Card */}
          <HoursCard
            rendered={hoursRendered}
            target={hoursTarget}
            isMobile={isMobile}
            deadline={dashboard?.termEndDate ?? null}
          />

          {/* Content Wrapper */}
          <div className="db-content-wrapper">
            <div className="db-grid-3col">
              {/* Calendar */}
              <div className="db-col-calendar" style={{ 
                minHeight: isMobile ? "450px" : "500px",
                maxHeight: isMobile ? "500px" : "550px",
              }}>
                <CalendarOverview
                  documentEvents={formsToCalendarEvents(formViews)}
                  renderedDaysByMonth={dashboard?.renderedDaysByMonth ?? {}}
                  renderedTimeByMonth={dashboard?.renderedTimeByMonth ?? {}}
                />
              </div>

              {/* Documents / Forms */}
              <div className="db-col-docs" style={{ 
                minHeight: isMobile ? "400px" : "500px",
                maxHeight: isMobile ? "500px" : "550px",
                scrollbarWidth: "thin",
                scrollbarColor: "#C8C8C4 transparent",
              }}>
                <Documents Forms={formsToDocuments(formViews)} />
              </div>

              {/* QuickAccess */}
              <div className="db-col-quick" style={{ 
                minHeight: isMobile ? "350px" : "500px",
                maxHeight: isMobile ? "500px" : "550px",
                height: "100%",
              }}>
                <QuickAccess
                  isMobile={isMobile}
                  studentName={fullName}
                  sectionName={sectionName}
                  adviserName={dashboard?.adviserName ?? null}
                  classmateCount={dashboard?.classmateCount ?? 0}
                  classmateInitials={dashboard?.classmateInitials ?? []}
                  classmates={dashboard?.classmates}
                  filesTotal={formViews.length}
                  filesSubmitted={
                    formViews.filter(
                      (v) => v.status === "submitted" || v.status === "approved"
                    ).length
                  }
                  recentRequests={recentRequests}
                  isLeader={isLeader}
                />
              </div>
            </div>

            {/* Scanned Students (Leader Only) */}
            {isLeader && rosterStudents.length > 0 && (
              <div className="db-scanned-container">
                <button
                  onClick={() => setIsScannedExpanded(!isScannedExpanded)}
                  className="db-scanned-card"
                  style={{
                    width: "100%",
                    maxWidth: "100%",
                    textAlign: "left",
                    background: C.cardBg,
                    borderRadius: "14px",
                    border: `1px solid ${C.border}`,
                    boxShadow: C.cardShadow,
                    padding: isVerySmall ? "12px 14px" : isMobile ? "14px 18px" : "18px 22px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: isVerySmall ? "8px" : isMobile ? "10px" : "0",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.002)"
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.boxShadow = C.cardShadow
                  }}
                >
                  {/* Top */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    width: "100%",
                    gap: isVerySmall ? "8px" : "12px",
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: isVerySmall ? "8px" : isMobile ? "10px" : "16px", 
                      flex: 1,
                      minWidth: 0,
                    }}>
                      <div
                        style={{
                          width: isVerySmall ? "28px" : isMobile ? "32px" : "44px",
                          height: isVerySmall ? "28px" : isMobile ? "32px" : "44px",
                          borderRadius: "50%",
                          background: C.gold,
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width={isVerySmall ? "12" : isMobile ? "14" : "20"} 
                          height={isVerySmall ? "12" : isMobile ? "14" : "20"} 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: isVerySmall ? "clamp(11px, 1.2vw, 13px)" : isMobile ? "clamp(12px, 1.2vw, 14px)" : "clamp(15px, 1.2vw, 17px)", 
                          fontWeight: 700, 
                          color: C.textDark,
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}>
                          Scanned Students
                        </div>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: isVerySmall ? "4px" : "6px",
                          marginTop: "2px",
                          flexWrap: "wrap",
                        }}>
                          <span style={{ 
                            fontSize: isVerySmall ? "clamp(9px, 1vw, 11px)" : isMobile ? "clamp(10px, 1vw, 12px)" : "clamp(13px, 1vw, 14px)", 
                            fontWeight: 500, 
                            color: C.maroon 
                          }}>
                            {scannedCount} / {totalStudents}
                          </span>
                          <span style={{ 
                            fontSize: isVerySmall ? "9px" : isMobile ? "10px" : "12px", 
                            color: C.textGray,
                          }}>
                            students
                          </span>
                          {isVerySmall && (
                            <span style={{ 
                              fontSize: "9px", 
                              color: C.textGray,
                              background: C.hoursBg,
                              padding: "1px 8px",
                              borderRadius: "10px",
                            }}>
                              {percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View All / Hide button */}
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: isVerySmall ? "4px" : "6px",
                      color: C.textGray,
                      flexShrink: 0,
                    }}>
                      <span style={{ 
                        fontSize: isVerySmall ? "10px" : isMobile ? "11px" : "12px", 
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}>
                        {isScannedExpanded ? "Hide" : "View All"}
                      </span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width={isVerySmall ? "14" : isMobile ? "16" : "18"} 
                        height={isVerySmall ? "14" : isMobile ? "16" : "18"} 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ 
                          transition: "transform 0.3s ease",
                          transform: isScannedExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          flexShrink: 0,
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Bottom row */}
                  <div style={{ 
                    display: isVerySmall || isMobile ? "flex" : "none",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    paddingTop: isVerySmall ? "4px" : "6px",
                  }}>
                    <div style={{ 
                      flex: 1,
                      height: "6px", 
                      borderRadius: "4px", 
                      background: C.track, 
                      overflow: "hidden",
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: "100%", 
                        background: C.gold, 
                        borderRadius: "4px",
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                    {!isVerySmall && (
                      <span style={{ 
                        fontSize: isMobile ? "10px" : "11px", 
                        color: C.textGray,
                        background: C.hoursBg,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}>
                        {percentage}%
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded List */}
                {isScannedExpanded && (
                  <div className="db-scanned-students" style={{ 
                    marginTop: isVerySmall ? "8px" : isMobile ? "10px" : "12px",
                  }}>
                    <ScannedStudents variant="list" students={rosterStudents} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODAL */}
          {showPrivacyModal && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(255,255,255,0.35)",
                  backdropFilter: "blur(6px)",
                  zIndex: 999,
                }}
              />

              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    width: isVerySmall ? "98%" : isMobile ? "95%" : 600,
                    maxWidth: "100%",
                    background: C.maroon,
                    borderRadius: 28,
                    padding: isVerySmall ? "12px" : isMobile ? "14px" : "18px 22px 20px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                    maxHeight: "90vh",
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      color: "#fff",
                      fontSize: isVerySmall ? "14px" : isMobile ? "15px" : "18px",
                      fontWeight: 800,
                      marginBottom: isVerySmall ? "10px" : "14px",
                    }}
                  >
                    DATA PRIVACY AGREEMENT
                  </div>

                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 26,
                      padding: isVerySmall ? "12px" : isMobile ? "14px" : "20px",
                      minHeight: "auto",
                      maxHeight: "50vh",
                      overflowY: "auto",
                    }}
                  >
                    <p style={{ 
                      fontSize: isVerySmall ? "12px" : isMobile ? "13px" : "15px", 
                      lineHeight: isVerySmall ? 1.6 : isMobile ? 1.7 : 2, 
                      marginBottom: isVerySmall ? "12px" : "16px" 
                    }}>
                      By continuing to use this system, you acknowledge and consent to the collection, processing, and storage of your personal information — including location data and device information (with a device identifier stored in your browser) captured during attendance actions — in accordance with the Data Privacy Act of 2012.
                    </p>

                    <p style={{ 
                      fontSize: isVerySmall ? "12px" : isMobile ? "13px" : "15px", 
                      lineHeight: isVerySmall ? 1.5 : isMobile ? 1.6 : 1.7 
                    }}>
                      Your information will only be used for NSTP-related transactions and academic requirements.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: isVerySmall ? "10px" : "12px",
                    }}
                  >
                    <button
                      onClick={() => {
                        localStorage.setItem("privacyAccepted", "true")
                        setShowPrivacyModal(false)
                      }}
                      style={{
                        background: C.green,
                        color: "#fff",
                        border: "1px solid #C6C6C6",
                        borderRadius: 999,
                        padding: isVerySmall ? "6px 16px" : isMobile ? "7px 18px" : "6px 18px",
                        fontSize: isVerySmall ? "12px" : isMobile ? "13px" : "15px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.02)"
                        e.currentTarget.style.opacity = "0.9"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)"
                        e.currentTarget.style.opacity = "1"
                      }}
                    >
                      I agree
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}