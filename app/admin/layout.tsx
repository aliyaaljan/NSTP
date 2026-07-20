export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { Goblin_One, Cormorant, Montserrat } from "next/font/google"
import { getAppUserRole } from "@/lib/auth-actions"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { userOwnsActiveTermSection } from "@/lib/admin/facilitator-pool"
import { ActiveViewProvider } from "@/components/shared/ActiveViewContext"
import ResponsiveStudentSidebar, {
  type NavGroup,
} from "@/components/shared/ResponsiveStudentSidebar"
import { FONT_BODY } from "@/lib/admin-typography"
import { ADMIN_COLORS, ADMIN_THEME_CSS } from "@/lib/admin-theme"

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
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: "ti-layout-dashboard",
      },
      { label: "Student List", href: "/admin/students", icon: "ti-users" },
      { label: "Facilitator List", href: "/admin/advisers", icon: "ti-user-cog" },
      {
        label: "Classes",
        href: "/admin/sections",
        icon: "ti-layout-grid",
      },
      { label: "Site List", href: "/admin/sites", icon: "ti-map-pin" },
      { label: "Forms", href: "/admin/forms", icon: "ti-clipboard-check" },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Audit Log", href: "/admin/audit-log", icon: "ti-history" },
      {
        label: "Access Control",
        href: "/admin/access-control",
        icon: "ti-key",
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: "ti-adjustments-horizontal",
      },
    ],
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const role = await getAppUserRole()
  if (role !== "admin") redirect("/")

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const ownsClass = user
    ? await userOwnsActiveTermSection(createSupabaseServiceClient(), user.id)
    : false

  return (
    <ActiveViewProvider value={{ view: "admin", isAdmin: true, canSwitch: ownsClass }}>
      <div
        className={`admin-root ${goblinOne.variable} ${cormorant.variable} ${montserrat.variable}`}
        style={{
          height: "100vh",
          overflow: "hidden",
          ["--font" as string]:
            "var(--font-content, 'Helvetica Neue', Arial, sans-serif)",
          ["--font-title" as string]: "var(--font-goblin, Georgia, serif)",
          ["--font-sub" as string]: "var(--font-cormorant, Georgia, serif)",
        }}
      >
        <style>{ADMIN_THEME_CSS}</style>
        <ResponsiveStudentSidebar
          navGroups={adminNav}
          mainClassName="admin-main-scroll"
          pageBg={ADMIN_COLORS.bg}
        >
          <div style={{ fontFamily: FONT_BODY, color: ADMIN_COLORS.text }}>
            {children}
          </div>
        </ResponsiveStudentSidebar>
      </div>
    </ActiveViewProvider>
  )
}
