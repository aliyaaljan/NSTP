"use server"

import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { ensureAppUser } from "@/lib/auth-actions"
import { createLoginSession } from "@/lib/auth/session"
import { roleToDashboard, STUDENT_LEADER_DASHBOARD } from "@/lib/auth/routes"
import { getActiveLeaderEnrollment } from "@/lib/auth/leader"

export async function signInWithDevPassword(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.DEV_AUTH_ENABLED !== "true") {
    redirect("/?error=Dev+login+unavailable+in+this+environment.")
  }

  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/?error=Login+failed.+Please+try+again.")

  const { roleCode } = await ensureAppUser()
  if (!roleCode) redirect("/?error=Account+not+authorized.")

  try {
    const h = await headers()
    const userAgent = h.get("user-agent")
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    const sessionId = await createLoginSession({ userId: user.id, userAgent, ipAddress })
    if (sessionId) {
      const jar = await cookies()
      jar.set("nstp_login_session", sessionId, {
        httpOnly: true,
        secure: false, // dev-only action; never runs in production
        sameSite: "lax",
        path: "/",
      })
    }
  } catch {
    // audit failure is non-fatal
  }

  let destination = roleToDashboard(roleCode)
  if (roleCode === "student") {
    const leader = await getActiveLeaderEnrollment(supabase, user.id)
    if (leader) destination = STUDENT_LEADER_DASHBOARD
  }

  redirect(destination)
}
