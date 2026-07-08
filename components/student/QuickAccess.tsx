"use client"
import { 
  IconUsers, 
  IconEdit, 
  IconChevronRight, 
  IconQrcode,
  IconInfoCircle,
} from "@tabler/icons-react"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { QrGenerator } from "@/components/shared/QrGenerator"

interface QuickAccessProps {
  isMobile: boolean
}

export default function QuickAccess({ isMobile }: QuickAccessProps) {
  const [showQrGenerator, setShowQrGenerator] = useState(false)
  // Mock data
  const classData = {
    section: "NSTP 1 - BSCS 2A",
    members: 32,
    adviser: "Prof. Maria Santos",
    initials: ["JD", "MP", "AS", "RC"],
  }

  // Student data manual data
  const studentData = {
    name: "Juan Dela Cruz",
  }

  const filesData = {
    total: 8,
    pending: 2,
    submitted: 6,
  }

  const requestData = [
    { title: "Field Trip Permission", status: "Approved", time: "2 hours ago" },
    { title: "Medical Certificate", status: "Under Review", time: "1 day ago" },
    { title: "Excuse Letter", status: "Rejected", time: "3 days ago" },
  ]

  const statusStyles: Record<string, { bg: string; text: string }> = {
    Approved: { bg: "#E4F1E9", text: "#14492E" },
    "Under Review": { bg: "#FFF3CD", text: "#8A6200" },
    Rejected: { bg: "#FBE7E7", text: "#7B1113" },
  }

  const completionPct = Math.round((filesData.submitted / filesData.total) * 100)
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (completionPct / 100) * circumference

  const colors = {
    maroon: "#7B1113",
    green: "#14492E",
    greenLight: "rgba(20,73,46,0.08)",
    border: "#ECECEA",
    textDark: "#111827",
    textGray: "#8C8C88",
    textMuted: "#C8C8C4",
    cardBg: "#FFFFFF",
    cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
    hoverBg: "#F7F7F5",
    white: "#FFFFFF",
    amber: "#D97706",
    navy: "#0F2A3D",
  }

  const sizes = {
    padding: isMobile ? "10px 12px" : "12px 16px",
    gap: isMobile ? "6px" : "8px",
    iconSize: isMobile ? 16 : 18,
    iconStroke: 1.75,
    textSize: "14px",
    smallTextSize: isMobile ? "11px" : "12px",
    tinyTextSize: isMobile ? "9px" : "10px",
    avatarSize: isMobile ? "24px" : "26px",
    avatarFontSize: isMobile ? "9px" : "10px",
    qrBoxSize: isMobile ? "38px" : "40px",
    qrIconSize: isMobile ? 18 : 20,
    chartSize: isMobile ? "60px" : "64px",
    chartFontSize: isMobile ? "13px" : "14px",
  }

  const cardBaseStyle = {
    padding: sizes.padding,
    borderRadius: 8,
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    boxShadow: colors.cardShadow,
    flexShrink: 0,
    transition: "all 0.2s ease",
    fontFamily: "Montserrat, 'Montserrat Fallback'",
  } as const

  const hoverStyle = {
    background: colors.hoverBg,
    borderColor: colors.textGray,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  }

  const InfoCircleWithTooltip = ({ tooltip }: { tooltip: string }) => {
    const btnRef = useRef<HTMLButtonElement>(null)
    const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" } | null>(null)
    const [pinned, setPinned] = useState(false)

    const calcCoords = () => {
      if (!btnRef.current) return null
      const r = btnRef.current.getBoundingClientRect()
      const placement = r.top >= window.innerHeight - r.bottom ? "top" : "bottom"
      const top = placement === "top" ? r.top - 8 : r.bottom + 8
      const left = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130)
      return { top, left, placement } as const
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (pinned) {
        setPinned(false)
        setCoords(null)
      } else {
        const c = calcCoords()
        if (c) { setCoords(c); setPinned(true) }
      }
    }

    const handleMouseEnter = () => {
      if (pinned) return
      const c = calcCoords()
      if (c) setCoords(c)
    }

    const handleMouseLeave = () => {
      if (pinned) return
      setCoords(null)
    }

    useEffect(() => {
      if (!pinned) return
      const handler = () => { setPinned(false); setCoords(null) }
      document.addEventListener("click", handler)
      return () => document.removeEventListener("click", handler)
    }, [pinned])

    const tooltipEl = coords && typeof document !== "undefined"
      ? createPortal(
          <span style={{ 
            position: "fixed",
            top: coords.placement === "top" ? Math.max(8, coords.top) : Math.min(coords.top, window.innerHeight - 8),
            left: coords.left,
            transform: coords.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0%)",
            background: colors.white,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: colors.textDark,
            lineHeight: 1.45,
            fontFamily: "Montserrat, 'Montserrat Fallback'",
            whiteSpace: "pre-line",
            minWidth: 200,
            maxWidth: 250,
            overflowY: "visible",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            zIndex: 9999,
            textAlign: "justify",
          }}>
            {tooltip}
            <span style={{
              position: "absolute",
              left: `calc(50% + ${(btnRef.current?.getBoundingClientRect().left ?? 0) + (btnRef.current?.getBoundingClientRect().width ?? 0) / 2 - coords.left}px)`,
              transform: "translateX(-50%)",
              width: 0, height: 0, border: "6px solid transparent",
              ...(coords.placement === "top"
                ? { top: "100%", borderTopColor: colors.border }
                : { bottom: "100%", borderBottomColor: colors.border }),
            }} />
            <span style={{
              position: "absolute",
              left: `calc(50% + ${(btnRef.current?.getBoundingClientRect().left ?? 0) + (btnRef.current?.getBoundingClientRect().width ?? 0) / 2 - coords.left}px)`,
              transform: "translateX(-50%)",
              width: 0, height: 0, border: "5px solid transparent",
              ...(coords.placement === "top"
                ? { top: "calc(100% - 1px)", borderTopColor: colors.white }
                : { bottom: "calc(100% - 1px)", borderBottomColor: colors.white }),
            }} />
          </span>,
          document.body
        )
      : null

    return (
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 4 }}>
        <button
          ref={btnRef}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: pinned ? colors.textGray : colors.textMuted,
            padding: 0,
            transition: "color 0.13s",
            flexShrink: 0,
            width: sizes.iconSize,
            height: sizes.iconSize,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          aria-label="More info"
          type="button"
        >
          <IconInfoCircle size={sizes.iconSize} stroke={sizes.iconStroke} />
        </button>
        {tooltipEl}
      </span>
    )
  }

  const handleLinkMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    Object.assign(e.currentTarget.style, hoverStyle)
  }

  const handleLinkMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = colors.cardBg
    e.currentTarget.style.borderColor = colors.border
    e.currentTarget.style.boxShadow = colors.cardShadow
  }

  const handleDivMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    Object.assign(e.currentTarget.style, hoverStyle)
  }

  const handleDivMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = colors.cardBg
    e.currentTarget.style.borderColor = colors.border
    e.currentTarget.style.boxShadow = colors.cardShadow
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: sizes.gap,
          height: "100%",
          width: "100%",
          fontFamily: "Montserrat, 'Montserrat Fallback'",
          overflow: "hidden",
        }}
      >
        {/* My Class Card */}
        <Link
          href="/student/classlist"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "6px" : "8px",
            textDecoration: "none",
            color: colors.textDark,
            cursor: "pointer",
            ...cardBaseStyle,
            flex: "0 0 auto",
          }}
          onMouseEnter={handleLinkMouseEnter}
          onMouseLeave={handleLinkMouseLeave}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconUsers size={sizes.iconSize} stroke={sizes.iconStroke} color={colors.textDark} />
              <span style={{ 
                fontSize: sizes.textSize, 
                fontWeight: 700, 
                color: colors.textDark, 
                letterSpacing: "0.3px",
                fontFamily: "Montserrat, 'Montserrat Fallback'",
              }}>
                My Class
              </span>
            </div>
            <IconChevronRight size={sizes.iconSize} stroke={sizes.iconStroke} color={colors.textMuted} />
          </div>

        <div style={{ 
          fontSize: sizes.smallTextSize, 
          fontWeight: 600, 
          color: colors.textDark,
          fontFamily: "Montserrat, 'Montserrat Fallback'",
        }}>
          {classData.section}
        </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {classData.initials.map((initials, i) => (
                <div
                  key={initials}
                  style={{
                    width: sizes.avatarSize,
                    height: sizes.avatarSize,
                    borderRadius: "50%",
                    background: colors.greenLight,
                    border: `2px solid ${colors.cardBg}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: sizes.avatarFontSize,
                    fontWeight: 700,
                    color: colors.green,
                    marginLeft: i === 0 ? 0 : "-6px",
                    letterSpacing: "0.3px",
                    fontFamily: "Montserrat, 'Montserrat Fallback'",
                  }}
                >
                  {initials}
                </div>
              ))}
              <div
                style={{
                  width: sizes.avatarSize,
                  height: sizes.avatarSize,
                  borderRadius: "50%",
                  background: colors.textMuted,
                  border: `2px solid ${colors.cardBg}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? "8px" : "9px",
                  fontWeight: 700,
                  color: colors.white,
                  marginLeft: "-6px",
                  fontFamily: "Montserrat, 'Montserrat Fallback'",
                }}
              >
                +{classData.members - classData.initials.length}
              </div>
            </div>

            <div style={{ 
              fontSize: sizes.tinyTextSize, 
              color: colors.textMuted, 
              textAlign: "right",
              fontFamily: "Montserrat, 'Montserrat Fallback'",
            }}>
              Adviser: <span style={{ color: colors.textGray, fontWeight: 600 }}>{classData.adviser}</span>
            </div>
          </div>
        </Link>

        {/* Generate QR Card */}
        <div
          onClick={() => setShowQrGenerator(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: colors.textDark,
            cursor: "pointer",
            ...cardBaseStyle,
            flex: "0 0 auto",
          }}
          onMouseEnter={handleDivMouseEnter}
          onMouseLeave={handleDivMouseLeave}
        >
          <div
            style={{
              width: sizes.qrBoxSize,
              height: sizes.qrBoxSize,
              borderRadius: 10,
              background: colors.textDark,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.white,
              flexShrink: 0,
            }}
          >
            <IconQrcode size={sizes.qrIconSize} stroke={1.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: sizes.textSize, 
              fontWeight: 700, 
              color: colors.textDark,
              fontFamily: "Montserrat, 'Montserrat Fallback'",
            }}>
              Generate QR
            </div>
            <div style={{ 
              fontSize: sizes.smallTextSize, 
              color: colors.textGray, 
              marginTop: "2px",
              fontFamily: "Montserrat, 'Montserrat Fallback'",
            }}>
              Tap to open QR generator
            </div>
          </div>
        </div>

        {/* Files Card */}
        <Link
          href="/student/files"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: colors.textDark,
            cursor: "pointer",
            ...cardBaseStyle,
            flex: "0 0 auto",
          }}
          onMouseEnter={handleLinkMouseEnter}
          onMouseLeave={handleLinkMouseLeave}
        >
          <div style={{ position: "relative", width: sizes.chartSize, height: sizes.chartSize, flexShrink: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r={radius} fill="none" stroke={colors.border} strokeWidth="7" />
              <circle
                cx="36"
                cy="36"
                r={radius}
                fill="none"
                stroke={colors.maroon}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: sizes.chartFontSize,
                fontWeight: 700,
                color: colors.textDark,
                fontFamily: "Montserrat, 'Montserrat Fallback'",
              }}
            >
              {completionPct}%
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2px", flexWrap: "wrap" }}>
              <div style={{ 
                fontSize: sizes.textSize, 
                fontWeight: 700, 
                color: colors.textDark,
                fontFamily: "Montserrat, 'Montserrat Fallback'",
              }}>
                Submission Completion Rate
              </div>
              <InfoCircleWithTooltip tooltip="Percentage of submitted files out of total requirements." />
            </div>
            <div style={{ 
              fontSize: sizes.smallTextSize, 
              color: colors.textGray, 
              marginTop: "3px",
              fontFamily: "Montserrat, 'Montserrat Fallback'",
            }}>
              {filesData.submitted}/{filesData.total} files submitted
            </div>
            <div 
              style={{ 
                fontSize: sizes.tinyTextSize, 
                color: colors.textMuted, 
                marginTop: "4px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "Montserrat, 'Montserrat Fallback'",
              }}
            >
              <IconChevronRight size={isMobile ? 10 : 12} stroke={sizes.iconStroke} />
              Tap to view all files
            </div>
          </div>
        </Link>

        {/* Recent Request/s Card */}
        <Link
          href="/student/request"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "6px" : "8px",
            textDecoration: "none",
            color: colors.textDark,
            cursor: "pointer",
            ...cardBaseStyle,
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden",
          }}
          onMouseEnter={handleLinkMouseEnter}
          onMouseLeave={handleLinkMouseLeave}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconEdit size={sizes.iconSize} stroke={sizes.iconStroke} color={colors.textDark} />
              <span style={{ 
                fontSize: sizes.textSize, 
                fontWeight: 700, 
                color: colors.textDark,
                fontFamily: "Montserrat, 'Montserrat Fallback'",
              }}>
                Recent Requests
              </span>
            </div>
            <IconChevronRight size={sizes.iconSize} stroke={sizes.iconStroke} color={colors.textMuted} />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flex: "1 1 auto",
              overflowY: "auto",
              minHeight: 0,
              paddingRight: "2px",
            }}
          >
            {requestData.map((req, i) => {
              const style = statusStyles[req.status]
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: isMobile ? "6px 8px" : "6px 10px",
                    borderRadius: "6px",
                    background: "#FAFAF9",
                    border: `1px solid ${colors.border}`,
                    flexShrink: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: sizes.smallTextSize,
                        fontWeight: 600,
                        color: colors.textDark,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontFamily: "Montserrat, 'Montserrat Fallback'",
                      }}
                    >
                      {req.title}
                    </div>
                    <div style={{ 
                      fontSize: sizes.tinyTextSize, 
                      color: colors.textMuted, 
                      marginTop: "1px",
                      fontFamily: "Montserrat, 'Montserrat Fallback'",
                    }}>
                      {req.time}
                    </div>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: style.bg,
                      fontSize: sizes.tinyTextSize,
                      fontWeight: 700,
                      color: style.text,
                      letterSpacing: "0.2px",
                      fontFamily: "Montserrat, 'Montserrat Fallback'",
                    }}
                  >
                    {req.status}
                  </div>
                </div>
              )
            })}
          </div>
        </Link>
      </div>

      {/* QR Generator Modal */}
      {showQrGenerator && (
        <QrGenerator
          onClose={() => setShowQrGenerator(false)}
          onGenerateSuccess={() => {}}
          studentName={studentData.name} 
        />
      )}
    </>
  )
}