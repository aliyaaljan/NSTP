"use client"

import { useEffect, useState } from "react"
import { usePushSubscription } from "@/lib/push/usePushSubscription"
import { getNotificationPreferences, setPushNotifications } from "@/lib/settings/NotificationPreferences"

function isIosSafariNotInstalled() {
  if (typeof window === "undefined") return false
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
  return isIos && !isStandalone
}

export function PushNotification() {
  const { subscribe, unsubscribe, isSubscribed, isSupported } = usePushSubscription()
  const [needsInstall, setNeedsInstall] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setNeedsInstall(isIosSafariNotInstalled())
  }, [])

  useEffect(() => {
    getNotificationPreferences().then((res) => {
      if (res.ok) setEnabled(res.data.email_notifications_enabled)
      setLoading(false)
    })
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      if (isSubscribed) {
        await unsubscribe()
        await setPushNotifications(false)
      } else {
        await subscribe()
        await setPushNotifications(true)
      }
    } catch (err) {
      console.error("Push toggle failed:", err)
      alert("Could not update push notification settings.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
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
        <i className="ti ti-bell" style={{ fontSize: 18, color: "var(--muted)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Push notifications</p>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "2px 0 0" }}>
          {needsInstall ? "Add this app to your home screen to enable notification on IOS devices." : "Receive instant alerts for new updates"}
        </p>
      </div>

      {needsInstall ? (
        <i className="ti ti-info-circle" style={{ fontSize: 18, color: "var(--muted)", flexShrink: 0 }} />
      ) : !isSupported ? (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Not supported</span>
      ) : (
        <button
          role="switch"
          aria-checked={isSubscribed && enabled}
          onClick={toggle}
          disabled={busy}
          style={{
            position: "relative",
            width: 36,
            height: 20,
            borderRadius: 999,
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            background: isSubscribed && enabled ? "var(--green)" : "#D1D5DB",
            flexShrink: 0,
            padding: 0,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: isSubscribed && enabled ? 18 : 2,
              width: 16,
              height: 16,
              background: "#fff",
              borderRadius: "50%",
              transition: "left 0.15s",
            }}
          />
        </button>
      )}
    </div>
  )
}