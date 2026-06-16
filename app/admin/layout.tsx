import { redirect } from "next/navigation"
import { getAppUserRole } from "@/lib/auth-actions"
import SidebarLayout from "@/components/shared/SidebarLayout"

const adminNav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "ti-layout-dashboard" },
  { label: "Users",     href: "/admin/users",     icon: "ti-users" },
  { label: "Reports",   href: "/admin/reports",   icon: "ti-report" },
  { label: "Settings",  href: "/admin/settings",  icon: "ti-settings" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAppUserRole()
  if (role !== "admin") redirect("/")

  return (
    <SidebarLayout role="admin" navItems={adminNav}>
      {children}
    </SidebarLayout>
  )
}
