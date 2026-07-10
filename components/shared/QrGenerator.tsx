"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { IconX, IconQrcode } from "@tabler/icons-react"
import { QRCodeSVG } from "qrcode.react"
import { generateQrToken } from "@/lib/attendance/qr-actions"
import type { QrDisplayInfo } from "@/lib/attendance/qr-actions"
import { captureGeo, geoErrorMessage } from "@/lib/attendance/geo-client"

interface QrGeneratorProps {
  onClose: () => void
  onGenerateSuccess?: () => void
  studentName?: string 
}

export function QrGenerator({ onClose, onGenerateSuccess, studentName }: QrGeneratorProps) {
  const generatingRef = useRef(false)
  const [generated, setGenerated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [display, setDisplay] = useState<QrDisplayInfo | null>(null)
  const displayRef = useRef(display)
  useEffect(() => {
    displayRef.current = display
  }, [display])
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [qrHidden, setQrHidden] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<"locating" | "generating" | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          setLocationDenied(status.state === "denied")
          status.addEventListener("change", () => {
            setLocationDenied(status.state === "denied")
          })
        })
        .catch(() => {})
    }
  }, [])

  // Anti-screenshot protection
  useEffect(() => {
    function onVisChange() {
      setQrHidden(document.hidden)
    }
    function onBlur() {
      setQrHidden(true)
    }
    function onFocus() {
      setQrHidden(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === "PrintScreen" ||
        (e.key === "s" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        setQrHidden(true)
        navigator.clipboard?.writeText("")?.catch(() => {})
        setTimeout(() => setQrHidden(false), 800)
      }
    }

    document.addEventListener("visibilitychange", onVisChange)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("visibilitychange", onVisChange)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  const runGenerate = useCallback(async () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setLoadingPhase("locating")
    setError(null)
    
    try {
      const result = await captureGeo()
      if (!result.ok) {
        setError(geoErrorMessage(result.reason))
        setToken(null)
        setDisplay(null)
        setGenerated(true)
        return
      }

      setLoadingPhase("generating")
      const res = await generateQrToken(result.geo)
      if (!res.ok) {
        setError(res.error)
        setToken(null)
        setDisplay(null)
        setGenerated(true)
        return
      }
      
      setError(null)
      setToken(res.token)
      setDisplay(res.display)
      setGenerated(true)
      setNow(Date.now())
      if (onGenerateSuccess) onGenerateSuccess()
    } catch (e) {
      console.error("[QR] generate failed", e)
      setError("Couldn't generate QR. Please try again.")
      setToken(null)
      setDisplay(null)
      setGenerated(true)
    } finally {
      generatingRef.current = false
      setLoadingPhase(null)
    }
  }, [onGenerateSuccess])

  // Auto-refresh
  useEffect(() => {
    if (!generated) return
    const id = setInterval(() => {
      setNow(Date.now())
      const d = displayRef.current
      if (
        d &&
        new Date(d.expiresAt).getTime() <= Date.now() &&
        !generatingRef.current
      ) {
        runGenerate()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [generated, runGenerate])

  const remainingMs = display
    ? Math.max(0, new Date(display.expiresAt).getTime() - now)
    : 0
  const remainingSec = Math.ceil(remainingMs / 1000)
  const pct = display
    ? Math.max(0, Math.min(100, (remainingMs / 60000) * 100))
    : 0

  const timeLabel = display
    ? new Date(display.generatedAt).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : ""

  const locationLabel = display
    ? `${display.latitude.toFixed(5)}, ${display.longitude.toFixed(5)}`
    : ""

  return (
    <div className="generator-backdrop" onClick={onClose}>
      <div className="generator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="generator-header">
          <span className="generator-title">Generate QR Code</span>
          <button
            className="generator-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={20} stroke={1.75} />
          </button>
        </div>
        
        <div className="generator-body">
          {locationDenied ? (
            <div className="generator-error">
              <IconQrcode size={40} stroke={1.5} />
              <p>Location access is required to generate a QR code.</p>
              <button
                onClick={() => {
                  setLocationDenied(false)
                }}
                style={{
                  marginTop: "12px",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  background: "#14492E",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Enable location & retry
              </button>
            </div>
          ) : loadingPhase ? (
            <div className="generator-loading">
              <div className="generator-spinner" />
              <p>
                {loadingPhase === "locating"
                  ? "Getting your location…"
                  : "Generating secure QR…"}
              </p>
            </div>
          ) : !generated ? (
            <div className="generator-start">
              <IconQrcode size={60} stroke={1.5} style={{ color: "#14492E" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#555", marginTop: 8 }}>
                Generate a QR code for attendance
              </p>
              <button
                onClick={() => runGenerate()}
                className="generator-generate-btn"
              >
                Generate QR
              </button>
            </div>
          ) : error ? (
            <div className="generator-error">
              <IconQrcode size={40} stroke={1.5} />
              <p>{error}</p>
              <button
                onClick={() => runGenerate()}
                className="generator-retry-btn"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="qr-display-container">
                <div className="qr-status-badge">● QR ACTIVE</div>
                
                <div className="qr-code-wrapper">
                  {token && !qrHidden && (
                    <QRCodeSVG
                      value={token}
                      size={isMobile ? 180 : 220}
                      level="M"
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                      }}
                    />
                  )}
                  {token && qrHidden && (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "#000",
                        borderRadius: 8,
                      }}
                    />
                  )}
                </div>

                <div className="qr-progress-container">
                  <div className="qr-progress">
                    <div
                      className="qr-progress-bar"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="qr-countdown">Refreshes in {remainingSec}s</p>
                </div>

                <div className="qr-info-grid">
                  {/* Student name */}
                  {studentName && (
                    <div className="qr-info-item">
                      <span className="qr-info-label">Student:</span>
                      <span className="qr-info-value">{studentName}</span>
                    </div>
                  )}
                  <div className="qr-info-item">
                    <span className="qr-info-label">Location:</span>
                    <span className="qr-info-value">{locationLabel || "—"}</span>
                  </div>
                  <div className="qr-info-item">
                    <span className="qr-info-label">Generated:</span>
                    <span className="qr-info-value">{timeLabel || "—"}</span>
                  </div>
                </div>

                <button
                  onClick={() => runGenerate()}
                  className="generator-regenerate-btn"
                >
                  Regenerate QR
                </button>
              </div>
            </>
          )}
        </div>

        <p className="generator-hint">
          {locationDenied
            ? "Location access is required to generate QR codes"
            : loadingPhase
            ? "Please wait while we prepare your QR code"
            : error
            ? "Tap 'Try Again' to generate a new QR code"
            : generated
            ? "QR code refreshes automatically every minute"
            : "Have your QR code ready to scan"}
        </p>
      </div>

      <style>{`
        .generator-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .generator-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .generator-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #ECECEA;
          background: #fff;
        }
        
        .generator-title {
          font-weight: 700;
          font-size: 16px;
          color: #1A1A1A;
        }
        
        .generator-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #8A8A8A;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.12s;
        }
        
        .generator-close:hover {
          background: #F0F0F0;
        }
        
        .generator-body {
          position: relative;
          width: 100%;
          min-height: 400px;
          background: #fff;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .generator-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #8A8A8A;
          padding: 20px;
          text-align: center;
          font-size: 13px;
        }
        
        .generator-error p {
          max-width: 300px;
          font-weight: 500;
          color: #555;
        }
        
        .generator-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        
        .generator-loading p {
          font-size: 14px;
          font-weight: 600;
          color: #7B1113;
          text-align: center;
        }
        
        .generator-spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #E3E8E4;
          border-top-color: #7FA58F;
          border-radius: 50%;
          animation: qr-spin 0.9s linear infinite;
        }
        
        @keyframes qr-spin {
          to { transform: rotate(360deg); }
        }
        
        .generator-start {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }
        
        .generator-generate-btn {
          padding: 14px 36px;
          border: none;
          background: #14492E;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Montserrat', sans-serif;
          box-shadow: 0 4px 12px rgba(20, 73, 46, 0.3);
        }
        
        .generator-generate-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 6px 20px rgba(20, 73, 46, 0.4);
        }
        
        .generator-generate-btn:active {
          transform: scale(0.97);
        }
        
        .generator-retry-btn {
          padding: 8px 24px;
          border: none;
          background: #14492E;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Montserrat', sans-serif;
        }
        
        .generator-retry-btn:hover {
          background: #1a5c3a;
        }
        
        .qr-display-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        
        .qr-status-badge {
          background: #E4F0E7;
          color: #7FA58F;
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        
        .qr-code-wrapper {
          width: 220px;
          height: 220px;
          border-radius: 8px;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
        
        .qr-progress-container {
          width: 220px;
          max-width: 100%;
        }
        
        .qr-progress {
          height: 6px;
          border-radius: 999px;
          background: #E3E8E4;
          overflow: hidden;
        }
        
        .qr-progress-bar {
          height: 100%;
          background: #7FA58F;
          transition: width 1s linear;
        }
        
        .qr-countdown {
          font-size: 12px;
          font-weight: 600;
          margin-top: 6px;
          text-align: center;
        }
        
        .qr-info-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          max-width: 280px;
          background: #F7F8F6;
          padding: 12px 16px;
          border-radius: 12px;
        }
        
        .qr-info-item {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 500;
        }
        
        .qr-info-label {
          color: #888;
        }
        
        .qr-info-value {
          color: #333;
          text-align: right;
          max-width: 60%;
          word-break: break-all;
        }
        
        .generator-regenerate-btn {
          padding: 10px 32px;
          border: none;
          background: #7FA58F;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Montserrat', sans-serif;
          box-shadow: 0 4px 12px rgba(127, 165, 143, 0.3);
        }
        
        .generator-regenerate-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(127, 165, 143, 0.4);
        }
        
        .generator-regenerate-btn:active {
          transform: translateY(0);
        }
        
        .generator-hint {
          text-align: center;
          font-size: 12px;
          color: #8A8A8A;
          padding: 12px 20px 16px;
          margin: 0;
          font-weight: 500;
          background: #fff;
          line-height: 1.6;
          border-top: 1px solid #ECECEA;
        }

        @media (max-width: 480px) {
          .generator-modal {
            border-radius: 16px;
            max-width: 100%;
          }
          
          .generator-body {
            min-height: 350px;
            padding: 20px 16px;
          }
          
          .qr-code-wrapper {
            width: 180px;
            height: 180px;
          }
          
          .qr-progress-container {
            width: 180px;
          }
          
          .qr-info-grid {
            max-width: 240px;
            padding: 10px 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  )
}