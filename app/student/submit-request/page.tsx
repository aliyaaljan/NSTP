"use client"

import { useState, useEffect, useTransition } from "react"
import { Montserrat } from "next/font/google"
import StudentSidebar from "@/components/shared/StudentSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import {
  submitStudentAppeal,
  type AppealType,
} from "@/lib/student/appeal-actions"
import { IconPencil, IconAlertCircle, IconCheck } from "@tabler/icons-react"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#7B1113",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  border: "#ECECEA",
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  green: "#14492E",
  fieldBg: "#EBEBE8",
}

export default function SubmitRequestPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Roster enrollment context loaded from session profile state
  const [profile, setProfile] = useState({
    enrollmentId: "",
    fullName: "",
    sectionName: "",
  })

  // Explicit form inputs mapped cleanly to db data contracts
  const [appealType, setAppealType] = useState<AppealType>("Absence Excuse")
  const [reason, setReason] = useState("")
  const [timeIn, setTimeIn] = useState("")
  const [timeOut, setTimeOut] = useState("")

  useEffect(() => {
    getStudentDashboard().then((res) => {
      if (!res.ok) return
      setProfile({
        enrollmentId: res.data.enrollmentId ?? "",
        fullName: res.data.fullName,
        sectionName: res.data.sectionName ?? "",
      })
    })
  }, [])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!profile.enrollmentId) {
      setError("No active enrollment token found. You cannot file a request.")
      return
    }

    startTransition(async () => {
      const res = await submitStudentAppeal({
        enrollmentId: profile.enrollmentId,
        appealType,
        reason,
        requestedTimeIn: timeIn ? new Date(timeIn).toISOString() : undefined,
        requestedTimeOut: timeOut ? new Date(timeOut).toISOString() : undefined,
      })

      if (!res.ok) {
        setError(res.error)
      } else {
        setSuccess(true)
        setReason("")
        setTimeIn("")
        setTimeOut("")
      }
    })
  }

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
      <StudentSidebar />
      <main
        style={{
          flex: 1,
          paddingLeft: "122px",
          paddingRight: "32px",
          paddingTop: "28px",
          paddingBottom: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          minWidth: 0,
        }}
      >
        {/* Header Layout Component */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: 800,
                color: C.maroon,
                margin: 0,
              }}
            >
              SUBMIT REQUEST
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: C.textGray,
                margin: "4px 0 0",
                fontWeight: 500,
              }}
            >
              File an adjustment for time records, attendance appeals, or
              scheduling constraints
            </p>
          </div>
          <ProfilePill
            name={profile.fullName || "Loading..."}
            initials={getInitials(profile.fullName)}
            section={profile.sectionName}
          />
        </div>

        {/* Core Request Card */}
        <div
          style={{
            background: C.cardBg,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: "32px",
            maxWidth: "640px",
            width: "100%",
          }}
        >
          <form
            onSubmit={handleFormSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Notification State Banners */}
            {error && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#991B1B",
                  padding: "12px 14px",
                  borderRadius: 8,
                  fontSize: "13px",
                }}
              >
                <IconAlertCircle size={18} /> <span>{error}</span>
              </div>
            )}
            {success && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  background: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  color: "#166534",
                  padding: "12px 14px",
                  borderRadius: 8,
                  fontSize: "13px",
                }}
              >
                <IconCheck size={18} />{" "}
                <span>
                  Your request has been successfully filed to your adviser!
                </span>
              </div>
            )}

            {/* Dropdown Input Selector */}
            <div>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: C.textDark,
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Request Category
              </label>
              <select
                value={appealType}
                onChange={(e) => setAppealType(e.target.value as AppealType)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  background: C.fieldBg,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="Absence Excuse">Absence Excuse Form</option>
                <option value="Hour Adjustment">
                  Log Hour Correction / Adjustment
                </option>
                <option value="Schedule Change">
                  Immersion Slot / Schedule Change
                </option>
              </select>
            </div>

            {/* Conditional Input Rendering for Hour Adjustments */}
            {appealType === "Hour Adjustment" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: C.textDark,
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Requested Time In
                  </label>
                  <input
                    type="datetime-local"
                    value={timeIn}
                    onChange={(e) => setTimeIn(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: "14px",
                      background: C.fieldBg,
                      border: "none",
                      borderRadius: 6,
                      padding: "12px 14px",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: C.textDark,
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    Requested Time Out
                  </label>
                  <input
                    type="datetime-local"
                    value={timeOut}
                    onChange={(e) => setTimeOut(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: "14px",
                      background: C.fieldBg,
                      border: "none",
                      borderRadius: 6,
                      padding: "12px 14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Text Description Box Component */}
            <div>
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: C.textDark,
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Justification & Narrative Details
              </label>
              <textarea
                required
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a comprehensive narrative explanation or cite medical/university constraints to support your facilitator's review process..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  background: C.fieldBg,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Action Form Footer Call-to-action */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "4px",
              }}
            >
              <button
                type="submit"
                disabled={isPending}
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  background: C.maroon,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  cursor: isPending ? "not-allowed" : "pointer",
                  opacity: isPending ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IconPencil size={16} />
                {isPending ? "Filing Request..." : "File Request"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
