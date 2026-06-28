export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"

export default async function StudentLeaderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const leader = await getActiveLeaderEnrollment(supabase, user.id)
  if (!leader) {
    redirect("/student/dashboard")
  }

  return <>{children}</>
}
