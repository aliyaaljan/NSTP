import { redirect } from "next/navigation"
import { Goblin_One, Cormorant, Montserrat } from "next/font/google"
import { getAppUserRole } from "@/lib/auth-actions"
import AdminSidebar, { type NavGroup } from "@/components/shared/AdminSidebar"
import { ADMIN_THEME_CSS } from "@/lib/admin-theme"

const goblinOne = Goblin_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-goblin",
  display: "swap",
})

const cormorant = Cormorant({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-content",
  display: "swap",
})

const adminNav: NavGroup[] = [
  {
    heading: "MAIN",
    items: [
      { label: "Dashboard",    href: "/admin/dashboard", icon: "ti-layout-dashboard" },
      { label: "Student List", href: "/admin/students",  icon: "ti-users" },
      { label: "Adviser List", href: "/admin/advisers",  icon: "ti-user-cog" },
      { label: "Forms",        href: "/admin/forms",     icon: "ti-clipboard-check" },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Audit Log",      href: "/admin/audit-log",      icon: "ti-history" },
      { label: "Access Control", href: "/admin/access-control", icon: "ti-key" },
      { label: "Settings",       href: "/admin/settings",       icon: "ti-adjustments-horizontal" },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getAppUserRole()
  if (role !== "admin") redirect("/")

  return (
    <div
      className={`${goblinOne.variable} ${cormorant.variable} ${montserrat.variable}`}
      style={{
        minHeight: "100vh",
        ["--font" as string]: "var(--font-content, 'Helvetica Neue', Arial, sans-serif)",
        ["--font-title" as string]: "var(--font-goblin, Georgia, serif)",
        ["--font-sub" as string]: "var(--font-cormorant, Georgia, serif)",
      }}
    >
      <style>{ADMIN_THEME_CSS}</style>
      <AdminSidebar navGroups={adminNav}>{children}</AdminSidebar>
    </div>
  )
}
