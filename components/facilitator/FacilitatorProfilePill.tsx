"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useActiveView } from "@/components/shared/ActiveViewContext"
import { useViewSwitch, ViewSwitchMenuItem } from "@/components/shared/ViewSwitcher"

export interface FacilitatorProfilePillProps {
  name: string
  avatarUrl: string | null
  initials: React.ReactNode
}

export default function FacilitatorProfilePill({
  name,
  avatarUrl,
  initials,
}: FacilitatorProfilePillProps) {
  const activeView = useActiveView()
  const viewSwitch = useViewSwitch()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  const avatar = (
    <div className="profile-avatar">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        initials
      )}
    </div>
  )

  const nameBlock = (
    <div>
      <div className="profile-name">{name}</div>
      {activeView?.isAdmin && (
        <div style={{ fontSize: 10, opacity: 0.85, marginTop: 1 }}>Facilitator (Admin)</div>
      )}
    </div>
  )

  // Real adviser (no toggle available) — identical to the original plain link.
  if (!viewSwitch) {
    return (
      <Link href="/facilitator/profile" className="profile-pill">
        {avatar}
        {nameBlock}
      </Link>
    )
  }

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="profile-pill"
        onClick={() => setOpen((o) => !o)}
        style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatar}
        {nameBlock}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 100,
            background: "#fff",
            color: "#111827",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: 6,
            minWidth: 230,
          }}
        >
          <Link
            href="/facilitator/profile"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 13,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            My Profile
          </Link>
          <ViewSwitchMenuItem onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
