"use client"

import Profile from "@/components/student/Profile"
import Sidebar from "@/components/shared/StudentSidebar"

export default function ProfilePage() {
  return <Profile Sidebar={Sidebar} classTypeBadge={false} />
}
