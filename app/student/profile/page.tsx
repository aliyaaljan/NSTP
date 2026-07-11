"use client"

import Profile from "@/components/student/Profile"
import Sidebar from "@/components/shared/ResponsiveStudentSidebar"
import { useStudent } from "@/app/student/StudentContext"

export default function ProfilePage() {
  const { isLeader, isLoading } = useStudent()

  return <Profile Sidebar={() => <Sidebar isLeader={isLeader} />} classTypeBadge={false} />
}