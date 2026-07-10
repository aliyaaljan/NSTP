"use client"

import { IconQrcode, IconChevronRight } from "@tabler/icons-react"
import { C } from "./theme"

export function QRCard({
  isMobile,
  onOpenScanner,
}: {
  isMobile: boolean
  onOpenScanner: () => void
}) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`,
        borderRadius: "10px",
        padding: isMobile ? "10px 14px" : "20px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 4px 16px rgba(20, 73, 46, 0.25)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        width: "100%",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={onOpenScanner}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)"
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(20, 73, 46, 0.35)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(20, 73, 46, 0.25)"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -50,
          left: -20,
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.03)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: isMobile ? "36px" : "52px",
            height: isMobile ? "36px" : "52px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
            backdropFilter: "blur(4px)",
          }}
        >
          <IconQrcode size={isMobile ? 18 : 28} stroke={1.5} />
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: isMobile ? "13px" : "18px",
              color: "#fff",
            }}
          >
            Scan QR Code
          </div>
          <div
            style={{
              fontSize: isMobile ? "9px" : "13px",
              color: "rgba(255,255,255,0.8)",
              marginTop: "1px",
            }}
          >
            Tap to open scanner
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          color: "#fff",
          fontWeight: 600,
          fontSize: isMobile ? "10px" : "14px",
          background: "rgba(255,255,255,0.15)",
          padding: isMobile ? "4px 10px" : "8px 20px",
          borderRadius: "20px",
          backdropFilter: "blur(4px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span>Open</span>
        <IconChevronRight size={isMobile ? 12 : 20} stroke={2} />
      </div>
    </div>
  )
}