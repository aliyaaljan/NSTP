'use client'

import { useState, useEffect, useRef } from 'react'
import { ScanLine, VideoOff, Camera, CameraOff, Calendar, Clock } from 'lucide-react'
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"

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
  pageBg: "#F0EFE8",
  cardBg: "#FFFFFF",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
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

// hindi pa me sure anoo other status
type ScanStatus = 'On Time' | 'Late'

type Scan = {
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  status: ScanStatus
}

// basis for now: 15 mins is late
// hardcoded student data
const SCAN_HISTORY: Scan[] = [
  { name: 'Rhona Lope', date: '2026-06-23', generatedTime: '7:45 AM', scannedTime: '8:00 AM', status: 'On Time' },
  { name: 'Janine Tulic', date: '2026-06-23', generatedTime: '7:50 AM', scannedTime: '8:04 AM', status: 'On Time' },
  { name: 'Aliya Mendoza', date: '2026-06-23', generatedTime: '7:58 AM', scannedTime: '8:05 AM', status: 'On Time' },
  { name: 'Jaerish Rabang', date: '2026-06-23', generatedTime: '8:02 AM', scannedTime: '9:15 AM', status: 'Late' },
  { name: 'Charles Joaquin', date: '2026-06-23', generatedTime: '7:48 AM', scannedTime: '7:50 AM', status: 'On Time' },
  { name: 'Axel Valido', date: '2026-06-23', generatedTime: '7:52 AM', scannedTime: '8:03 AM', status: 'On Time' },
  { name: 'Saffi Limbaro', date: '2026-06-23', generatedTime: '8:05 AM', scannedTime: '8:30 AM', status: 'Late' },
]

const STATUS_STYLES: Record<ScanStatus, { color: string; bg: string }> = {
  'On Time': { color: '#15803d', bg: '#dcfce7' },
  'Late': { color: '#854d0e', bg: '#fef9c3' },
}

function r<T>(isMobile: boolean, mobileValue: T, desktopValue: T): T {
  return isMobile ? mobileValue : desktopValue
}

// getUserMedia logic
function useCamera(enabled: boolean) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let active = true

    async function openCamera() {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      if (!enabled) {
        setReady(false)
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setReady(true)
        setError(null)
      } catch (err) {
        const denied = err instanceof DOMException && err.name === 'NotAllowedError'
        setError(
          denied
            ? 'Camera access was denied. Please allow camera permissions.'
            : 'Unable to access camera. Check that a camera is connected.'
        )
        setReady(false)
      }
    }

    openCamera()

    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [enabled])

  return { videoRef, ready, error }
}

// Time
function useClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return {
    date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

// useIsMobile for responsivenwss
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

// Page
export default function LeaderScannerPage() {
  const isMobile = useIsMobile()
  const { date: formattedDate, time: formattedTime } = useClock()

  const [cameraEnabled, setCameraEnabled] = useState(false)
  const { videoRef, ready: cameraReady, error: cameraError } = useCamera(cameraEnabled)

  const [scanning, setScanning] = useState(false)

  function simulateScan() {
    if (!cameraReady) return
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      console.log('Scan simulated - no change to history')
    }, 900)
  }

  const leftPadding = isMobile
    ? `${COLLAPSED_W + RAIL_MARGIN * 2 + 12}px`
    : `${COLLAPSED_W + RAIL_MARGIN * 2}px`

  return (
    <div
      className={montserrat.variable}
      style={{ fontFamily: "'Montserrat', sans-serif", background: C.pageBg, minHeight: "100vh", display: "flex" }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          paddingLeft: leftPadding,
          paddingRight: r(isMobile, "16px", "32px"),
          paddingTop: r(isMobile, "16px", "28px"),
          paddingBottom: r(isMobile, "16px", "28px"),
          display: "flex",
          flexDirection: "column",
          gap: r(isMobile, "16px", "20px"),
          minWidth: 0,
          width: "100%",
          maxWidth: "100%",
          transition: "padding 0.3s ease",
        }}
      >
        <PageHeader isMobile={isMobile} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
            gap: r(isMobile, "16px", "20px"),
            width: "100%",
            alignItems: "stretch",
          }}
        >
          <CameraPanel
            isMobile={isMobile}
            videoRef={videoRef}
            cameraEnabled={cameraEnabled}
            cameraReady={cameraReady}
            cameraError={cameraError}
            scanning={scanning}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            onToggleCamera={() => setCameraEnabled(v => !v)}
            onScan={simulateScan}
          />

          <ScanLogPanel isMobile={isMobile} scans={SCAN_HISTORY} />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </div>
  )
}

