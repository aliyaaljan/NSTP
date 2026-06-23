"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Montserrat } from "next/font/google"
import { QRCodeSVG } from "qrcode.react"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { generateQrToken } from "@/lib/attendance/qr-actions"
import type { QrDisplayInfo } from "@/lib/attendance/qr-actions"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0EFE8",
  cardShadow: "0 3px 10px rgba(0,0,0,0.15)",
  qrBg: "#C8D6D0",
}

type Geo = { latitude: number; longitude: number; accuracy_meter: number }

type GeoFailReason = "denied" | "timeout" | "unavailable" | "unsupported"
type GeoResult = { ok: true; geo: Geo } | { ok: false; reason: GeoFailReason }

function captureGeo(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ ok: false, reason: "unsupported" })
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        ok: true,
        geo: {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy_meter: p.coords.accuracy,
        },
      }),
      (err) => {
        const reason: GeoFailReason =
          err.code === err.PERMISSION_DENIED ? "denied" :
            err.code === err.TIMEOUT ? "timeout" :
              "unavailable"
        resolve({ ok: false, reason })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  })
}

function geoErrorMessage(reason: GeoFailReason): string {
  switch (reason) {
    case "denied":
      return "Location access is off. Enable location for this site in your browser settings, then tap Regenerate."
    case "timeout":
      return "Couldn't get your location in time. Make sure location is on and you have a signal, then tap Regenerate."
    case "unavailable":
      return "Your location is currently unavailable. Make sure location services are on, then tap Regenerate."
    case "unsupported":
      return "This device or browser doesn't support location, which is required to generate a QR."
  }
}

