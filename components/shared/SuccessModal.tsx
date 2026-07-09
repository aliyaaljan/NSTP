"use client"

import { useEffect } from "react"

interface SuccessToastProps {
  show: boolean
  message: string
  onClose: () => void
}

export default function SuccessToast({
  show,
  message,
  onClose,
}: SuccessToastProps) {
  useEffect(() => {
    if (!show) return

    const timer = setTimeout(() => {
      onClose()
    }, 3500)

    return () => clearTimeout(timer)
  }, [show, onClose])

  if (!show) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 300,
        width: 330,
        background: "#FFFFFF",
        border: "1px solid #8AAE8A",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 24px rgba(26,60,42,.12)",
        fontFamily: "var(--font-montserrat), sans-serif",
        animation: "slideIn .25s ease",
      }}
    >
      <div
        style={{
          color: "#1A3C2A",
          display: "flex",
          alignItems: "center",
        }}
      >
        <i
          className="ti ti-circle-check"
          style={{
            fontSize: 22,
          }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#2C2C2A",
            marginBottom: 2,
          }}
        >
          Success
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#7A7A7A",
            lineHeight: 1.4,
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
          fontSize: 16,
          color: "#999",
          padding: 0,
        }}
      >
        ×
      </button>

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  )
}