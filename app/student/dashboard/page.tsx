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
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
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
            {daysRemaining} days remaining
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
      setIsVerySmall(width < 380)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)

  }, [])

  useEffect(() => {
    async function load() {
      const res = await getStudentDashboard()
      if (!res.ok) {
        setLoading(false)
        return
      }
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
      setLoading(false)
    }
    load()
  }, [])

  const fullName = dashboard?.fullName ?? ""
  const firstName = fullName.split(" ")[0] || ""
  const initials = getInitials(fullName)
  const sectionName = dashboard?.sectionName ?? ""
  const hoursRendered = dashboard?.hoursRendered ?? 0
  const hoursTarget = dashboard?.requiredHours ?? 60

  // Calculate left padding (edited to cater yung nasa baba na navbar on mobile)
  const getLeftPadding = () => {
    if (isMobile || isTablet) {
      return "20px"
    }
  
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`
  }

  const scannedCount = rosterStudents.filter((s) => s.scanned).length
  const totalStudents = rosterStudents.length
  const percentage = totalStudents > 0 ? Math.round((scannedCount / totalStudents) * 100) : 0

  // Select sidebar based on role
  const SidebarComponent = () => <Sidebar isLeader={isLeader} />

  if (loading || contextLoading) {
    return <LoadingPage Sidebar={SidebarComponent} />
  }

  return (
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
        style={{
          flex: 1,
          paddingLeft: getLeftPadding(),
          paddingRight: isVerySmall ? "10px" : isMobile ? "16px" : isTablet ? "24px" : "32px",
          paddingTop: isVerySmall ? "12px" : isMobile ? "16px" : "28px",
          paddingBottom: isVerySmall ? "12px" : isMobile ? "110px" : isTablet ? "100px" : "28px",
          display: "flex",
          flexDirection: "column",
          gap: isVerySmall ? "12px" : isMobile ? "14px" : "20px",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          transition: "padding 0.3s ease",
          boxSizing: "border-box",
        }}
      >
        {/* header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: isVerySmall ? "flex-start" : "center",
          flexDirection: isVerySmall ? "column" : "row",
          flexWrap: "wrap",
          gap: isVerySmall ? "8px" : "12px",
          width: "100%",
        }}>
          <h1 style={{ 
            fontSize: isVerySmall ? "clamp(18px, 5vw, 22px)" : isMobile ? "clamp(20px, 5vw, 26px)" : "clamp(24px, 2.5vw, 30px)", 
            fontWeight: 800, 
            color: C.maroon, 
            margin: 0,
            wordBreak: "break-word",
          }}>
            Hello, {firstName}!
          </h1>
          <ProfilePill
            name={fullName}
            initials={initials}
            section={sectionName}
          />
        </div>

        <HoursCard
          rendered={hoursRendered}
          target={hoursTarget}
          isMobile={isMobile}
          deadline={dashboard?.termEndDate ?? null}
        />

        {/* Calendar and Documents */}
        {isTablet ? (
          <div style={{ 
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
          }}>
            {/* QuickAccess */}
            <div style={{ 
              width: "100%",
              minHeight: "auto",
              maxHeight: "none",
            }}>
              <QuickAccess
                isMobile={isMobile}
                studentName={fullName}
                sectionName={sectionName}
                adviserName={dashboard?.adviserName ?? null}
                classmateCount={dashboard?.classmateCount ?? 0}
                classmateInitials={dashboard?.classmateInitials ?? []}
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
            
            {/* Calendar and Documents */}
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              flex: 1,
              minHeight: "450px",
              maxHeight: "500px",
            }}>
              <div style={{ 
                minWidth: 0,
                display: "flex",       
                flexDirection: "column",
                height: "100%",
              }}>
                <CalendarOverview
                  documentEvents={formsToCalendarEvents(formViews)}
                  renderedDaysByMonth={dashboard?.renderedDaysByMonth ?? {}}
                  renderedTimeByMonth={dashboard?.renderedTimeByMonth ?? {}}
                />
              </div>
              <div style={{ 
                minWidth: 0,
                display: "flex",       
                flexDirection: "column",
                height: "100%",
              }}>
                <Documents Forms={formsToDocuments(formViews)} />
              </div>
            </div>
          </div>
        ) : (
          // Desktop and Mobile layout
          <div style={{ 
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "3.5fr 3.5fr 1.5fr",
            gap: isMobile ? "8px" : "20px",
            flex: 1,
            alignItems: "stretch",
          }}>
            <div style={{ 
              minWidth: 0,
              display: "flex",       
              flexDirection: "column",
              minHeight: isMobile ? "450px" : "500px",
              maxHeight: isMobile ? "500px" : "550px",
              order: isMobile ? 1 : 0,
            }}>
              <CalendarOverview
                documentEvents={formsToCalendarEvents(formViews)}
                renderedDaysByMonth={dashboard?.renderedDaysByMonth ?? {}}
                renderedTimeByMonth={dashboard?.renderedTimeByMonth ?? {}}
              />
            </div>
            <div style={{ 
              minWidth: 0,
              display: "flex",       
              flexDirection: "column",
              minHeight: isMobile ? "400px" : "500px",
              maxHeight: isMobile ? "500px" : "550px",
              order: isMobile ? 2 : 0,
            }}>
              <Documents Forms={formsToDocuments(formViews)} />
            </div>

            <div style={{ 
              minWidth: 0,
              display: "flex",       
              flexDirection: "column",
              minHeight: isMobile ? "350px" : "500px",
              maxHeight: isMobile ? "500px" : "550px",
              height: "100%",
              order: isMobile ? 0 : 0,
            }}>
              <QuickAccess
                isMobile={isMobile}
                studentName={fullName}
                sectionName={sectionName}
                adviserName={dashboard?.adviserName ?? null}
                classmateCount={dashboard?.classmateCount ?? 0}
                classmateInitials={dashboard?.classmateInitials ?? []}
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
        )}

        {/* Scanned Students (Leader Only) */}
        {isLeader && rosterStudents.length > 0 && (
          <div style={{ 
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}>
            <button
              onClick={() => setIsScannedExpanded(!isScannedExpanded)}
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
              <div style={{ 
                marginTop: isVerySmall ? "8px" : isMobile ? "10px" : "12px",
                animation: "slideDown 0.3s ease-out",
                width: "100%",
                maxWidth: "100%",
                overflow: "hidden",
              }}>
                <style>
                  {`
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
                  `}
                </style>
                <ScannedStudents variant="list" students={rosterStudents} />
              </div>
            )}
          </div>
        )}

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
  )
}