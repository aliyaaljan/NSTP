"use client"

import { useState, useEffect, useMemo } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import type { StudentDashboardData } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import { 
  IconUser, 
  IconBook,
  IconChevronUp,
  IconChevronDown,
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

// Manual data for rendered services
const renderedServices = [
  { date: "July 20, 2026", qrGen: "08:01 AM", qrScan: "08:13 AM", site: "Baguio City Public Library", timeOut: "06:15 PM", hours: 10 },
  { date: "July 19, 2026", qrGen: "09:30 AM", qrScan: "09:45 AM", site: "Burnham Park", timeOut: "05:30 PM", hours: 8 },
  { date: "July 18, 2026", qrGen: "10:15 AM", qrScan: "10:28 AM", site: "Baguio City Hall", timeOut: "04:00 PM", hours: 6 },
  { date: "July 17, 2026", qrGen: "07:45 AM", qrScan: "08:00 AM", site: "Baguio City Public Library", timeOut: "06:30 PM", hours: 11 },
  { date: "July 16, 2026", qrGen: "08:30 AM", qrScan: "08:42 AM", site: "Burnham Park", timeOut: "05:00 PM", hours: 8 },
  { date: "July 15, 2026", qrGen: "09:00 AM", qrScan: "09:15 AM", site: "Baguio City Hall", timeOut: "04:30 PM", hours: 7 },
  { date: "July 14, 2026", qrGen: "08:20 AM", qrScan: "08:35 AM", site: "Baguio City Public Library", timeOut: "06:00 PM", hours: 10 },
  { date: "July 13, 2026", qrGen: "01:30 PM", qrScan: "01:45 PM", site: "Burnham Park", timeOut: "05:30 PM", hours: 4 },
  { date: "July 12, 2026", qrGen: "10:00 AM", qrScan: "10:12 AM", site: "Baguio City Hall", timeOut: "03:45 PM", hours: 6 },
  { date: "July 11, 2026", qrGen: "07:50 AM", qrScan: "08:05 AM", site: "Baguio City Public Library", timeOut: "06:20 PM", hours: 10 },
  { date: "July 10, 2026", qrGen: "08:40 AM", qrScan: "08:55 AM", site: "Burnham Park", timeOut: "05:15 PM", hours: 8 },
  { date: "July 9, 2026", qrGen: "08:01 AM", qrScan: "08:13 AM", site: "Baguio City Public Library", timeOut: "06:15 PM", hours: 10 },
  { date: "July 8, 2026", qrGen: "08:07 AM", qrScan: "08:34 AM", site: "Baguio City Public Library", timeOut: "06:45 PM", hours: 10 },
  { date: "July 7, 2026", qrGen: "01:47 PM", qrScan: "01:52 PM", site: "Baguio City Public Library", timeOut: "04:05 PM", hours: 2 },
  { date: "July 6, 2026", qrGen: "01:30 PM", qrScan: "01:31 PM", site: "Baguio City Public Library", timeOut: "03:45 PM", hours: 2 },
]

export default function ProfilePage() {
  const [isMobile, setIsMobile] = useState(false)
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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
            opacity: isAsc ? 1 : 0.5,
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
            opacity: isDesc ? 1 : 0.5,
            color: isDesc ? "#7B1D1D" : "#4A4A4A",
            marginTop: -2
          }}
        />
      </span>
    )
  }

  // Sort then paginate
  const sortedData = useMemo(() => {
    // Default: descending (most recent fist)
    if (!sortField || !sortDirection) {
      return [...renderedServices].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    }

    return [...renderedServices].sort((a, b) => {
      let comparison = 0
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [sortField, sortDirection])

  // Pagination
  const totalEntries = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalEntries)
  const currentEntries = sortedData.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value))
    setCurrentPage(1)
  }

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', 'Fallback Montserrat'",
        background: C.pageBg,
        minHeight: "100vh",
        display: "flex",
        fontSize: "13px",
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
              fontSize: "34px",
              fontWeight: 800,
              color: C.maroon,
              margin: 0,
              letterSpacing: "-0.01em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}>
              Profile
            </h1>
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
            height: isMobile ? "auto" : "520px",
            flexShrink: 0,
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
                    fontSize: "11px",
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
                gridTemplateColumns: "auto 1fr",
                gap: isMobile ? "2px 8px" : "4px 12px",
                fontSize: "13px",
                color: C.textSub,
                lineHeight: isMobile ? 1.6 : 1.8,
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>No.</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                  {formatStudentNumber(student.studentNumber)}
                </span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Email</span>
                <span style={{ fontSize: "13px", wordBreak: "break-all", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.email}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Course</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.course}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Year</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.year}</span>
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
                <IconBook size={isMobile ? 14 : 16} color={C.maroon} strokeWidth={2} />
                <h3
                  style={{
                    fontSize: "11px",
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
                gridTemplateColumns: "auto 1fr",
                gap: isMobile ? "2px 8px" : "4px 12px",
                fontSize: "13px",
                color: C.textSub,
                lineHeight: isMobile ? 1.6 : 1.8,
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Type</span>
                <span>
                  <span style={{
                    display: "inline-block",
                    background: C.goldBg,
                    color: C.goldText,
                    padding: "0px 8px",
                    borderRadius: 4,
                    fontSize: isMobile ? "10px" : "12px",
                    fontWeight: 600,
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  }}>
                    {student.classType}
                  </span>
                </span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Location</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.location}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Section</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.sectionLabel}</span>
                
                <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Adviser</span>
                <span style={{ fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{student.adviser}</span>
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
            height: isMobile ? "auto" : "520px",
            minHeight: isMobile ? "400px" : "520px",
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
          }}>
            {/* Header */}
            <div
              style={{
                padding: isMobile ? "12px 16px" : "16px 20px",
                borderBottom: `1px solid #E5E7EB`,
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#111827",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  Rendered Services
                </div>
                <div style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginTop: 2,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  {totalEntries} entries
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{
              flex: 1,
              overflow: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "#CFCFCB transparent",
              minHeight: 0,
            }}>
              {isMobile ? (
                <div style={{ padding: "8px" }}>
                  {currentEntries.map((row, index) => (
                    <div
                      key={index}
                      style={{
                        background: "#FAFAFA",
                        borderRadius: 8,
                        padding: "12px",
                        marginBottom: "8px",
                        border: `1px solid ${C.border}`,
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}>
                        <div>
                          <span style={{ fontWeight: 700, color: C.textDark, fontSize: "13px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>
                            {formatDate(row.date)}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: 700,
                          color: C.maroon,
                          fontSize: "14px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.hours} hrs
                        </span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 12px",
                        fontSize: "13px",
                        color: C.textSub,
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>QR Generated:</span>
                          <span style={{ marginLeft: 4, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.qrGen}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>QR Scanned:</span>
                          <span style={{ marginLeft: 4, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.qrScan}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Time Out:</span>
                          <span style={{ marginLeft: 4, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>{row.timeOut}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: C.textDark, fontSize: "11px", fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Site:</span>
                          <span style={{
                            display: "inline-block",
                            color: C.textDark,
                            fontSize: "12px",
                            fontWeight: 500,
                            marginLeft: 4,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
                  fontSize: "13px",
                  tableLayout: "fixed",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  <thead>
                    <tr style={{
                      borderBottom: `1px solid #E5E7EB`,
                      background: "#F9FAFB",
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                    }}>
                      <th 
                        style={{
                          textAlign: "left",
                          padding: "10px 20px",
                          fontWeight: 700,
                          fontSize: "11px",
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
                        padding: "10px 20px",
                        fontWeight: 700,
                        fontSize: "11px",
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
                        padding: "10px 20px",
                        fontWeight: 700,
                        fontSize: "11px",
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
                        padding: "10px 20px",
                        fontWeight: 700,
                        fontSize: "11px",
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
                        padding: "10px 20px",
                        fontWeight: 700,
                        fontSize: "11px",
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
                    {currentEntries.map((row, index) => (
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
                          padding: "14px 20px",
                          fontWeight: 600,
                          color: "#111827",
                          fontSize: "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {formatDate(row.date)}
                        </td>
                        <td style={{
                          padding: "14px 20px",
                          color: "#6B7280",
                          textAlign: "center",
                          fontSize: "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <div>
                              <span style={{ fontWeight: 500, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Generated: {row.qrGen}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 500, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>Scanned: {row.qrScan}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{
                          padding: "14px 20px",
                          color: "#6B7280",
                          fontWeight: 500,
                          textAlign: "center",
                          fontSize: "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.timeOut}
                        </td>
                        <td style={{
                          padding: "14px 20px",
                          fontWeight: 700,
                          color: "#7B1D1D",
                          textAlign: "center",
                          fontSize: "13px",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        }}>
                          {row.hours}
                          <span style={{
                            fontSize: "11px",
                            fontWeight: 400,
                            color: "#6B7280",
                            marginLeft: 2,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          }}>
                            hrs
                          </span>
                        </td>
                        <td style={{
                          padding: "14px 20px",
                          textAlign: "center",
                          fontSize: "13px",
                          color: "#6B7280",
                          fontFamily: "'Montserrat', 'Fallback Montserrat'",
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
              padding: "14px 20px",
              borderTop: `1px solid #E5E7EB`,
              flexWrap: "wrap",
              gap: "12px",
              flexShrink: 0,
              background: "#FFFFFF",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}>
              <div style={{
                fontSize: "12px",
                color: "#6B7280",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                Showing {totalEntries === 0 ? 0 : startIndex + 1}–
                {endIndex} of {totalEntries} entries
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <button
                  style={{
                    minWidth: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    fontWeight: 500,
                    color: "#111827",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s, border-color 0.12s",
                    opacity: currentPage === 1 ? 0.35 : 1,
                  }}
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  &#8249;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      border: p === currentPage ? "1px solid #7B1D1D" : "1px solid #E5E7EB",
                      background: p === currentPage ? "#7B1D1D" : "#FFFFFF",
                      fontSize: "12px",
                      fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      fontWeight: p === currentPage ? 700 : 500,
                      color: p === currentPage ? "#FFFFFF" : "#111827",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.12s, border-color 0.12s",
                    }}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span style={{ color: "#6B7280", fontSize: 12, fontFamily: "'Montserrat', 'Fallback Montserrat'" }}>...</span>
                    <button
                      style={{
                        minWidth: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "1px solid #E5E7EB",
                        background: "#FFFFFF",
                        fontSize: "12px",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                        fontWeight: 500,
                        color: "#111827",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.12s, border-color 0.12s",
                      }}
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  style={{
                    minWidth: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "1px solid #E5E7EB",
                    background: "#FFFFFF",
                    fontSize: "12px",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    fontWeight: 500,
                    color: "#111827",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s, border-color 0.12s",
                    opacity: currentPage === totalPages ? 0.35 : 1,
                  }}
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  &#8250;
                </button>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#6B7280",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}>
                <span>Rows per page:</span>
                <select
                  style={{
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                    color: "#111827",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    outline: "none",
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