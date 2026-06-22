"use client"

import CalendarOverview from "@/components/student/Calendar";
import Documents from "@/components/student/Documents";
import ScannedStudents from "@/components/student/ScannedStudents";

import { useState, useEffect } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"

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
  pageBg:      "#F0EFE8",
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

interface StudentDashboardProps {
  studentFirstName: string
  studentLastName: string
  studentInitials: string
  section: string
  hoursRendered: number
  hoursTarget: number
}

// HOURS FUNCTION --------------- 

function HoursCard({ rendered, target }: { rendered: number; target: number }) {
  const percent = Math.min(100, Math.round((rendered / target) * 100)) 
  return (
    <div style={{ 
      background: C.hoursBg, 
      borderRadius: 14, 
      padding: "18px 22px", 
      border: `1.5px solid ${C.hoursBorder}`,
      transition: "all 0.3s ease",
    }}>
      <div style={{ 
        fontSize: "clamp(13px, 1.2vw, 15px)", 
        fontWeight: 700, 
        color: C.textDark, 
        marginBottom: 8, 
        textTransform: "uppercase", 
        letterSpacing: "0.03em",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
      }}>
        Hours Accomplished:&nbsp;
        <span style={{ fontWeight: 800 }}>{rendered} / {target} hours</span>
      </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 12,
        flexWrap: "wrap",
      }}>
        <span style={{ 
          fontSize: "clamp(13px, 1.1vw, 14px)", 
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
          borderRadius: 4, 
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

export default function StudentDashboardPage({
  studentFirstName = "Mingyu",
  studentLastName = "Kim",
  studentInitials = "MK",
  section = "H",
  hoursRendered = 395,
  hoursTarget = 500,

}: Partial<StudentDashboardProps>) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isScannedExpanded, setIsScannedExpanded] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("privacyAccepted")
    setShowPrivacyModal(accepted !== "true")

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate left padding
  const getLeftPadding = () => {
    if (isMobile) {
      return `${COLLAPSED_W + RAIL_MARGIN * 2 + 12}px`
    }
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`
  }

  // Sample data for Scanned Students
  const scannedCount = 5
  const totalStudents = 8
  const percentage = Math.round((scannedCount / totalStudents) * 100)

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
          paddingRight: isMobile ? "20px" : "32px",
          paddingTop: isMobile ? "20px" : "28px",
          paddingBottom: isMobile ? "20px" : "28px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "20px" : "20px",
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
            Hello, {studentFirstName}!
          </h1>
          <ProfilePill 
            name={`${studentLastName}, ${studentFirstName}`} 
            initials={studentInitials} 
            section={section} 
          />
        </div>

        <HoursCard rendered={hoursRendered} target={hoursTarget} />

        {/* Calendar and Documents (top row) */}
        <div style={{ 
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
          gap: isMobile ? "20px" : "20px",
          flex: 1,
          alignItems: "stretch",
        }}>
          <div style={{ 
            minWidth: 0,
            display: "flex",       
            flexDirection: "column",
            minHeight: isMobile ? "450px" : "500px",
            maxHeight: isMobile ? "500px" : "550px",
          }}>
            <CalendarOverview />
          </div>
          <div style={{ 
            minWidth: 0,
            display: "flex",       
            flexDirection: "column",
            gap: "16px", 
            minHeight: isMobile ? "400px" : "500px",
            maxHeight: isMobile ? "500px" : "550px",
          }}>
            <Documents />
          </div>
        </div>

        {/* Scanned Students - Collapsible Section */}
        <div style={{ 
          width: "100%",
        }}>
          {/* Summary Card - Always Visible */}
          <button
            onClick={() => setIsScannedExpanded(!isScannedExpanded)}
            style={{
              width: "100%",
              textAlign: "left",
              background: C.cardBg,
              borderRadius: "14px",
              border: `1px solid ${C.border}`,
              boxShadow: C.cardShadow,
              padding: "18px 22px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
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
                  width="20" 
                  height="20" 
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
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: "clamp(15px, 1.2vw, 17px)", 
                  fontWeight: 700, 
                  color: C.textDark 
                }}>
                  Scanned Students
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px",
                  marginTop: "2px",
                  flexWrap: "wrap",
                }}>
                  <span style={{ 
                    fontSize: "clamp(13px, 1vw, 14px)", 
                    fontWeight: 500, 
                    color: C.maroon 
                  }}>
                    {scannedCount} / {totalStudents} students scanned
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ 
                width: "120px", 
                height: "6px", 
                borderRadius: "4px", 
                background: C.track, 
                overflow: "hidden",
                flexShrink: 0,
                display: isMobile ? "none" : "block",
              }}>
                <div style={{ 
                  width: `${percentage}%`, 
                  height: "100%", 
                  background: C.gold, 
                  borderRadius: "4px",
                  transition: "width 0.3s ease",
                }} />
              </div>
              <span style={{ 
                    fontSize: "12px", 
                    color: C.textGray,
                    background: C.hoursBg,
                    padding: "2px 10px",
                    borderRadius: "12px",
                  }}>
                    {percentage}%
                  </span>
            </div>

            {/* Expand/Collapse icon */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px",
              color: C.textGray,
              flexShrink: 0,
              marginLeft: "12px",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>
                {isScannedExpanded ? "Hide" : "View All"}
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ 
                  transition: "transform 0.3s ease",
                  transform: isScannedExpanded ? "rotate(180deg)" : "rotate(0deg)"
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {/* Expanded List - Only visible when expanded */}
          {isScannedExpanded && (
            <div style={{ 
              marginTop: "12px",
              animation: "slideDown 0.3s ease-out",
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
              <ScannedStudents variant="list" />
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
