export const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  adviser: "/facilitator/dashboard",
  student: "/student/dashboard",
}

export const STUDENT_LEADER_DASHBOARD = "/student/dashboard"

export function roleToDashboard(roleCode: string | null): string {
  return (roleCode && ROLE_DASHBOARD[roleCode]) ?? "/student/dashboard"
}

export type ActiveView = "admin" | "facilitator"

export const ACTIVE_VIEW_COOKIE = "nstp_active_view"

export const ACTIVE_VIEW_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
}

/** Where an admin lands based on their remembered view cookie. */
export function adminDestinationForView(view: string | undefined): string {
  return view === "facilitator" ? "/facilitator/dashboard" : "/admin/dashboard"
}
