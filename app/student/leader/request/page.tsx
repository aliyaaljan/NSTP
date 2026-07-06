//hi po hehe may mga red (errors) pa sha pero working po 'yang code wahahaha

"use client"

import { useEffect, useState, useTransition } from "react"
import { Montserrat } from "next/font/google"
import Sidebar from "@/components/shared/StudentLeaderSidebar"
import ProfilePill from "@/components/shared/StudentProfilePill"
import { getStudentDashboard } from "@/lib/student/dashboard-actions"
import { getInitials } from "@/lib/student/dashboard-view"
import {
  getStudentRequests,
  submitStudentRequest,
  updateStudentRequest,
} from "@/lib/student/appeal-actions"
import { createClient } from "@/lib/client"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const C = {
  maroon: "#6B1A1A",
  green: "#1A3C2A",
  gold: "#C8963C",
  pageBg: "#F0EFE8",
  border: "#D9D9D9",
  textDark: "#2C2C2A",
  textMuted: "#7A7A7A",

  approved: {
    bg: "#C8D8C0",
    text: "#2D5C3A",
    border: "#8AAE8A",
    icon: "#3A7A4A",
  },

  review: {
    bg: "#F5E6C0",
    text: "#8B5E1A",
    border: "#D4A840",
    icon: "#C8882A",
  },

  declined: {
    bg: "#D4B8B8",
    text: "#6B1A1A",
    border: "#B08080",
    icon: "#8B3A3A",
  },
}

interface RequestItem {
  id: string
  title: string
  status:"Pending Review" | "Under Review" |  "Approved" | "Declined" | "Rejected"
  type: string
  body: string
  note: string
  date: string
  lastEdited?: string | null
  attachment?: string | null
}

function StatusBadge({ status }: { status: RequestItem["status"] }) {
  const map = {
    Approved: {
      ...C.approved,
      icon: "ti-circle-check",
    },

    "Pending Review": { 
      ...C.review, 
      icon: "ti-hourglass" 
    },

    "Under Review": {
      ...C.review,
      icon: "ti-clock",
    },

    Declined: {
      ...C.declined,
      icon: "ti-circle-x",
    },
    Rejected: {
      ...C.declined,
      icon: "ti-circle-x",
    },
  }

  const s = map[status] || map["Under Review"]

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <i
        className={`ti ${s.icon}`}
        style={{
          fontSize: 14,
          color: s.icon,
        }}
      />
      {/* If status is database 'Rejected', show 'Declined' visually to the student */}
      {status === "Rejected" ? "Declined" : status}
    </span>
  )
}

