"use client"

import NstpSidebar, { type NavGroup } from "@/components/shared/NstpSidebar"

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "MAIN",
    items: [
      { icon: "ti-layout-dashboard", label: "Dashboard", href: "/student/dashboard" },
      { icon: "ti-users", label: "My Class", href: "/student/classlist" },
      { icon: "ti-qrcode", label: "Attendance", href: "/student/attendance" },
      { icon: "ti-folder", label: "Forms", href: "/student/forms" },
      { icon: "ti-pencil", label: "Submit Request", href: "/student/request" },
    ],
  },
]

export default function StudentSidebar() {
  return (
    <NstpSidebar
      navGroups={NAV_GROUPS}
      isActive={(pathname, item) =>
        pathname === item.href ||
        (item.label === "Dashboard" &&
          (pathname === "/student/dashboard" || pathname === "/student"))
      }
    />
  )
}
