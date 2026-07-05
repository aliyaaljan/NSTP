"use client"

import CalendarOverview from "@/components/student/Calendar";
import Documents from "@/components/student/Documents";

import { useState, useEffect } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import type { StudentDashboardData } from "@/lib/student/dashboard-actions"
import { getMyForms } from "@/lib/forms/submission-actions"
import type { StudentFormView } from "@/lib/forms/submission-actions"
import { getInitials, formsToDocuments, formsToCalendarEvents } from "@/lib/student/dashboard-view"
import QuickAccess from "@/components/student/QuickAccess";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  maroon:      "#7B1113",
  maroonDark:  "#6B0D10",
  gold:        "#C8A84B",
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
}: {
  rendered: number
  target: number
  isMobile: boolean
}) {
  const percent = Math.min(100, Math.round((rendered / target) * 100)) 
  const deadline = "2026-07-14"
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(deadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  )

  return (
    <div style={{ 
      background: C.hoursBg, 
      borderRadius: 14, 
      padding: "18px 22px", 
      border: `1.5px solid ${C.hoursBorder}`,
      transition: "all 0.3s ease",
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
            color: C.maroon,
            lineHeight: 1,
          }}
        >
          {rendered}
        </span>

        <span>/ {target} hours</span>

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
          borderRadius: 7,  //hehe if 14 po kasi itll look round lang kaya 7 nalang, medj same naman na sa container i thikn
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
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [formViews, setFormViews] = useState<StudentFormView[]>([])

  useEffect(() => {
    const accepted = localStorage.getItem("privacyAccepted")
    setShowPrivacyModal(accepted !== "true")

    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)

  }, [])

  useEffect(() => {
    async function load() {
      const res = await getStudentDashboard()
      if (!res.ok) return
      setDashboard(res.data)
      if (res.data.enrollmentId) {
        const formsRes = await getMyForms(res.data.enrollmentId)
        if (formsRes.ok) setFormViews(formsRes.data)
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

  // Calculate left padding (edited to cater yung nasa baba na navbar on mobile)
  const getLeftPadding = () => {
    if (isMobile || isTablet) {
      return "20px"
    }
  
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`
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
      <Sidebar />

      <main
        style={{
          flex: 1,
          paddingLeft: getLeftPadding(),
          paddingRight: isMobile ? "20px" : isTablet ? "24px" : "32px",
          paddingTop: isMobile ? "20px" : "28px",
          paddingBottom: isMobile ? "110px" : isTablet ? "100px" : "28px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "14px" : "20px",
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        {/* header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <h1 style={{ 
            fontSize: isMobile ? "clamp(22px, 5vw, 30px)" : "clamp(24px, 2.5vw, 30px)", 
            fontWeight: 800, 
            color: C.maroon, 
            margin: 0 
          }}>
            Hello, {firstName}!
          </h1>
          <ProfilePill
            name={fullName}
            initials={initials}
            section={sectionName}
          />
        </div>

        <HoursCard rendered={hoursRendered} target={hoursTarget} isMobile={isMobile} />

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
              <QuickAccess isMobile={isMobile} />
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
                <Documents documents={formsToDocuments(formViews)} />
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
              <Documents documents={formsToDocuments(formViews)} />
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
              <QuickAccess isMobile={isMobile} />
            </div>
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
                  width: isMobile ? "95%" : 600,
                  maxWidth: "100%",
                  background: C.maroon,
                  borderRadius: 28,
                  padding: isMobile ? "16px" : "18px 22px 20px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "#fff",
                    fontSize: isMobile ? "16px" : "18px",
                    fontWeight: 800,
                    marginBottom: 16,
                  }}
                >
                  DATA PRIVACY AGREEMENT
                </div>

                <div
                  style={{
                    background: "#fff",
                    borderRadius: 26,
                    padding: isMobile ? "16px" : "20px",
                    minHeight: "auto",
                    maxHeight: "60vh",
                    overflowY: "auto",
                  }}
                >
                  <p style={{ 
                    fontSize: isMobile ? "14px" : "15px", 
                    lineHeight: isMobile ? 1.8 : 2, 
                    marginBottom: 20 
                  }}>
                    By continuing to use this system, you acknowledge and consent to the collection, processing, and storage of your personal information in accordance with the Data Privacy Act of 2012.
                  </p>

                  <p style={{ 
                    fontSize: isMobile ? "14px" : "15px", 
                    lineHeight: isMobile ? 1.6 : 1.7 
                  }}>
                    Your information will only be used for NSTP-related transactions and academic requirements.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 14,
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
                      padding: isMobile ? "8px 20px" : "6px 18px",
                      fontSize: isMobile ? "14px" : "15px",
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