export default function QRGenerationPage() {
  const [generated, setGenerated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [display, setDisplay] = useState<QrDisplayInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [qrHidden, setQrHidden] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState<"locating" | "generating" | null>(null)

  const generatingRef = useRef(false)
  const displayRef = useRef<QrDisplayInfo | null>(null)
  useEffect(() => { displayRef.current = display }, [display])

  // Check geolocation permission state on mount
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        setLocationDenied(status.state === "denied")
        status.addEventListener("change", () => {
          setLocationDenied(status.state === "denied")
        })
      }).catch(() => { })
    }
  }, [])

  // hide QR on visibility/focus loss
  useEffect(() => {
    function onVisChange() { setQrHidden(document.hidden) }
    function onBlur() { setQrHidden(true) }
    function onFocus() { setQrHidden(false) }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "PrintScreen" || (e.key === "s" && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        setQrHidden(true)
        // clipboard write rejects async (e.g. document not focused) — swallow it
        navigator.clipboard?.writeText("")?.catch(() => { })
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

  const runGenerate = useCallback(async (opts?: { silent?: boolean }) => {
    if (generatingRef.current) return
    generatingRef.current = true
    if (!opts?.silent) setLoadingPhase("locating")
    try {
      const result = await captureGeo()
      if (!result.ok) {
        setError(geoErrorMessage(result.reason))
        setToken(null)
        setDisplay(null)
        setGenerated(true)
        return
      }

      if (!opts?.silent) setLoadingPhase("generating")
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
  }, [])

  useEffect(() => {
    if (!generated) return
    const id = setInterval(() => {
      setNow(Date.now())
      const d = displayRef.current
      if (d && new Date(d.expiresAt).getTime() <= Date.now() && !generatingRef.current) {
        runGenerate({ silent: true })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [generated, runGenerate])

  const timeLabel = display
    ? new Date(display.generatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : ""

  const locationLabel = display
    ? `${display.latitude.toFixed(5)}, ${display.longitude.toFixed(5)}`
    : ""

  const remainingMs = display ? Math.max(0, new Date(display.expiresAt).getTime() - now) : 0
  const remainingSec = Math.ceil(remainingMs / 1000)
  const pct = display ? Math.max(0, Math.min(100, (remainingMs / 60000) * 100)) : 0

  return (
    <>
      <style>{`
        .qr-page {
          min-height: 100vh;
          display: flex;
          background: ${C.pageBg};
          font-family: 'Montserrat', sans-serif;
        }

        .qr-main {
          flex: 1;
          margin-left: 120px;
          padding: 28px 32px;
          min-width: 0;
        }

        .qr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .qr-title {
          font-size: 42px;
          font-weight: 800;
          color: ${C.maroon};
          margin: 0;
          letter-spacing: -1px;
        }

        .qr-box {
          background: ${C.qrBg};
          height: 630px;
          border-radius: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .qr-card {
          width: 380px;
          min-height: 500px;
          background: white;
          border-radius: 30px;
          box-shadow: ${C.cardShadow};
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .qr-code {
          width: 220px;
          height: 220px;
          border-radius: 8px;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }

        .qr-spinner {
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


        @media(max-width: 900px){

          .qr-main {
            margin-left: 100px;
            padding: 24px 20px;
          }

          .qr-title {
            font-size: 34px;
          }

          .qr-box {
            height: auto;
            min-height: 550px;
          }

        }


        @media(max-width: 600px){

          .qr-main {
            margin-left: 80px;
            padding: 20px 12px;
          }


          .qr-header {
            gap: 10px;
          }


          .qr-title {
            font-size: 24px;
            letter-spacing: -0.5px;
          }


          .qr-box {
            min-height: 480px;
            padding: 14px;
            border-radius: 16px;
          }


          .qr-card {
            width: 100%;
            min-height: 360px;
            padding: 20px;
            border-radius: 22px;
          }


          .qr-code {
            width: 160px;
            height: 160px;
          }

        }


        @media(max-width: 420px){

          .qr-main {
            margin-left: 70px;
            padding: 16px 10px;
          }


          .qr-title {
            font-size: 20px;
          }


          .qr-card {
            padding: 15px;
          }

        }

      `}</style>


      <div className={`${montserrat.variable} qr-page`}>

        <Sidebar />


        <main className="qr-main">


          <div className="qr-header">

            <h1 className="qr-title">
              QR GENERATION
            </h1>


            <ProfilePill
              name="Kim, Mingyu"
              initials="MK"
              section="H"
            />

          </div>


          <div
            style={{
              height: 2,
              background: "#D9DDD8",
              marginTop: 40,
              marginBottom: 24
            }}
          />


          <div className="qr-box">


            <div className="qr-card">


              {loadingPhase ? (

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                  <div className="qr-spinner" />
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.maroon, textAlign: "center" }}>
                    {loadingPhase === "locating" ? "Getting your location…" : "Generating secure QR…"}
                  </p>
                </div>


              ) : !generated ? (

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  {locationDenied && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.maroon, textAlign: "center", maxWidth: 260 }}>
                      Location access is off. Enable it for this site in your browser settings to generate a QR.
                    </p>
                  )}
                  <button
                    onClick={() => runGenerate()}
                    disabled={locationDenied}
                    style={{
                      background: locationDenied ? "#ccc" : "#7FA58F",
                      border: "none",
                      borderRadius: 40,
                      padding: "18px 38px",
                      fontSize: 22,
                      fontWeight: 800,
                      cursor: locationDenied ? "not-allowed" : "pointer",
                      opacity: locationDenied ? 0.6 : 1,
                    }}
                  >
                    GENERATE QR
                  </button>
                </div>


              ) : error ? (

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.maroon, textAlign: "center", maxWidth: 300 }}>{error}</p>
                  <button
                    onClick={() => runGenerate()}
                    style={{
                      background: "#7FA58F",
                      border: "none",
                      borderRadius: 40,
                      padding: "14px 28px",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    REGENERATE QR
                  </button>
                </div>


              ) : (

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    textAlign: "center",
                  }}
                >

                  <div className="qr-code">
                    {token && !qrHidden && (
                      <QRCodeSVG value={token} size={220} level="M"
                        style={{ width: "100%", height: "100%", display: "block" }} />
                    )}
                    {token && qrHidden && (
                      <div style={{ width: "100%", height: "100%", background: "#000", borderRadius: 8 }} />
                    )}
                  </div>

                  {token && (
                    <div style={{ width: 220, maxWidth: "100%" }}>
                      <div style={{ height: 6, borderRadius: 999, background: "#E3E8E4", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#7FA58F", transition: "width 1s linear" }} />
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, textAlign: "center" }}>Refreshes in {remainingSec}s</p>
                    </div>
                  )}


                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>
                      Location of Generation:
                      <br />
                      {locationLabel || "—"}
                    </p>

                    <p style={{ fontSize: 14, fontWeight: 600 }}>
                      Time of Generation:
                      <br />
                      {timeLabel || "—"}
                    </p>
                  </div>


                  <button
                    onClick={() => runGenerate()}
                    style={{
                      background: "#7FA58F",
                      border: "none",
                      borderRadius: 40,
                      padding: "14px 28px",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    REGENERATE QR
                  </button>


                </div>

              )}

            </div>


          </div>


        </main>

      </div>

    </>
  )
}
