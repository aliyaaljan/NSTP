"use client"

import {
  IconUser,
  IconCalendar,
  IconClock,
  IconCheck,
  IconQrcode,
  IconX,
} from "@tabler/icons-react"
import { C } from "./theme"
import type { ScanRecord, ScanStatus } from "@/lib/student/leader/scan-history"
import { formatDate, groupByDate } from "@/lib/student/leader/scan-history"

const STATUS_STYLES: Record<
  ScanStatus,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  "On Time": {
    color: C.success,
    bg: C.successBg,
    icon: <IconCheck size={14} stroke={2.5} />,
  },
  Late: {
    color: C.warning,
    bg: C.warningBg,
    icon: <IconClock size={14} stroke={2.5} />,
  },
  // dummy styling
  "Not Scanned": {
    color: C.textGray,
    bg: "#E8E8E8",
    icon: <IconX size={14} stroke={2.5} />,
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

  return (
    <>
      {showDateHeader && dateHeader && (
        <div
          style={{
            padding: isMobile ? "3px 12px" : "8px 24px",
            background: "#F7F7F7",
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
              fontSize: isMobile ? "9px" : "13px",
              fontWeight: 600,
              color: C.textDark,
            }}
          >
            {dateHeader}
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr auto" : "2fr 1.2fr 0.8fr",
          alignItems: "center",
          padding: isMobile ? "6px 12px" : "12px 24px",
          borderBottom: isLast ? "none" : `1px solid ${C.border}`,
          gap: isMobile ? "6px" : "16px",
          transition: "background 0.15s ease",
          background: "#FFFFFF",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = C.greenBg
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FFFFFF"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: isMobile ? "24px" : "36px",
              height: isMobile ? "24px" : "36px",
              borderRadius: "50%",
              background: C.maroon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: isMobile ? "7px" : "12px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: isMobile ? "10px" : "14px",
                fontWeight: 600,
                color: C.textDark,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                margin: 0,
              }}
            >
              {scan.name}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                marginTop: "1px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? "7px" : "11px",
                  color: C.textGray,
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <IconClock size={isMobile ? 6 : 12} stroke={1.5} />
                <span style={{ fontWeight: 400, color: C.textGray }}>
                  QR generated:
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: C.textDark,
                  }}
                >
                  {scan.generatedTime}
                </span>
              </span>
              {!isMobile && (
                <span
                  style={{
                    fontSize: "8px",
                    color: C.textMuted,
                  }}
                >
                  •
                </span>
              )}
              <span
                style={{
                  fontSize: isMobile ? "7px" : "11px",
                  color: C.textGray,
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <IconQrcode size={isMobile ? 6 : 12} stroke={1.5} />
                <span style={{ fontWeight: 400, color: C.textGray }}>
                  QR scanned:
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: C.green,
                  }}
                >
                  {scan.scannedTime}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: isMobile ? "7px" : "12px",
              fontWeight: 700,
              padding: isMobile ? "2px 6px" : "4px 14px",
              borderRadius: "20px",
              background: bg,
              color: color,
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              whiteSpace: "nowrap",
            }}
          >
            {!isMobile && icon}
            {scan.status}
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
        borderRadius: "10px",
        border: `1px solid ${C.border}`,
        boxShadow: C.cardShadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
        minHeight: isMobile ? "200px" : "300px",
        maxHeight: isMobile ? "calc(100vh - 400px)" : "calc(100vh - 380px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "8px 12px" : "16px 24px",
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
          gap: "4px",
          background: "#FAFAFA",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IconUser
            size={isMobile ? 12 : 20}
            stroke={1.5}
            style={{ color: C.textGray }}
          />
          <span
            style={{
              fontSize: isMobile ? "10px" : "15px",
              fontWeight: 700,
              color: C.textDark,
            }}
          >
            Scan Records
          </span>
        </div>
        <span
          style={{
            fontSize: isMobile ? "8px" : "12px",
            fontWeight: 700,
            color: C.textGray,
            padding: "2px 8px",
            borderRadius: "20px",
            background: C.pageBg,
          }}
        >
          {totalScans} entries
        </span>
      </div>

      {!isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 0.8fr",
            padding: "10px 24px",
            background: "#F7F7F7",
            borderBottom: `1px solid ${C.border}`,
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: C.textGray,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Student / Time
          </div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: C.textGray,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              textAlign: "right",
            }}
          >
            Status
          </div>
        </div>
      )}

      <div
        style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}
      >
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
                          padding: isMobile ? "6px 12px" : "12px 24px",
                          background: C.greenBg,
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
                          style={{ color: C.green }}
                        />
                        <span
                          style={{
                            fontSize: isMobile ? "10px" : "15px",
                            fontWeight: 700,
                            color: C.green,
                          }}
                        >
                          {monthKey}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? "8px" : "12px",
                            color: C.textGray,
                            fontWeight: 500,
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
              style={{ fontSize: isMobile ? "11px" : "14px", fontWeight: 500 }}
            >
              No scan history for this period
            </p>
            <p
              style={{
                fontSize: isMobile ? "9px" : "12px",
                color: C.textLight,
                marginTop: "4px",
              }}
            >
              Scans will appear here once students start checking in
            </p>
          </div>
        )}
        {notScannedNames.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div
              style={{
                padding: isMobile ? "6px 12px" : "10px 24px",
                background: "#F0F0F0",
                borderTop: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                fontSize: isMobile ? "10px" : "13px",
                fontWeight: 700,
                color: C.textGray,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
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
