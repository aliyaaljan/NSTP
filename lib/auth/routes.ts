export const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin/dashboard",
  adviser: "/facilitator/dashboard",
  student: "/student/dashboard",
}

export function roleToDashboard(roleCode: string | null): string {
  return (roleCode && ROLE_DASHBOARD[roleCode]) ?? "/student/dashboard"
}