function StatCard({
  label,
  count,
  status,
  active,
  onClick,
}: {
  label: string
  count: number
  status:  "Pending Review" | "Approved" | "Under Review" | "Declined"
  active: boolean
  onClick: () => void
}) {
  const map = {
    Approved: C.approved,
    "Pending Review": C.review,
    "Under Review": C.review,
    Declined: C.declined,
  }

  const s = map[status]
  const icons = {
    Approved: "ti-circle-check",
    "Pending Review": "ti-hourglass",
    "Under Review": "ti-clock",
    Declined: "ti-circle-x",
  }
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? C.pageBg : "#FFFFFF",
        border: `1px solid ${s.border}`,
        borderRadius: 22,
        padding: "22px 24px",
        minWidth: 150,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "0.2s ease",
        cursor: "pointer",
        transform: active ? "translateY(-3px)" : "none",
        boxShadow: active
          ? "0 12px 25px rgba(0,0,0,.12)"
          : "0 8px 20px rgba(0,0,0,.05)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: s.text,
            marginBottom: 8,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: C.textDark,
            lineHeight: 1,
          }}
        >
          {count}
        </div>
      </div>

      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: s.bg,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 22,
          fontWeight: 800,
          color: s.icon,
        }}
      >
        <i
          className={`ti ${icons[status]}`}
          style={{
            fontSize: 22,
            color: s.icon,
          }}
        />
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null
  )
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")
  const [formFile, setFormFile] = useState<File | null>(null)
  const [editFile, setEditFile] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("All")

  const [isPending, startTransition] = useTransition() // for loading states
  const [requests, setRequests] = useState<RequestItem[]>([]) // empty array

  const [requestType, setRequestTypes] = useState<
    { appeal_type_id: string; name: string }[]
  >([])
  const [formTypeId, setFormTypeId] = useState<string>("")
  const [editTypeId, setEditTypeId] = useState<string>("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")

  const [profile, setProfile] = useState({
    enrollmentId: "",
    fullName: "",
    sectionName: "",
  })

  // fetch profile and requests on load
  const loadRequests = async (enrollmentId: string) => {
    const res = await getStudentRequests(enrollmentId)
    if (res.ok) setRequests(res.data)
  }

  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    // Fetch dynamic request/appeal types from DB
    supabase
      .from("appeal_type")
      .select("appeal_type_id, name")
      .order("name")
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("appeal_type fetch error:", error.message)
          return
        }
        if (data) {
          setRequestTypes(data)
          if (data.length > 0) setFormTypeId(data[0].appeal_type_id)
        }
      })

    getStudentDashboard().then((res) => {
      if (cancelled || !res.ok) return
      setProfile({
        enrollmentId: res.data.enrollmentId ?? "",
        fullName: res.data.fullName,
        sectionName: res.data.sectionName ?? "",
      })
      if (res.data.enrollmentId) loadRequests(res.data.enrollmentId)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = {
    Approved: requests.filter((r) => r.status === "Approved").length,
    "Pending Review": requests.filter((r) => r.status === "Pending Review").length,
    "Under Review": requests.filter((r) => r.status === "Under Review").length,
    Declined: requests.filter(
      (r) => r.status === "Declined" || r.status === "Rejected"
    ).length,
  }

  function handleSubmit() {
    if (
      !formTitle.trim() ||
      !formBody.trim() ||
      !profile.enrollmentId ||
      !formTypeId
    )
      return

    const selectedTypeObj = requestType.find(
      (t) => t.appeal_type_id === formTypeId
    )
    const typeName = selectedTypeObj ? selectedTypeObj.name : "Others"

    startTransition(async () => {
      const res = await submitStudentRequest(
        profile.enrollmentId,
        formTypeId,
        typeName,
        formTitle,
        formBody
      )

      if (res.ok) {
        await loadRequests(profile.enrollmentId)
        setFormTitle("")
        setFormBody("")
        setFormFile(null)
        setShowModal(false)
        alert("Request submitted successfully!")
      } else {
        alert(res.error)
      }
    })
  }

  function hasChanges() {
    if (!selectedRequest) return false
    return (
      editTitle.trim() !== selectedRequest.title.trim() ||
      editBody.trim() !== selectedRequest.body.trim()
    )
  }
  function handleEditSave() {
    if (!profile.enrollmentId || !selectedRequest || !editTypeId) return

    const selectedTypeObj = requestType.find(
      (t) => t.appeal_type_id === editTypeId
    )
    const typeName = selectedTypeObj ? selectedTypeObj.name : "Others"

    startTransition(async () => {
      const cleanBody = editBody.replace(/^Request:\s*/, "")

      const res = await updateStudentRequest(
        selectedRequest.id,
        editTypeId,
        typeName,
        editTitle,
        cleanBody
      )
      if (res.ok) {
        await loadRequests(profile.enrollmentId)
        setSelectedRequest(null)
      } else {
        alert("Failed to update request or it is no longer 'Pending Review'.")
      }
    })
  }

  return (
    <>
      <style>{`

        .requests-page{
          min-height:100vh;
          display:flex;
          background:${C.pageBg};
          font-family:'Montserrat',sans-serif;
        }

        .requests-main{
        flex:1;
        margin-left:120px;
        padding:34px 40px;
        min-width:0;
        }

        .requests-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        .requests-maintitle{
        margin:0;
        font-size:42px;
        font-weight:800;
        color:${C.maroon};
        letter-spacing:-1.5px;
        }

        .divider{
          height:2px;
          background:#D9DDD8;
          margin-top:10px;
          margin-bottom:24px;
        }

        .stats{
          display:flex;
          gap:18px;
          margin-bottom:24px;
        }

        .request-card{
        background:white;
        border-radius:26px;
        border:1px solid #E2E2E2;
        overflow:hidden;
        position:relative;
        box-shadow:0 10px 30px rgba(0,0,0,.06);
        }

        .request-item{
        padding:24px 30px;
        border-bottom:1px solid #EEEEEE;
        transition:.2s ease;
        }

        .request-item:hover{
        background:#FCFBF7;
        }

        .request-top{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:20px;
        margin-bottom:8px;
        }

        .request-title{
          font-size:17px;
          font-weight:700;
          color:${C.textDark};
        }

        .request-body{
          font-size:14px;
          line-height:1.7;
          color:#444;
          margin-bottom:8px;
        }

        .request-note{
          font-size:13px;
          color:${C.textMuted};
          font-style:italic;
        }

        .request-header{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:16px;
        }


        .request-header h2{
        margin:0;
        font-size:20px;
        font-weight:800;
        color:${C.textDark};
        }

        .send-btn{
        height:48px;
        padding:0 22px;
        background:${C.green};
        color:white;
        border:none;
        border-radius:14px;
        font-family:inherit;
        font-size:14px;
        font-weight:800;
        cursor:pointer;

        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;

        box-shadow:0 8px 18px rgba(26,60,42,.25);

        transition:.25s ease;
        }

        .send-btn:hover{
        transform:translateY(-2px);
        background:#24563D;
        box-shadow:0 12px 25px rgba(26,60,42,.3);
        }

      `}</style>

      <div className={`${montserrat.variable} requests-page`}>
        <Sidebar />

        <main className="requests-main">
          <div className="requests-header">
            <h1 className="requests-maintitle">REQUESTS</h1>

            <ProfilePill
              name={profile.fullName}
              initials={getInitials(profile.fullName)}
              section={profile.sectionName}
            />
          </div>

          <div className="divider" />

          <div className="stats">
            <StatCard
              label="Pending Review"
              count={counts["Pending Review"]}
              status="Pending Review"
              active={activeFilter === "Pending Review"}
              onClick={() =>
                setActiveFilter(activeFilter === "Pending Review" ? "All" : "Pending Review")
              }
            />

            <StatCard
              label="Under Review"
              count={counts["Under Review"]}
              status="Under Review"
              active={activeFilter === "Under Review"}
              onClick={() =>
                setActiveFilter(
                  activeFilter === "Under Review" ? "All" : "Under Review"
                )
              }
            />

            <StatCard
              label="Approved"
              count={counts.Approved}
              status="Approved"
              active={activeFilter === "Approved"}
              onClick={() =>
                setActiveFilter(
                  activeFilter === "Approved" ? "All" : "Approved"
                )
              }
            />

            <StatCard
              label="Declined"
              count={counts.Declined}
              status="Declined"
              active={activeFilter === "Declined"}
              onClick={() =>
                setActiveFilter(
                  activeFilter === "Declined" ? "All" : "Declined"
                )
              }
            />
          </div>

          <div className="request-header">
            <h2>
              {activeFilter === "All"
                ? "Recent Requests"
                : `${activeFilter} Requests`}
            </h2>

            <button className="send-btn" onClick={() => setShowModal(true)}>
              <span style={{ fontSize: 20 }}>+</span>
              Send Request
            </button>
          </div>

          <div className="request-card">
            {requests
              .filter((request) =>
                activeFilter === "All" ? true : request.status === activeFilter
              )
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .map((request) => {
                const statusColor =
                  request.status === "Approved"
                    ? C.approved.icon
                    : request.status === "Declined" ||
                      request.status === "Rejected"
                    ? C.declined.icon
                    : C.review.icon

                return (
                  <div
                    key={request.id}
                    className="request-item"
                    onClick={() => {
                      setSelectedRequest(request)
                      setEditTitle(request.title)
                      setEditBody(request.body)
                      setEditFile(request.attachment ?? null)

                      // Find the UUID that matches string name
                      const matchingType = requestType.find(
                        (t) => t.name === request.type
                      )
                      setEditTypeId(
                        matchingType
                          ? matchingType.appeal_type_id
                          : requestType[0]?.appeal_type_id || ""
                      )
                    }}
                    style={{
                      position: "relative",
                      paddingLeft: 34,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 26,
                        width: 6,
                        height: "55%",
                        background: statusColor,
                        borderRadius: 10,
                      }}
                    />

                    <div className="request-top">
                      <div>
                        <div className="request-title">{request.title}</div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "#999",
                            marginTop: 3,
                          }}
                        >
                          Submitted {request.date}
                        </div>
                      </div>

                      <StatusBadge status={request.status} />
                    </div>

                    <div className="request-body">{request.body}</div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#F6F5EF",
                        padding: "7px 12px",
                        borderRadius: 12,
                        fontSize: 12.5,
                        color: C.textMuted,
                      }}
                    >
                      {request.note}
                    </div>
                  </div>
                )
              })}
          </div>
        </main>
      </div>

      {/* modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            fontFamily: "var(--font-montserrat), sans-serif",
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 32px 28px",
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: 20,
                fontWeight: 800,
                color: C.maroon,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Send Request / Concern
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Request Category
              </label>

              <select
                value={formTypeId}
                onChange={(e) => setFormTypeId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 14,
                }}
              >
                {requestType.length === 0 ? (
                  <option value="">Loading categories...</option>
                ) : (
                  requestType.map((t) => (
                    <option key={t.appeal_type_id} value={t.appeal_type_id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter request title"
                maxLength={50}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Details
              </label>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Describe your request or concern..."
                rows={4}
                maxLength={500}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  fontSize: 12,
                  color: C.textMuted,
                  textAlign: "right",
                  marginTop: 5,
                }}
              >
                {formBody.length}/500
              </div>
              <div style={{ marginTop: 16 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#555",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Attachment (Optional)
                </label>

                <label
                  style={{
                    width: "100%",
                    height: 120,
                    border: "2px dashed #C9C9C9",
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "#FAFAF7",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.green,
                    }}
                  >
                    Drop your file here
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 4,
                    }}
                  >
                    or click to browse
                  </span>

                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormFile(e.target.files[0])
                      }
                    }}
                  />
                </label>

                {formFile && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "#F6F5EF",
                      fontSize: 12,
                      color: C.textDark,
                    }}
                  >
                    {formFile.name}
                  </div>
                )}
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "1px solid #D9D9D9",
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: C.textDark,
                  transition: ".2s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !formTitle.trim() || !formBody.trim()}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    !formTitle.trim() || !formBody.trim() ? "#BDBDBD" : C.green,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    !formTitle.trim() || !formBody.trim()
                      ? "not-allowed"
                      : "pointer",
                  letterSpacing: 0.5,
                  opacity: !formTitle.trim() || !formBody.trim() ? 0.7 : 1,
                }}
              >
                {isPending ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRequest(null)
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 32,
              width: "90%",
              maxWidth: 520,
              fontFamily: "var(--font-montserrat), sans-serif",
            }}
          >
            <h2
              style={{
                color: C.maroon,
                fontWeight: 800,
                marginBottom: 20,
              }}
            >
              Request Details
            </h2>

            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#555",
                display: "block",
                marginBottom: 6,
              }}
            >
              Request Category
            </label>
            <select
              value={editTypeId}
              onChange={(e) => setEditTypeId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 16,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {requestType.length === 0 ? (
                <option value="">Loading types...</option>
              ) : (
                requestType.map((t) => (
                  <option key={t.appeal_type_id} value={t.appeal_type_id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>

            <label>Title</label>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={50}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ccc",
                marginBottom: 16,
              }}
            />

            <label>Details</label>

            <textarea
              value={editBody}
              disabled={selectedRequest.status !== "Pending Review"}
              onChange={(e) => setEditBody(e.target.value)}
              rows={5}
              maxLength={500}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #ccc",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                fontSize: 12,
                color: C.textMuted,
                textAlign: "right",
                marginTop: 2,
                marginBottom: 10,
              }}
            >
              {editBody.length}/500
            </div>

            {editFile && (
              <div
                style={{
                  marginTop: 15,
                  marginBottom: 16,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#F6F5EF",
                  fontSize: 12,
                  color: C.textDark,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i
                  className="ti ti-paperclip"
                  style={{
                    fontSize: 16,
                    color: C.green,
                  }}
                />

                {editFile}
              </div>
            )}

            <div
              style={{
                fontSize: 12,
                color: C.textMuted,
              }}
            >
              Submitted: {selectedRequest.date}
            </div>

            <div
              style={{
                fontSize: 12,
                color: C.textMuted,
                marginTop: 5,
              }}
            >
              Last edited: {selectedRequest.lastEdited ?? "Not edited yet"}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 25,
              }}
            >
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "1px solid #D9D9D9",
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 700,
                  color: C.textDark,
                  transition: ".2s ease",
                }}
              >
                Cancel
              </button>

              {selectedRequest.status === "Pending Review" && (
                <button
                  onClick={handleEditSave}
                  disabled={isPending || !hasChanges()}
                  style={{
                    background: hasChanges() ? C.green : "#BDBDBD",
                    color: "white",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 10,
                    fontFamily: "inherit",
                    fontWeight: 700,
                    cursor: hasChanges() ? "pointer" : "not-allowed",
                    opacity: hasChanges() ? 1 : 0.7,
                  }}
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
