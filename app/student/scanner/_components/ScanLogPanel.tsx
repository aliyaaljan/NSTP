"use client"

import {
  IconUser,
  IconCalendar,
  IconClock,
  IconCheck,
  IconQrcode,
  IconX,
  IconLogout,
  IconHourglass,
} from "@tabler/icons-react"
import type { ScanRecord, ScanStatus } from "@/lib/student/leader/scan-history"
import { formatDate, groupByDate } from "@/lib/student/leader/scan-history"
import { useState, useEffect } from "react"

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
  textDark: "#111827",
  textGray: "#6B7280",
  textMuted: "#9CA3AF",
  textSub: "#5A5A58",
  iconBg: "#F8DCDD",
}

const STATUS_STYLES: Record<
  ScanStatus,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  "On Time": {
    color: '#14492E',
    bg: '#E8EDE5',
    icon: <IconCheck size={12} stroke={2.5} />,
  },
  Late: {
    color: '#4A2C00',
    bg: '#FFF3CD',
    icon: <IconClock size={12} stroke={2.5} />,
  },
  "Not Scanned": {
    color: '#6B7280',
    bg: '#F3F4F6',
    icon: <IconX size={12} stroke={2.5} />,
  },
}

function ScanRow({
  isMobile,
  scan,
  isLast,
  showDateHeader,
  dateHeader,
}: {
  isMobile: boolean
  scan: ScanRecord
  isLast: boolean
  showDateHeader?: boolean
  dateHeader?: string
}) {
  const { color, bg, icon } = STATUS_STYLES[scan.status]
  const initials = scan.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  const formatHours = (hours?: number) => {
    if (hours === undefined || hours === null || hours === 0) return "—"
    return hours.toFixed(1)
  }

  if (isMobile) {
    return (
      <>
        {showDateHeader && dateHeader && (
          <div
            key={`date-header-${dateHeader}`}
            style={{
              padding: "3px 12px",
              background: "#F9FAFB",
              borderBottom: `1px solid ${C.border}`,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconCalendar
              size={8}
              stroke={1.5}
              style={{ color: C.textGray }}
            />
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: C.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              {dateHeader}
            </span>
          </div>
        )}

        <div
          key={scan.id || `${scan.name}-${scan.date}`}
          style={{
            padding: "12px 16px",
            borderBottom: isLast ? "none" : `1px solid ${C.border}`,
            background: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Top row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: C.maroon,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}
              >
                {initials}
              </div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: C.textDark,
                  margin: 0,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {scan.name}
              </p>
            </div>

            {/* Status Badge */}
            <span
              style={{
                fontSize: "8px",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "20px",
                background: bg,
                color: color,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                flexShrink: 0,
              }}
            >
              {scan.status}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              paddingTop: "6px",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            {/* Generated */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                background: "#F9FAFB",
                padding: "6px 8px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  color: C.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <IconQrcode size={10} stroke={1.5} />
                Generated
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 500,
                  color: C.textDark,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}
              >
                {scan.generatedTime}
              </span>
            </div>

            {/* Scanned */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                background: "#F9FAFB",
                padding: "6px 8px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  color: C.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <IconQrcode size={10} stroke={1.5} />
                Scanned
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 500,
                  color: C.textDark,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}
              >
                {scan.scannedTime}
              </span>
            </div>

            {/* Time Out */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                background: "#F9FAFB",
                padding: "6px 8px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  color: C.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <IconClock size={10} stroke={1.5} />
                Time Out
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 500,
                  color: C.textDark,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}
              >
                {scan.timeOut || "—"}
              </span>
            </div>

            {/* Hours */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                background: "#F9FAFB",
                padding: "6px 8px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 600,
                  color: C.textGray,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <IconHourglass size={10} stroke={1.5} />
                Hours
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: C.green,
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}
              >
                {formatHours(scan.hours)}
              </span>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop view
  return (
    <>
      {showDateHeader && dateHeader && (
        <div
          key={`date-header-${dateHeader}`}
          style={{
            padding: "8px 24px",
            background: "#F9FAFB",
            borderBottom: `1px solid ${C.border}`,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <IconCalendar
            size={14}
            stroke={1.5}
            style={{ color: C.textGray }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.textGray,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            {dateHeader}
          </span>
        </div>
      )}

      <div
        key={scan.id || `${scan.name}-${scan.date}`}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr 0.8fr 0.5fr 0.5fr",
          alignItems: "center",
          padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
          borderBottom: isLast ? "none" : `1px solid ${C.border}`,
          gap: "16px",
          transition: "background 0.15s ease",
          background: "#FFFFFF",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F9FAFB"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FFFFFF"
        }}
      >
        {/* Student Column */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: C.maroon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              flexShrink: 0,
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            {initials}
          </div>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: C.textDark,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              margin: 0,
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            {scan.name}
          </p>
        </div>

        {/* QR Code Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: C.textGray,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              fontWeight: 400,
            }}
          >
            <IconQrcode size={12} stroke={1.5} />
            <span style={{ fontWeight: 400, color: C.textGray }}>
              Generated:
            </span>
            <span
              style={{
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                fontWeight: 400,
                color: C.textDark,
              }}
            >
              {scan.generatedTime}
            </span>
          </span>
          <span
            style={{
              fontSize: "11px",
              color: C.textGray,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              fontWeight: 400,
            }}
          >
            <IconQrcode size={12} stroke={1.5} />
            <span style={{ fontWeight: 400, color: C.textGray }}>
              Scanned:
            </span>
            <span
              style={{
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                fontWeight: 400,
                color: C.textDark,
              }}
            >
              {scan.scannedTime}
            </span>
          </span>
        </div>

        {/* Status Column */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 14px",
              borderRadius: "20px",
              background: bg,
              color: color,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            {icon}
            {scan.status}
          </span>
        </div>

        {/* Time Out Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: C.textGray,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              fontWeight: 400,
            }}
          >
            <span
              style={{
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                fontWeight: 400,
                color: C.textDark,
              }}
            >
              {scan.timeOut || "—"}
            </span>
          </span>
        </div>

        {/* Hours Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            minWidth: 0,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: C.textDark,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              fontWeight: 400,
            }}
          >
            {formatHours(scan.hours)}
          </span>
        </div>
      </div>
    </>
  )
}

export function ScanLogPanel({
  isMobile: propIsMobile,
  scans,
  groupedByMonth,
  groupedByDate: groupedByDateProp,
  selectedWeek,
  notScannedNames,
}: {
  isMobile: boolean
  scans: ScanRecord[]
  groupedByMonth: Record<string, ScanRecord[]> | null
  groupedByDate: Record<string, ScanRecord[]> | null
  selectedWeek: string
  notScannedNames: string[]
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [isMobile, setIsMobile] = useState(propIsMobile)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const totalScans = scans.length
  const isAllView = selectedWeek === "all"
  const hasScans = totalScans > 0

  const monthKeys = groupedByMonth ? Object.keys(groupedByMonth) : []
  const dateKeys = groupedByDateProp
    ? Object.keys(groupedByDateProp).sort((a, b) => b.localeCompare(a))
    : []

  const allRows: { scan: ScanRecord; dateHeader?: string; showDateHeader: boolean; key: string }[] = []

  if (hasScans) {
    if (isAllView) {
      monthKeys
        .sort((a, b) => {
          const dateA = new Date(a)
          const dateB = new Date(b)
          return dateB.getTime() - dateA.getTime()
        })
        .forEach((monthKey) => {
          const scansForMonth = groupedByMonth?.[monthKey] || []
          const scansGroupedByDate = groupByDate(scansForMonth)
          const dateKeysForMonth = Object.keys(scansGroupedByDate).sort(
            (a, b) => b.localeCompare(a)
          )

          dateKeysForMonth.forEach((date) => {
            const scansForDate = scansGroupedByDate[date] || []
            scansForDate.forEach((scan, i) => {
              allRows.push({
                scan,
                dateHeader: formatDate(scan.date),
                showDateHeader: i === 0,
                key: scan.id || `${scan.name}-${scan.date}-${i}`,
              })
            })
          })
        })
    } else {
      dateKeys.forEach((date) => {
        const scansForDate = groupedByDateProp?.[date] || []
        scansForDate.forEach((scan, i) => {
          allRows.push({
            scan,
            dateHeader: formatDate(scan.date),
            showDateHeader: i === 0,
            key: scan.id || `${scan.name}-${scan.date}-${i}`,
          })
        })
      })
    }
  }

  const notScannedRows = notScannedNames.map((name, index) => ({
    scan: {
      id: `missing-${name}`,
      name: name,
      date: "—",
      generatedTime: "—",
      scannedTime: "—",
      timeOut: "—",
      hours: 0,
      status: "Not Scanned" as ScanStatus,
    },
    dateHeader: "Pending / Not Scanned",
    showDateHeader: true,
    key: `not-scanned-${name}-${index}`,
  }))

  const allRowsWithNotScanned = [...allRows]

  if (notScannedRows.length > 0) {
    allRowsWithNotScanned.push(...notScannedRows)
  }

  const totalItems = allRowsWithNotScanned.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const currentItems = allRowsWithNotScanned.slice(startIndex, endIndex)

  function getPageNumbers() {
    const pages: (number | "...")[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) {
        pages.push("...")
      }
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div
      style={{
        background: C.cardBg,
        borderRadius: "14px",
        border: `1px solid ${C.border}`,
        boxShadow: C.cardShadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
        fontFamily: "'Montserrat', 'Fallback Montserrat'",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "8px 12px" : "clamp(12px, 1.5vw, 14px) clamp(16px, 2vw, 24px)",
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
          gap: "4px",
          background: "#F9FAFB",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconUser
            size={isMobile ? 12 : 18}
            stroke={1.5}
            style={{ color: C.textDark }}
          />
          <span
            style={{
              fontSize: isMobile ? "11px" : "13px",
              fontWeight: 700,
              color: C.textDark,
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            Scan Records
          </span>
        </div>
        <span
          style={{
            fontSize: isMobile ? "9px" : "11px",
            fontWeight: 500,
            color: C.textGray,
            padding: "2px 8px",
            background: "#F3F4F6",
            borderRadius: "20px",
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
          }}
        >
          {totalItems} entries
        </span>
      </div>

      {/* Table Header */}
      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr 0.8fr 0.5fr 0.5fr",
            padding: "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
            background: "#F9FAFB",
            borderBottom: `1px solid ${C.border}`,
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.maroon,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
            }}
          >
            Student
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.maroon,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              textAlign: "center",
            }}
          >
            QR Code
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.maroon,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              textAlign: "center",
            }}
          >
            Status
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.maroon,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              textAlign: "center",
            }}
          >
            Time Out
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: C.maroon,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontFamily: "'Montserrat', 'Fallback Montserrat'",
              textAlign: "center",
            }}
          >
            Hours
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          flex: 1,
        }}
      >
        {totalItems > 0 ? (
          <>
            {currentItems.map((item, index) => {
              const isLast = index === currentItems.length - 1
              const isNotScanned = item.scan.status === "Not Scanned"
              
              const isFirstNotScanned = isNotScanned && 
                currentItems.slice(0, index).every(prev => prev.scan.status !== "Not Scanned")

              return (
                <div key={item.key}>
                  {isFirstNotScanned && (
                    <div
                      key={`not-scanned-header-${item.key}`}
                      style={{
                        padding: isMobile ? "6px 12px" : "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                        background: "#F9FAFB",
                        borderTop: `1px solid ${C.border}`,
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: isMobile ? "9px" : "11px",
                        fontWeight: 700,
                        color: C.textGray,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "'Montserrat', 'Fallback Montserrat'",
                      }}
                    >
                      Pending / Not Scanned ({notScannedNames.length})
                    </div>
                  )}
                  <ScanRow
                    isMobile={isMobile}
                    scan={item.scan}
                    isLast={isLast}
                    showDateHeader={item.showDateHeader && !isNotScanned}
                    dateHeader={item.dateHeader}
                  />
                </div>
              )
            })}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? "40px 16px" : "60px 20px",
              color: C.textGray,
            }}
          >
            <div
              style={{
                width: isMobile ? "40px" : "56px",
                height: isMobile ? "40px" : "56px",
                borderRadius: "50%",
                background: "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <IconUser size={isMobile ? 20 : 28} stroke={1.5} style={{ color: C.textGray }} />
            </div>
            <p
              style={{ 
                fontSize: isMobile ? "11px" : "13px",
                fontWeight: 600,
                color: C.textDark,
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                margin: 0,
              }}
            >
              No scan history
            </p>
            <p
              style={{
                fontSize: isMobile ? "9px" : "11px",
                color: C.textGray,
                marginTop: "2px",
                textAlign: "center",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              Scans will appear here once students start checking in
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "10px 12px" : "12px 20px",
          borderTop: "1px solid #E7E7E7",
          gap: isMobile ? "4px" : "12px",
          flexWrap: "wrap",
          background: "#FFFFFF",
        }}>
          <div style={{
            fontSize: isMobile ? "7px" : "11px",
            color: C.textMuted,
            fontWeight: 500,
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
          }}>
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            –{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "2px" : "8px",
          }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                width: isMobile ? "20px" : "28px",
                height: isMobile ? "20px" : "28px",
                borderRadius: isMobile ? "5px" : "8px",
                border: "1px solid #E5E7EB",
                background: "white",
                color: currentPage === 1 ? "#CFCFCF" : C.textDark,
                fontWeight: 500,
                fontSize: isMobile ? "9px" : "11px",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              ‹
            </button>

            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span key={`dots-${index}`} style={{
                  width: isMobile ? "16px" : "20px",
                  textAlign: "center",
                  fontWeight: 700,
                  color: C.textMuted,
                  fontSize: isMobile ? "9px" : "11px",
                  fontFamily: "'Montserrat', 'Fallback Montserrat'",
                }}>
                  ...
                </span>
              ) : (
                <button
                  key={`page-${page}`}
                  onClick={() => setCurrentPage(Number(page))}
                  style={{
                    width: isMobile ? "20px" : "28px",
                    height: isMobile ? "20px" : "28px",
                    borderRadius: isMobile ? "5px" : "8px",
                    border: currentPage === page ? "none" : "1px solid #E5E7EB",
                    background: currentPage === page ? C.maroon : "white",
                    color: currentPage === page ? "white" : C.textDark,
                    fontWeight: currentPage === page ? 700 : 500,
                    fontSize: isMobile ? "9px" : "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Montserrat', 'Fallback Montserrat'",
                  }}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                width: isMobile ? "20px" : "28px",
                height: isMobile ? "20px" : "28px",
                borderRadius: isMobile ? "5px" : "8px",
                border: "1px solid #E5E7EB",
                background: "white",
                color: currentPage === totalPages || totalPages === 0 ? "#CFCFCF" : C.textDark,
                fontWeight: 500,
                fontSize: isMobile ? "9px" : "11px",
                cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              ›
            </button>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "4px" : "10px",
            fontSize: isMobile ? "7px" : "11px",
            color: C.textMuted,
            fontWeight: 500,
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
          }}>
            <span style={{ display: "inline" }}>Rows per page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                height: isMobile ? "20px" : "30px",
                width: isMobile ? "40px" : "60px",
                border: "1px solid #D1D5DB",
                borderRadius: isMobile ? "5px" : "8px",
                padding: isMobile ? "0 4px" : "0 12px",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
                fontSize: isMobile ? "8px" : "11px",
                background: "white",
                outline: "none",
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}