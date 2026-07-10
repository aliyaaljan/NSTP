"use client"

import Profile from "@/components/student/Profile"
import Sidebar from "@/components/shared/ResponsiveStudentSidebar"

export default function ProfilePage() {
  return <Profile Sidebar={Sidebar} classTypeBadge={false} />
}
