"use client"

import Profile from "@/components/student/Profile"
import Sidebar from "@/components/shared/StudentLeaderSidebar"

export default function ProfilePage() {
  return <Profile Sidebar={Sidebar} classTypeBadge={true} />
}
