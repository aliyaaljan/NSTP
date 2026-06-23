export const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  adviser: "/facilitator/dashboard",
  student: "/student/dashboard",
}

export const STUDENT_LEADER_DASHBOARD = "/student/leader/dashboard"

export function roleToDashboard(roleCode: string | null): string {
  return (roleCode && ROLE_DASHBOARD[roleCode]) ?? "/student/dashboard"
}
