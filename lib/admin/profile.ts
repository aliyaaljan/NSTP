import type { AdminCurrentUser } from "@/lib/admin/settings"

export interface AdminProfile {
  fullName: string
  email: string
  roleName: string
  roleCode: string
  avatarUrl: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
  signInMethod: string
  lastSignInAt: string | null
}

export interface AdminProfilePageData {
  profile: AdminProfile
  currentUser: AdminCurrentUser
}

export function formatProfileDate(iso: string | null): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
