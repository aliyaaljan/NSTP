"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ActiveView } from "@/lib/auth/routes"

export interface ActiveViewState {
  view: ActiveView
  /** True when the signed-in user's role is admin (drives the "(Admin)" badge). */
  isAdmin: boolean
  /** True when the toggle should be offered (admin who owns an active-term class). */
  canSwitch: boolean
}

const ActiveViewContext = createContext<ActiveViewState | null>(null)

export function ActiveViewProvider({
  value,
  children,
}: {
  value: ActiveViewState
  children: ReactNode
}) {
  return <ActiveViewContext.Provider value={value}>{children}</ActiveViewContext.Provider>
}

/** Null outside a provider (e.g. the student area) — never throws. */
export function useActiveView(): ActiveViewState | null {
  return useContext(ActiveViewContext)
}
