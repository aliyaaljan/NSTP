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

  return (
    <>
      {showDateHeader && dateHeader && (
        <div
          style={{
            padding: isMobile ? "3px 12px" : "8px 24px",
            background: "#F9FAFB",
            borderBottom: `1px solid ${C.border}`,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <IconCalendar
            size={isMobile ? 8 : 14}
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
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "1fr 1.2fr 0.8fr 0.5fr 0.5fr",
          alignItems: "center",
          padding: isMobile ? "6px 12px" : "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
          borderBottom: isLast ? "none" : `1px solid ${C.border}`,
          gap: isMobile ? "6px" : "16px",
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
              width: isMobile ? "24px" : "32px",
              height: isMobile ? "24px" : "32px",
              borderRadius: "50%",
              background: C.maroon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: isMobile ? "7px" : "12px",
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
              padding: isMobile ? "2px 6px" : "4px 14px",
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
            {!isMobile && icon}
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
  isMobile,
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
  const totalScans = scans.length
  const isAllView = selectedWeek === "all"
  const hasScans = totalScans > 0

  const monthKeys = groupedByMonth ? Object.keys(groupedByMonth) : []
  const dateKeys = groupedByDateProp
    ? Object.keys(groupedByDateProp).sort((a, b) => b.localeCompare(a))
    : []

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
        minHeight: isMobile ? "180px" : "300px",
        maxHeight: isMobile ? "calc(100vh - 360px)" : "calc(100vh - 380px)",
        fontFamily: "'Montserrat', 'Fallback Montserrat'",
        paddingBottom: isMobile ? "60px" : "0",
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
              fontSize: "13px",
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
            fontSize: "11px",
            fontWeight: 400,
            color: C.textGray,
            padding: "2px 8px",
            fontFamily: "'Montserrat', 'Fallback Montserrat'",
          }}
        >
          {totalScans} entries
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
          overflowY: "auto",
          flex: 1,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
          scrollbarColor: "#D1D5DB #F9FAFB",
        }}
        className="custom-scrollbar"
      >
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #F9FAFB;
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #D1D5DB;
            border-radius: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9CA3AF;
          }
        `}</style>

        {hasScans ? (
          isAllView ? (
            <>
              {monthKeys
                .sort((a, b) => {
                  const dateA = new Date(a)
                  const dateB = new Date(b)
                  return dateB.getTime() - dateA.getTime()
                })
                .map((monthKey, monthIndex) => {
                  const scansForMonth = groupedByMonth?.[monthKey] || []
                  const scansGroupedByDate = groupByDate(scansForMonth)
                  const dateKeysForMonth = Object.keys(scansGroupedByDate).sort(
                    (a, b) => b.localeCompare(a)
                  )

                  return (
                    <div key={monthKey}>
                      <div
                        style={{
                          padding: isMobile ? "6px 12px" : "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                          background: "#F9FAFB",
                          borderBottom: `1px solid ${C.border}`,
                          borderTop:
                            monthIndex > 0 ? `1px solid ${C.border}` : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <IconCalendar
                          size={isMobile ? 10 : 16}
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
                          {monthKey}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: C.textGray,
                            fontWeight: 500,
                            fontFamily: "'Montserrat', 'Fallback Montserrat'",
                          }}
                        >
                          • {scansForMonth.length} entries
                        </span>
                      </div>

                      {dateKeysForMonth.map((date, dateIndex, dateArray) => {
                        const scansForDate = scansGroupedByDate[date] || []
                        return scansForDate.map((scan, i) => (
                          <ScanRow
                            key={scan.id ?? `${scan.name}-${scan.date}-${i}`}
                            isMobile={isMobile}
                            scan={scan}
                            isLast={
                              i === scansForDate.length - 1 &&
                              dateIndex === dateArray.length - 1
                            }
                            showDateHeader={i === 0}
                            dateHeader={formatDate(scan.date)}
                          />
                        ))
                      })}
                    </div>
                  )
                })}
            </>
          ) : (
            <>
              {dateKeys.map((date, dateIndex) => {
                const scansForDate = groupedByDateProp?.[date] || []
                return scansForDate.map((scan, i) => (
                  <ScanRow
                    key={scan.id ?? `${scan.name}-${date}-${i}`}
                    isMobile={isMobile}
                    scan={scan}
                    isLast={
                      i === scansForDate.length - 1 &&
                      dateIndex === dateKeys.length - 1
                    }
                    showDateHeader={i === 0}
                    dateHeader={formatDate(scan.date)}
                  />
                ))
              })}
            </>
          )
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? "20px 12px" : "60px 20px",
              color: C.textGray,
            }}
          >
            <p
              style={{ 
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              No scan history for this period
            </p>
            <p
              style={{
                fontSize: "11px",
                color: C.textGray,
                marginTop: "4px",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              Scans will appear here once students start checking in
            </p>
          </div>
        )}
        
        {/* Not Scanned Section */}
        {notScannedNames.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div
              style={{
                padding: isMobile ? "6px 12px" : "clamp(10px, 1.2vw, 14px) clamp(12px, 1.5vw, 24px)",
                background: "#F9FAFB",
                borderTop: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                fontSize: "11px",
                fontWeight: 700,
                color: C.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Montserrat', 'Fallback Montserrat'",
              }}
            >
              Pending / Not Scanned ({notScannedNames.length})
            </div>

            {notScannedNames.map((name, i) => (
              <ScanRow
                key={`missing-${name}`}
                isMobile={isMobile}
                isLast={i === notScannedNames.length - 1}
                scan={{
                  id: `missing-${name}`,
                  name: name,
                  date: "—",
                  generatedTime: "—",
                  scannedTime: "—",
                  timeOut: "—",
                  hours: 0,
                  status: "Not Scanned",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}