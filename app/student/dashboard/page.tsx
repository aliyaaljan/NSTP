"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Montserrat } from "next/font/google"
import { signOutWithAudit } from "@/lib/auth-actions"
import Sidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  green: '#14492E',
  maroon:      "#7B1113",
  maroonDark:  "#6B0D10",
  gold:        "#C8A84B",
  goldBg:      "#FFF3CD",
  goldText:    "#4A2C00",
  pageBg:      "#F0EFE8",
  cardBg:      "#FFFFFF",
  cardShadow:  "0 1px 4px rgba(0,0,0,0.06)",
  border:      "#ECECEA",
  hoursBg:     "#E8EDE5",
  hoursBorder: "#C5D4BC",
  track:       "#D4D9CC",
  textDark:    "#2C2C2A",
  textGray:    "#8C8C88",
  textMuted:   "#C8C8C4",
  textSub:     "#5A5A58",
  iconBg: "#F8DCDD",
}

const COLLAPSED_W  = 88
const EXPANDED_W   = 256
const RAIL_MARGIN  = 16

interface StudentDashboardProps {
  studentFirstName: string
  studentLastName: string
  studentInitials: string
  section: string
  hoursRendered: number
  hoursTarget: number
}

// HOURS FUNCTION --------------- 

function HoursCard({ rendered, target }: { rendered: number; target: number }) {
  const percent = Math.min(100, Math.round((rendered / target) * 100)) 
  return (
    <div style={{ background: C.hoursBg, borderRadius: 14, padding: "18px 22px", border: `1.5px solid ${C.hoursBorder}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
        Hours Accomplished:&nbsp;
        <span style={{ fontWeight: 800 }}>{rendered} / {target} hours</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark, minWidth: 36 }}>{percent}%</span>
        <div style={{ flex: 1, height: 22, background: C.track, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${percent}%`, height: "100%", background: C.gold, borderRadius: 4, transition: "width 0.4s ease" }} />
        </div>
      </div>
    </div>
  )
}

//INSERT CALENDAR ANF DOCUMENTS FUNCTIONS

// MAIN PAGE -------------------------------

export default function StudentDashboardPage({
  studentFirstName = "Mingyu",
  studentLastName = "Kim",
  studentInitials = "MK",
  section = "H",
  hoursRendered = 395,
  hoursTarget = 500,

}: Partial<StudentDashboardProps>) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  useEffect(() => {
  const accepted = localStorage.getItem("privacyAccepted")
  setShowPrivacyModal(accepted !== "true")
}, [])

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: C.pageBg,
        minHeight: "100vh",
        display: "flex",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          marginLeft: COLLAPSED_W + RAIL_MARGIN * 2,
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          minWidth: 0,
        }}
      >
        {/* header ?? */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: C.maroon, margin: 0 }}>
            Hello, {studentFirstName}!
          </h1>
          <ProfilePill name={`${studentLastName}, ${studentFirstName}`} initials={studentInitials} section={section} />
        </div>

        <HoursCard rendered={hoursRendered} target={hoursTarget} />

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {/* INSERT CALENDAR */}

          {/* INSERT DOCUMENTS */}
        </div>

        {/* MODAL */}
        {showPrivacyModal && (
          <>
            {/* blurred background */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(6px)",
                zIndex: 999,
              }}
            />

            {/* modal proper */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  width: 600,
                  background: C.maroon,
                  borderRadius: 28,
                  padding: "18px 22px 20px",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                  }}
                >
                  DATA PRIVACY AGREEMENT
                </div>

                {/* contents */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 26,
                    padding: 20,
                    minHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  <p style={{ fontSize: 15, lineHeight: 2, marginBottom: 20, }}>
                    By continuing to use this system, you acknowledge and consent to the collection, processing, and storage of your personal information in accordance with the Data Privacy Act of 2012.
                  </p>

                  <p style={{ fontSize: 15, lineHeight: 1.7 }}>
                    Your information will only be used for NSTP-related transactions and academic requirements.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 14,
                  }}
                >
                  <button
                    onClick={() => {
                      localStorage.setItem("privacyAccepted", "true")
                      setShowPrivacyModal(false)
                    }}
                    style={{
                      background: C.green,
                      color: "#fff",
                      border: "1px solid #C6C6C6",
                      borderRadius: 999,
                      padding: "6px 18px",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    I agree
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
