"use client"

import { useEffect, useState, useRef } from "react"
import { IconX, IconCircleCheck, IconAlertCircle } from "@tabler/icons-react"

interface SuccessToastProps {
  show: boolean
  message: string
  onClose: () => void
  type?: "success" | "error"
}

export default function SuccessToast({
  show,
  message,
  onClose,
  type = "success",
}: SuccessToastProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const DURATION = 5000

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!show) return
    setIsLeaving(false)

    const leaveTimer = setTimeout(() => setIsLeaving(true), DURATION - 250)
    const closeTimer = setTimeout(() => onCloseRef.current(), DURATION)

    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(closeTimer)
    }

  }, [show])

  if (!show) return null

  const isError = type === "error"

  const theme = isError
    ? {
        border: "#E8C9C9",
        iconBg: "#F4E3E3",
        iconColor: "#B03B3B",
        barColor: "#C46A6A",
        title: "Something went wrong",
      }
    : {
        border: "#CFE3CE",
        iconBg: "#E8F2E3",
        iconColor: "#2D8A4E",
        barColor: "#4FA86A",
        title: "Success",
      }

  return (
    <div
      style={{
        width: 340,
        marginBottom: 14,
        fontFamily: "var(--font-montserrat), sans-serif",
        animation: isLeaving
          ? "toastOut .25s ease forwards"
          : "toastIn .32s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: "16px 16px 16px 14px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,.05), 0 12px 32px rgba(0,0,0,.09)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            minWidth: 34,
            borderRadius: "50%",
            background: theme.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {isError ? (
            <IconAlertCircle size={19} stroke={2} color={theme.iconColor} />
          ) : (
            <IconCircleCheck size={19} stroke={2} color={theme.iconColor} />
          )}
        </div>

        <div style={{ flex: 1, paddingTop: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "#1F1F1D",
              marginBottom: 3,
              letterSpacing: "-0.1px",
            }}
          >
            {theme.title}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "#7A7A7A",
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#B5B5B0",
            padding: 4,
            marginTop: -2,
            marginRight: -4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background .15s, color .15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F3F3F1"
            e.currentTarget.style.color = "#555"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.color = "#B5B5B0"
          }}
        >
          <IconX size={16} stroke={2.25} />
        </button>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 3,
            width: "100%",
            background: theme.barColor,
            opacity: 0.85,
            borderRadius: "0 0 0 16px",
            animation: show
              ? `toastProgress ${DURATION}ms linear forwards`
              : "none",
            transformOrigin: "left",
          }}
        />
      </div>

      <style>
        {`
          @keyframes toastIn {
            from { opacity: 0; transform: translateX(24px) scale(0.96); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes toastOut {
            from { opacity: 1; transform: translateX(0) scale(1); }
            to { opacity: 0; transform: translateX(16px) scale(0.97); }
          }
          @keyframes toastProgress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}
      </style>
    </div>
  )
}