// Page Header
function PageHeader({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
      <h1
        style={{
          fontSize: r(isMobile, "clamp(20px, 5vw, 28px)", "clamp(24px, 2.5vw, 30px)"),
          fontWeight: 800,
          color: C.maroon,
          margin: 0,
        }}
      >
        Scanner
      </h1>
      <ProfilePill name="Kim, Mingyu" initials="MK" section="H" />
    </div>
  )
}

// Cam Panel
type CameraPanelProps = {
  isMobile: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  cameraEnabled: boolean
  cameraReady: boolean
  cameraError: string | null
  scanning: boolean
  formattedDate: string
  formattedTime: string
  onToggleCamera: () => void
  onScan: () => void
}

function CameraPanel({
  isMobile,
  videoRef,
  cameraEnabled,
  cameraReady,
  cameraError,
  scanning,
  formattedDate,
  formattedTime,
  onToggleCamera,
  onScan,
}: CameraPanelProps) {
  const showLiveOverlay = cameraEnabled && cameraReady && !cameraError

  return (
    <div
      style={{
        background: C.cardBg,
        borderRadius: "14px",
        border: `1px solid ${C.border}`,
        boxShadow: C.cardShadow,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: r(isMobile, 300, 550),
      }}
    >
      <div
        style={{
          position: "relative",
          background: cameraEnabled ? "#000" : "rgba(45, 106, 79, 0.2)",
          flex: 1,
          minHeight: r(isMobile, 250, 480),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: cameraReady ? "block" : "none",
          }}
        />

        {cameraReady && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />}

        {showLiveOverlay && (
          <ClockBadge isMobile={isMobile} formattedDate={formattedDate} formattedTime={formattedTime} />
        )}

        {!cameraEnabled && <CameraOffNotice isMobile={isMobile} />}

        {cameraError && cameraEnabled && <CameraErrorNotice isMobile={isMobile} message={cameraError} />}

        {showLiveOverlay && <ScanFrame isMobile={isMobile} scanning={scanning} />}

        {cameraEnabled && !cameraReady && !cameraError && <CameraLoadingSpinner isMobile={isMobile} />}
      </div>

      <CameraControls
        isMobile={isMobile}
        cameraEnabled={cameraEnabled}
        cameraReady={cameraReady}
        scanning={scanning}
        onToggleCamera={onToggleCamera}
        onScan={onScan}
      />
    </div>
  )
}

function ClockBadge({
  isMobile,
  formattedDate,
  formattedTime,
}: {
  isMobile: boolean
  formattedDate: string
  formattedTime: string
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
        background: "rgba(0,0,0,0.4)",
        padding: r(isMobile, "6px 12px", "8px 14px"),
        borderRadius: "10px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.9)", fontSize: r(isMobile, "10px", "13px"), fontWeight: 500 }}>
        <Calendar size={r(isMobile, 11, 14)} />
        <span>{formattedDate}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.9)", fontSize: r(isMobile, "12px", "16px"), fontWeight: 600 }}>
        <Clock size={r(isMobile, 12, 16)} />
        <span>{formattedTime}</span>
      </div>
    </div>
  )
}

function CameraOffNotice({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "rgba(45, 106, 79, 0.8)", padding: "0 24px", textAlign: "center", zIndex: 1 }}>
      <CameraOff size={r(isMobile, 40, 48)} style={{ color: "rgba(45, 106, 79, 0.6)" }} />
      <p style={{ fontSize: r(isMobile, 13, 14), margin: 0, fontWeight: 600, color: "rgba(45, 106, 79, 0.9)" }}>
        Camera is turned off
      </p>
      <p style={{ fontSize: r(isMobile, 11, 12), margin: 0, opacity: 0.7, color: "rgba(45, 106, 79, 0.7)" }}>
        Enable camera to start scanning
      </p>
    </div>
  )
}

