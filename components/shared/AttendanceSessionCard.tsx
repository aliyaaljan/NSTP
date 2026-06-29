"use client"

import { IconPlayerPlay, IconPlayerStop } from "@tabler/icons-react"

const P = {
  green: "#14492E",
  greenLight: "#1A5C3A",
  greenBg: "#E8F5EF",
  maroon: "#7B1113",
  maroonLight: "#9E1A1C",
  maroonBg: "#FDE8E8",
  cardBg: "#FFFFFF",
  cardShadow: "0 4px 20px rgba(0,0,0,0.06)",
  border: "#EDE9E6",
  textGray: "#8A8580",
}

interface AttendanceSessionCardProps {
  mode: "toggle" | "timeoutOnly"
  isActive: boolean
  pending: boolean
  onPrimary: () => void
  isMobile: boolean
  helperText?: string
}

export default function AttendanceSessionCard({
  mode,
  isActive,
  pending,
  onPrimary,
  isMobile,
  helperText,
}: AttendanceSessionCardProps) {
  const disabled = pending || (mode === "timeoutOnly" && !isActive)

  const showGreen = mode === "toggle" && !isActive
  const showMaroon = (mode === "toggle" && isActive) || (mode === "timeoutOnly" && isActive)

  const buttonGradient = showGreen
    ? `linear-gradient(135deg, ${P.green} 0%, ${P.greenLight} 100%)`
    : showMaroon
      ? `linear-gradient(135deg, ${P.maroon} 0%, ${P.maroonLight} 100%)`
      : `linear-gradient(135deg, #999 0%, #777 100%)`

  const buttonShadow = showGreen
    ? "0 8px 40px rgba(20, 73, 46, 0.35)"
    : showMaroon
      ? "0 8px 40px rgba(123, 17, 19, 0.35)"
      : "0 8px 40px rgba(0,0,0,0.15)"

  const buttonShadowHover = showGreen
    ? "0 12px 48px rgba(20, 73, 46, 0.45)"
    : showMaroon
      ? "0 12px 48px rgba(123, 17, 19, 0.45)"
      : buttonShadow

  const radialBg = showGreen || (!showMaroon && !showGreen)
    ? `radial-gradient(circle, ${disabled ? "#eee" : P.greenBg} 0%, transparent 70%)`
    : `radial-gradient(circle, ${P.maroonBg} 0%, transparent 70%)`

  let label: string
  let Icon = IconPlayerPlay
  if (mode === "toggle") {
    label = isActive ? "End" : "Start"
    Icon = isActive ? IconPlayerStop : IconPlayerPlay
  } else {
    label = "Time Out"
    Icon = IconPlayerStop
  }

  let pillLabel: string
  let pillColor: string
  let pillBorder: string
  let pillBg: string
  if (mode === "toggle") {
    pillLabel = isActive ? "Active" : "Inactive"
    pillColor = isActive ? P.green : P.maroon
    pillBorder = isActive ? P.green : P.maroon
    pillBg = isActive ? P.greenBg : P.maroonBg
  } else {
    if (isActive) {
      pillLabel = "Timed In"
      pillColor = P.green
      pillBorder = P.green
      pillBg = P.greenBg
    } else {
      pillLabel = "Not Timed In"
      pillColor = P.maroon
      pillBorder = P.maroon
      pillBg = P.maroonBg
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: P.cardBg,
        borderRadius: "20px",
        border: `2px solid ${P.border}`,
        boxShadow: P.cardShadow,
        padding: isMobile ? "30px 20px" : "40px 40px",
        minHeight: isMobile ? "300px" : "400px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: radialBg,
          opacity: 0.5,
          pointerEvents: "none",
          transition: "all 0.5s ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          left: -80,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: radialBg,
          opacity: 0.3,
          pointerEvents: "none",
          transition: "all 0.5s ease",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? "20px" : "28px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "14px" : "17px",
            fontWeight: 500,
            color: P.textGray,
            textAlign: "center",
            letterSpacing: "0.3px",
          }}
        >
          {mode === "toggle"
            ? isActive
              ? "Tap to end the session"
              : "Tap to begin the session"
            : isActive
              ? "Tap to time out"
              : "Your leader scans your QR to time you in."}
        </div>

        <button
          onClick={onPrimary}
          disabled={disabled}
          style={{
            width: isMobile ? "160px" : "220px",
            height: isMobile ? "160px" : "220px",
            borderRadius: "50%",
            border: "none",
            background: disabled
              ? `linear-gradient(135deg, #999 0%, #777 100%)`
              : buttonGradient,
            color: "#fff",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            boxShadow: disabled ? "0 8px 40px rgba(0,0,0,0.15)" : buttonShadow,
            transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.transform = "scale(1.04)"
              e.currentTarget.style.boxShadow = buttonShadowHover
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = buttonShadow
            }
          }}
          onMouseDown={(e) => {
            if (!disabled) {
              e.currentTarget.style.transform = "scale(0.94)"
            }
          }}
          onMouseUp={(e) => {
            if (!disabled) {
              e.currentTarget.style.transform = "scale(1.04)"
            }
          }}
        >
          <Icon
            size={isMobile ? 40 : 56}
            stroke={2}
            style={showGreen && !isActive ? { marginLeft: "4px" } : undefined}
          />
          <span
            style={{
              fontSize: isMobile ? "18px" : "24px",
              fontWeight: 700,
              marginTop: "4px",
              letterSpacing: "0.5px",
            }}
          >
            {label}
          </span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: isMobile ? "8px 20px" : "10px 28px",
            borderRadius: "999px",
            border: `2px solid ${pillBorder}`,
            background: pillBg,
            transition: "all 0.3s ease",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: pillColor,
              animation:
                (mode === "toggle" && isActive) || (mode === "timeoutOnly" && isActive)
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
            }}
          />
          <span
            style={{
              fontSize: isMobile ? "13px" : "15px",
              fontWeight: 600,
              color: pillColor,
            }}
          >
            {pillLabel}
          </span>
        </div>

        {helperText && (
          <div
            style={{
              fontSize: isMobile ? "12px" : "14px",
              color: P.textGray,
              textAlign: "center",
              fontWeight: 500,
              maxWidth: "300px",
            }}
          >
            {helperText}
          </div>
        )}
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
    </div>
  )
}
