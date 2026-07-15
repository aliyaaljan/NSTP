"use client"

import { useEffect, useState } from "react"
import { getNotificationPreferences, setEmailNotifications } from "@/lib/settings/NotificationPreferences"

export function EmailNotification() {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getNotificationPreferences().then((res) => {
      if (res.ok) setEnabled(res.data.email_notifications_enabled)
      setLoading(false)
    })
  }, [])

  async function toggle() {
    const next = !enabled
    setEnabled(next) 
    setBusy(true)
    const res = await setEmailNotifications(next)
    if (!res.ok) setEnabled(!next) 
    setBusy(false)
  }

  if (loading) return null

  return (
    <div style={{ borderTop: "0.5px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "#F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className="ti ti-mail" style={{ fontSize: 18, color: "var(--muted)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Email notifications</p>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "2px 0 0" }}>
          Sent to your @up.edu.ph address
        </p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={busy}
        style={{
          position: "relative",
          width: 36,
          height: 20,
          borderRadius: 999,
          border: "none",
          cursor: busy ? "not-allowed" : "pointer",
          background: enabled ? "var(--green)" : "#D1D5DB",
          flexShrink: 0,
          padding: 0,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: enabled ? 18 : 2,
            width: 16,
            height: 16,
            background: "#fff",
            borderRadius: "50%",
            transition: "left 0.15s",
          }}
        />
      </button>
    </div>
  )
}