function CameraErrorNotice({ isMobile, message }: { isMobile: boolean; message: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", padding: "0 24px", textAlign: "center", zIndex: 1 }}>
      <VideoOff size={28} />
      <p style={{ fontSize: r(isMobile, 11, 12), margin: 0 }}>{message}</p>
    </div>
  )
}

function CameraLoadingSpinner({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1 }}>
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid rgba(255,255,255,0.2)`,
          borderTop: `3px solid ${C.gold}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ fontSize: r(isMobile, 11, 12), color: 'rgba(255,255,255,0.6)' }}>
        Requesting camera access…
      </p>
    </div>
  )
}

const FRAME_CORNERS = [
  { top: -3, left: -3, borderTop: '3px solid white', borderLeft: '3px solid white', width: 24, height: 24 },
  { top: -3, right: -3, borderTop: '3px solid white', borderRight: '3px solid white', width: 24, height: 24 },
  { bottom: -3, left: -3, borderBottom: '3px solid white', borderLeft: '3px solid white', width: 24, height: 24 },
  { bottom: -3, right: -3, borderBottom: '3px solid white', borderRight: '3px solid white', width: 24, height: 24 },
]

function ScanFrame({ isMobile, scanning }: { isMobile: boolean; scanning: boolean }) {
  const size = r(isMobile, 160, 220)

  return (
    <>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          border: `3px solid ${scanning ? C.gold : 'rgba(255,255,255,0.6)'}`,
          borderRadius: 16,
          transition: 'border-color 0.2s, transform 0.3s ease',
          zIndex: 1,
          transform: scanning ? 'scale(1.02)' : 'scale(1)',
          boxShadow: scanning ? `0 0 30px ${C.gold}33` : 'none',
        }}
      >
        {FRAME_CORNERS.map((corner, i) => (
          <span key={i} style={{ position: "absolute", ...corner }} />
        ))}
        <ScanLine
          size={r(isMobile, 28, 40)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: scanning ? C.gold : 'rgba(255,255,255,0.7)',
            transition: 'color 0.2s, transform 0.3s ease',
            animation: scanning ? 'pulse 0.8s ease-in-out infinite' : 'none',
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -20,
            background: `radial-gradient(circle, ${C.gold}11, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      </div>
      <p
        style={{
          position: "absolute",
          bottom: r(isMobile, 16, 24),
          fontSize: r(isMobile, '10px', '14px'),
          color: 'rgba(255,255,255,0.85)',
          zIndex: 1,
          fontWeight: 500,
          background: 'rgba(0,0,0,0.3)',
          padding: r(isMobile, '6px 12px', '8px 16px'),
          borderRadius: '20px',
          backdropFilter: 'blur(4px)',
          textAlign: 'center',
          maxWidth: '90%',
        }}
      >
        {scanning ? 'Reading QR Code...' : 'Align QR code within the frame'}
      </p>
    </>
  )
}

function CameraControls({
  isMobile,
  cameraEnabled,
  cameraReady,
  scanning,
  onToggleCamera,
  onScan,
}: {
  isMobile: boolean
  cameraEnabled: boolean
  cameraReady: boolean
  scanning: boolean
  onToggleCamera: () => void
  onScan: () => void
}) {
  const scanDisabled = scanning || !cameraReady || !cameraEnabled

  return (
    <div style={{ padding: r(isMobile, "10px 14px", "16px 20px"), borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button
        onClick={onToggleCamera}
        style={{
          padding: r(isMobile, "8px 12px", "12px 16px"),
          borderRadius: "10px",
          fontSize: r(isMobile, "12px", "14px"),
          fontWeight: 600,
          color: "#fff",
          border: "none",
          cursor: "pointer",
          background: cameraEnabled ? C.maroon : C.green,
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          flex: isMobile ? "1 1 auto" : "0 0 auto",
          minWidth: isMobile ? "auto" : "120px",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)"
          e.currentTarget.style.opacity = "0.9"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)"
          e.currentTarget.style.opacity = "1"
        }}
      >
        {cameraEnabled ? <Camera size={r(isMobile, 16, 18)} /> : <CameraOff size={r(isMobile, 16, 18)} />}
        {cameraEnabled ? 'Turn Off' : 'Turn On'}
      </button>

      <button
        onClick={onScan}
        disabled={scanDisabled}
        style={{
          flex: 1,
          padding: r(isMobile, "8px 12px", "12px"),
          borderRadius: "10px",
          fontSize: r(isMobile, "12px", "14px"),
          fontWeight: 600,
          color: "#fff",
          border: "none",
          cursor: scanDisabled ? "not-allowed" : "pointer",
          background: C.green,
          opacity: scanDisabled ? 0.6 : 1,
          transition: "all 0.2s ease",
          minWidth: isMobile ? "auto" : "100px",
        }}
      >
        {scanning ? 'Scanning…' : cameraReady ? 'Scan QR' : 'Waiting for camera…'}
      </button>
    </div>
  )
}

// Scan Hisotry
function ScanLogPanel({ isMobile, scans }: { isMobile: boolean; scans: Scan[] }) {
  const columns = isMobile ? "1.2fr 1fr 0.8fr" : "1.5fr 1fr 0.8fr"

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
        minHeight: r(isMobile, 300, 550),
        maxHeight: r(isMobile, 400, 550),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: r(isMobile, "10px 14px", "14px 20px"),
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <span style={{ fontSize: r(isMobile, "13px", "15px"), fontWeight: 700, color: C.textDark }}>Scan History</span>
        <span
          style={{
            fontSize: r(isMobile, "11px", "12px"),
            fontWeight: 700,
            color: "#fff",
            background: C.maroon,
            padding: "2px 10px",
            borderRadius: "12px",
          }}
        >
          {scans.length}
        </span>
      </div>

      <div style={{ padding: r(isMobile, "6px 14px", "8px 20px"), background: '#FFFFFF', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: r(isMobile, "11px", "13px"), fontWeight: 600, color: C.textDark }}>
          {scans[0]?.date ?? '2026-06-23'}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          padding: r(isMobile, "4px 14px", "6px 20px"),
          background: C.pageBg,
          borderBottom: `1px solid ${C.border}`,
          gap: r(isMobile, "6px", "12px"),
        }}
      >
        <HeaderCell isMobile={isMobile}>Student</HeaderCell>
        <HeaderCell isMobile={isMobile} align="center">Time</HeaderCell>
        <HeaderCell isMobile={isMobile} align="right">Status</HeaderCell>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {scans.map((scan, i) => (
          <ScanRow key={`${scan.name}-${i}`} isMobile={isMobile} scan={scan} columns={columns} isLast={i === scans.length - 1} />
        ))}
      </div>
    </div>
  )
}

function HeaderCell({
  isMobile,
  align = "left",
  children,
}: {
  isMobile: boolean
  align?: "left" | "center" | "right"
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        fontSize: r(isMobile, "8px", "10px"),
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: C.textGray,
        textAlign: align,
      }}
    >
      {children}
    </span>
  )
}

function ScanRow({
  isMobile,
  scan,
  columns,
  isLast,
}: {
  isMobile: boolean
  scan: Scan
  columns: string
  isLast: boolean
}) {
  const { color, bg } = STATUS_STYLES[scan.status]

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        alignItems: "center",
        padding: r(isMobile, "8px 14px", "10px 20px"),
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        gap: r(isMobile, "6px", "12px"),
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: r(isMobile, "11px", "13px"), fontWeight: 600, color: C.textDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {scan.name}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
        <TimeLine isMobile={isMobile} label="Generated:" value={scan.generatedTime} />
        <TimeLine isMobile={isMobile} label="Scanned:" value={scan.scannedTime} />
      </div>

      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: r(isMobile, "9px", "11px"),
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            background: bg,
            color: color,
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {scan.status}
        </span>
      </div>
    </div>
  )
}

function TimeLine({ isMobile, label, value }: { isMobile: boolean; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: r(isMobile, "9px", "11px"), color: C.textGray }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "monospace", fontWeight: 500, color: C.textDark }}>{value}</span>
    </div>
  )
}