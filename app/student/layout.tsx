import { redirect } from "next/navigation"
import { getAppUserRole } from "@/lib/auth-actions"
import SidebarLayout from "@/components/shared/SidebarLayout"

const studentNav = [
  { label: "Dashboard", href: "/student/dashboard", icon: "ti-layout-dashboard" },
  { label: "My Hours",  href: "/student/hours",     icon: "ti-clock" },
  { label: "Schedule",  href: "/student/schedule",  icon: "ti-calendar" },
  { label: "Profile",   href: "/student/profile",   icon: "ti-user-circle" },
]

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const role = await getAppUserRole()
  if (role !== "student") redirect("/")

  return (
    <SidebarLayout role="student" navItems={studentNav}>
      {children}
    </SidebarLayout>
  )
}
