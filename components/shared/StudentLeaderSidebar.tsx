"use client"

import StudentSidebar from "@/components/shared/ResponsiveStudentSidebar"

// Compatibility shim. The leader/student sidebars were consolidated into
// ResponsiveStudentSidebar (which takes an `isLeader` flag), but the leader
// routes still `import Sidebar from ".../StudentLeaderSidebar"`. The incoming
// merge left this file empty, breaking every leader page. This restores them by
// rendering the responsive sidebar in leader mode until the leader pages are
// migrated to import ResponsiveStudentSidebar directly.
export default function StudentLeaderSidebar() {
  return <StudentSidebar isLeader />
}
