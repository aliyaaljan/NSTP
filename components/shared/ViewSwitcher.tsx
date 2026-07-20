"use client"

import { useTransition } from "react"
import { useActiveView } from "./ActiveViewContext"
import { setActiveView } from "@/lib/auth/view-actions"

export interface ViewSwitch {
  /** "Switch to Facilitator View" | "Switch to Admin View" */
  label: string
  isPending: boolean
  onSwitch: () => void
}

/** Null when the toggle must not render (not an admin-facilitator / no provider). */
export function useViewSwitch(): ViewSwitch | null {
  const ctx = useActiveView()
  const [isPending, startTransition] = useTransition()
  if (!ctx?.canSwitch) return null
  const target = ctx.view === "admin" ? "facilitator" : "admin"
  return {
    label: target === "facilitator" ? "Switch to Facilitator View" : "Switch to Admin View",
    isPending,
    onSwitch: () => startTransition(() => void setActiveView(target)),
  }
}

/** Dropdown row shared by AdminProfilePill and FacilitatorProfilePill. Text-only (no webfont dependency). */
export function ViewSwitchMenuItem({ onNavigate }: { onNavigate?: () => void }) {
  const viewSwitch = useViewSwitch()
  if (!viewSwitch) return null
  return (
    <button
      type="button"
      disabled={viewSwitch.isPending}
      onClick={() => {
        onNavigate?.()
        viewSwitch.onSwitch()
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        border: "none",
        borderRadius: 8,
        background: "transparent",
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "inherit",
        color: "inherit",
      }}
    >
      {viewSwitch.isPending ? "Switching…" : viewSwitch.label}
    </button>
  )
}
