'use client'

import { useState, useEffect } from 'react'
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { IconPlayerPlay, IconPlayerStop, IconCalendar, IconClock } from "@tabler/icons-react"

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
  maroonBg: "#FDE8E8",
  gold: "#C8A84B",
  pageBg: "#F8F6F3",
  cardBg: "#FFFFFF",
  cardShadow: "0 4px 20px rgba(0,0,0,0.06)",
  cardShadowHover: "0 8px 32px rgba(0,0,0,0.12)",
  border: "#EDE9E6",
  textDark: "#1A1A1A",
  textGray: "#8A8580",
  textMuted: "#B8B3AE",
  textLight: "#6B6B6B",
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
  const [currentTime, setCurrentTime] = useState(new Date())

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 8}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleToggle = () => {
    setIsActive(!isActive)
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
            <p style={{
              fontSize: isMobile ? "13px" : "15px",
              color: C.textGray,
              margin: "4px 0 0 0",
              fontWeight: 500,
            }}>
              Manage your attendance session
            </p>
          </div>
          
          <div style={{ flexShrink: 0 }}>
            <ProfilePill name="Kim, Mingyu" initials="MK" section="H" />
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

        {/* Main Button */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: C.cardBg,
          borderRadius: "20px",
          border: `2px solid ${C.border}`,
          boxShadow: C.cardShadow,
          padding: isMobile ? "30px 20px" : "40px 40px",
          minHeight: isMobile ? "300px" : "400px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle background decoration */}
          <div style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: isActive ? `radial-gradient(circle, ${C.greenBg} 0%, transparent 70%)` : `radial-gradient(circle, ${C.maroonBg} 0%, transparent 70%)`,
            opacity: 0.5,
            pointerEvents: "none",
            transition: "all 0.5s ease",
          }} />
          <div style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: isActive ? `radial-gradient(circle, ${C.greenBg} 0%, transparent 70%)` : `radial-gradient(circle, ${C.maroonBg} 0%, transparent 70%)`,
            opacity: 0.3,
            pointerEvents: "none",
            transition: "all 0.5s ease",
          }} />

          <div style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: isMobile ? "20px" : "28px",
            width: "100%",
          }}>
            <div style={{
              fontSize: isMobile ? "14px" : "17px",
              fontWeight: 500,
              color: C.textGray,
              textAlign: "center",
              letterSpacing: "0.3px",
            }}>
              {isActive ? 'Tap to end the session' : 'Tap to begin the session'}
            </div>
            
            <button
              onClick={handleToggle}
              style={{
                width: isMobile ? "160px" : "220px",
                height: isMobile ? "160px" : "220px",
                borderRadius: "50%",
                border: "none",
                background: isActive 
                  ? `linear-gradient(135deg, ${C.maroon} 0%, ${C.maroonLight} 100%)`
                  : `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`,
                color: "#fff",
                cursor: "pointer",
                boxShadow: isActive
                  ? "0 8px 40px rgba(123, 17, 19, 0.35)"
                  : "0 8px 40px rgba(20, 73, 46, 0.35)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)"
                e.currentTarget.style.boxShadow = isActive
                  ? "0 12px 48px rgba(123, 17, 19, 0.45)"
                  : "0 12px 48px rgba(20, 73, 46, 0.45)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.boxShadow = isActive
                  ? "0 8px 40px rgba(123, 17, 19, 0.35)"
                  : "0 8px 40px rgba(20, 73, 46, 0.35)"
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.94)"
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1.04)"
              }}
            >
              {isActive ? (
                <>
                  <IconPlayerStop size={isMobile ? 40 : 56} stroke={2} />
                  <span style={{
                    fontSize: isMobile ? "18px" : "24px",
                    fontWeight: 700,
                    marginTop: "4px",
                    letterSpacing: "0.5px",
                  }}>
                    End
                  </span>
                </>
              ) : (
                <>
                  <IconPlayerPlay size={isMobile ? 40 : 56} stroke={2} style={{ marginLeft: "4px" }} />
                  <span style={{
                    fontSize: isMobile ? "18px" : "24px",
                    fontWeight: 700,
                    marginTop: "4px",
                    letterSpacing: "0.5px",
                  }}>
                    Start
                  </span>
                </>
              )}
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: isMobile ? "8px 20px" : "10px 28px",
              borderRadius: "999px",
              border: `2px solid ${isActive ? C.green : C.maroon}`,
              background: isActive ? C.greenBg : C.maroonBg,
              transition: "all 0.3s ease",
            }}>
              <span style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: isActive ? C.green : C.maroon,
                animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
              }} />
              <span style={{
                fontSize: isMobile ? "13px" : "15px",
                fontWeight: 600,
                color: isActive ? C.green : C.maroon,
              }}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { 
              opacity: 1; 
              transform: scale(1); 
            }
            50% { 
              opacity: 0.4; 
              transform: scale(0.7); 
            }
          }
        `}</style>
      </main>
    </div>
  )
}