"use client"

import { useState, useEffect } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import type { StudentDashboardData } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import { 
  IconCalendar,  
  IconUser, 
  IconClock,
  IconClockPause, 
  IconQrcode,
  IconBuilding,
} from "@tabler/icons-react"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  maroon: "#7B1113",
  maroonDark: "#6B0D10",
  gold: "#C8A84B",
  goldBg: "#FFF3CD",
  goldText: "#4A2C00",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
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

// Manual data for rendered services
const renderedServices = [
  { date: "June 20, 2026", qrGen: "08:01 AM", qrScan: "08:13 AM", site: "Baguio City Public Library", timeOut: "06:15 PM", hours: 10 },
  { date: "June 13, 2026", qrGen: "08:07 AM", qrScan: "08:34 AM", site: "Baguio City Public Library", timeOut: "06:45 PM", hours: 10 },
  { date: "June 11, 2026", qrGen: "1:47 PM", qrScan: "1:52 PM", site: "Baguio City Public Library", timeOut: "4:05 PM", hours: 2 },
  { date: "June 10, 2026", qrGen: "1:30 PM", qrScan: "1:31 PM", site: "Baguio City Public Library", timeOut: "3:45 PM", hours: 2 },
]

export default function ProfilePage() {
  const [isMobile, setIsMobile] = useState(false)
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
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
    }
    load()
  }, [])

  const fullName = dashboard?.fullName ?? "Mingyu Kim"
  const initials = getInitials(fullName)
  const sectionName = dashboard?.sectionName ?? "NSTP - H"
  const studentNumber = dashboard?.studentNumber ?? "2023-137713"

  // Student data 
  const student = {
    initials: initials,
    fullName: fullName,
    section: sectionName,
    studentNumber: studentNumber,
    email: "student.test@up.edu.ph",
    course: "BS Computer Science",
    year: 3,
    classType: "CWTS",
    location: "Baguio City Public Library",
    sectionLabel: "2526A",
    adviser: "Mr. Wonwoo Jeon",
  }

  const getLeftPadding = () => {
    if (isMobile) {
      return `${COLLAPSED_W + RAIL_MARGIN * 2 + 12}px`
    }
    return `${COLLAPSED_W + RAIL_MARGIN * 2}px`
  }

  const formatStudentNumber = (num: string) => {
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
          gap: isMobile ? "20px" : "24px",
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
          marginBottom: isMobile ? "20px" : "32px",
        }}>
          <div>
            <h1 style={{
              fontSize: isMobile ? "clamp(22px, 5vw, 30px)" : "clamp(24px, 2.5vw, 30px)",
              fontWeight: 800,
              color: C.maroon,
              margin: 0,
              letterSpacing: "-0.01em",
            }}>
              PROFILE
            </h1>
            <p style={{
              fontSize: isMobile ? "12px" : "13px",
              color: C.textGray,
              margin: "4px 0 0 0",
              fontWeight: 500,
            }}>
              View and manage your personal information
            </p>
          </div>
        </div>

        {/* Two rectangles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 3fr",
          gap: isMobile ? "20px" : "24px",
          flex: 1,
          alignItems: "start",
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
            paddingTop: isMobile ? 40 : 50,
            paddingLeft: isMobile ? 16 : 24,
            paddingRight: isMobile ? 16 : 24,
            paddingBottom: isMobile ? 20 : 28,
            position: "relative",
            transition: "all 0.2s ease",
            minHeight: isMobile ? "auto" : "520px",
            marginTop: isMobile ? 0 : 0,
          }}>
            {/* Profile circle w/ initials */}
            <div
              style={{
                position: "absolute",
                top: isMobile ? -32 : -40,
                left: "50%",
                transform: "translateX(-50%)",
                width: isMobile ? 64 : 80,
                height: isMobile ? 64 : 80,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.gold}, #D4B05C)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(123, 17, 19, 0.2)",
                border: `3px solid ${C.cardBg}`,
                zIndex: 2,
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? 24 : 30,
                  fontWeight: 800,
                  color: C.maroon,
                  letterSpacing: "0.02em",
                }}
              >
                {initials}
              </span>
            </div>

            {/* Name */}
            <h2
              style={{
                fontSize: isMobile ? "16px" : "20px",
                fontWeight: 700,
                color: C.maroon,
                margin: isMobile ? "4px 0 4px 0" : "8px 0 4px 0",
                textAlign: "center",
              }}
            >
              {student.fullName}
            </h2>
            
            {/* Section badge */}
            <div style={{
              display: "inline-block",
              background: C.hoursBg,
              padding: isMobile ? "3px 12px" : "4px 14px",
              borderRadius: 20,
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: 600,
              color: C.textSub,
              marginBottom: isMobile ? 14 : 18,
            }}>
              {student.section}
            </div>

            {/* Student Information */}
            <div style={{
              width: "100%",
              borderTop: `1px solid ${C.border}`,
              paddingTop: isMobile ? 14 : 16,
              marginBottom: isMobile ? 14 : 16,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}>
                <IconUser size={isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                <h3
                  style={{
                    fontSize: isMobile ? "10px" : "11px",
                    fontWeight: 700,
                    color: C.textDark,
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Student Information
                </h3>
              </div>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: isMobile ? "2px 8px" : "4px 12px",
                fontSize: isMobile ? "12px" : "13px",
                color: C.textSub,
                lineHeight: isMobile ? 1.6 : 1.8,
              }}>
                <span style={{ fontWeight: 600, color: C.textDark }}>No.</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>
                  {formatStudentNumber(student.studentNumber)}
                </span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Email</span>
                <span style={{ fontSize: isMobile ? "11px" : "12px", wordBreak: "break-all" }}>
                  {student.email}
                </span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Course</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>{student.course}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Year</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>{student.year}</span>
              </div>
            </div>

            {/* Class Information */}
            <div style={{
              width: "100%",
              borderTop: `1px solid ${C.border}`,
              paddingTop: isMobile ? 14 : 16,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}>
                <IconBuilding size={isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                <h3
                  style={{
                    fontSize: isMobile ? "10px" : "11px",
                    fontWeight: 700,
                    color: C.textDark,
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Class Information
                </h3>
              </div>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: isMobile ? "2px 8px" : "4px 12px",
                fontSize: isMobile ? "12px" : "13px",
                color: C.textSub,
                lineHeight: isMobile ? 1.6 : 1.8,
              }}>
                <span style={{ fontWeight: 600, color: C.textDark }}>Type</span>
                <span>
                  <span style={{
                    display: "inline-block",
                    background: C.goldBg,
                    color: C.goldText,
                    padding: "0px 8px",
                    borderRadius: 4,
                    fontSize: isMobile ? "10px" : "12px",
                    fontWeight: 600,
                  }}>
                    {student.classType}
                  </span>
                </span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Location</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>{student.location}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Section</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>{student.sectionLabel}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark }}>Adviser</span>
                <span style={{ fontSize: isMobile ? "11px" : "13px" }}>{student.adviser}</span>
              </div>
            </div>
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
            minHeight: isMobile ? "400px" : "520px",
          }}>
            <div
              style={{
                padding: isMobile ? "12px 16px" : "16px 24px",
                background: C.green,
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IconClock size={isMobile ? 16 : 18} color={C.pageBg} strokeWidth={2} />
                <span
                  style={{
                    fontSize: isMobile ? "12px" : "14px",
                    fontWeight: 700,
                    color: C.pageBg,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Rendered Services
                </span>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: isMobile ? "10px" : "12px",
                color: C.pageBg,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                  {renderedServices.length} total entries
                </span>
              </div>
            </div>

            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "0 4px 4px 4px",
            }}>
              {/* Mobile view */}
              {isMobile ? (
                <div style={{ padding: "8px" }}>
                  {renderedServices.map((row, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#FAFAFA",
                        borderRadius: 8,
                        padding: "12px",
                        marginBottom: "8px",
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, color: C.textDark, fontSize: "14px" }}>
                            {formatDate(row.date)}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 700,
                          color: C.maroon,
                          fontSize: "14px",
                        }}>
                          {row.hours} hrs
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 12px",
                        fontSize: "11px",
                        color: C.textSub,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark }}>QR Generated:</span>
                          <span style={{ marginLeft: 4 }}>{row.qrGen}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark }}>QR Scanned:</span>
                          <span style={{ marginLeft: 4 }}>{row.qrScan}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark }}>Time Out:</span>
                          <span style={{ marginLeft: 4 }}>{row.timeOut}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark }}>Site:</span>
                          <span style={{
                            display: "inline-block",
                            background: C.goldBg,
                            color: C.goldText,
                            padding: "2px 10px",
                            borderRadius: 4,
                            fontSize: "10px",
                            fontWeight: 600,
                            marginLeft: 4,
                            textAlign: "center",
                          }}>
                            {row.site}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop view */
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: `1px solid ${C.border}`,
                      color: C.textDark,
                      background: "#FAFAFA",
                    }}>
                      <th style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: C.textGray,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <IconCalendar size={14} />
                          Date
                        </div>
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: C.textGray,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <IconQrcode size={14} />
                          QR Generated
                        </div>
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: C.textGray,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <IconQrcode size={14} />
                          QR Scanned
                        </div>
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: C.textGray,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <IconClockPause size={14} />
                          Time Out
                        </div>
                      </th>
                      <th style={{
                        textAlign: "center",
                        padding: "12px 16px",
                        fontWeight: 700,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: C.textGray,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <IconClock size={14} />
                        Hours
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderedServices.map((row, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: index < renderedServices.length - 1 ? `1px solid ${C.border}` : "none",
                          transition: "background 0.15s ease",
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
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: C.textDark,
                          textAlign: "center",
                        }}>
                          {formatDate(row.date)}
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          color: C.textSub,
                          textAlign: "center",
                        }}>
                          <div style={{ fontWeight: 500 }}>{row.qrGen}</div>
                          <div style={{
                            display: "inline-block",
                            fontSize: "9px",
                            fontWeight: 600,
                            padding: "2px 12px",
                            borderRadius: 4,
                            background: C.goldBg,
                            color: C.goldText,
                            marginTop: 4,
                            maxWidth: "180px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {row.site}
                          </div>
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          color: C.textSub,
                          textAlign: "center",
                        }}>
                          <div style={{ fontWeight: 500 }}>{row.qrScan}</div>
                          <div style={{
                            display: "inline-block",
                            fontSize: "9px",
                            fontWeight: 600,
                            padding: "2px 12px",
                            borderRadius: 4,
                            background: C.goldBg,
                            color: C.goldText,
                            marginTop: 4,
                            maxWidth: "180px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {row.site}
                          </div>
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          color: C.textSub,
                          fontWeight: 500,
                          textAlign: "center",
                        }}>
                          {row.timeOut}
                        </td>
                        <td style={{
                          padding: "12px 16px",
                          fontWeight: 700,
                          color: C.maroon,
                          textAlign: "center",
                          fontSize: "14px",
                        }}>
                          {row.hours}
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 400,
                            color: C.textGray,
                            marginLeft: 2,
                          }}>
                            hrs
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}