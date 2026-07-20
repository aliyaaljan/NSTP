import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { ensureAppUser } from "@/lib/auth-actions"
import { createLoginSession } from "@/lib/auth/session"
import { roleToDashboard, ACTIVE_VIEW_COOKIE, adminDestinationForView } from "@/lib/auth/routes"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const error = searchParams.get("error")
  let errorDescription = searchParams.get("error_description")
  if (errorDescription === "Database error saving new user") {errorDescription = "Please choose your offical UP Mail"}

  if (error) {
    const messageToPass = errorDescription || error
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(messageToPass)}`, origin)
    )
  }

  const code = searchParams.get("code")
  if (!code) {
    return NextResponse.redirect(new URL("/", origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  )

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, origin)
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/", origin))
  }

  if (!user.email?.toLowerCase().endsWith("@up.edu.ph")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL(
        "/?error=Only+UP+email+accounts+(@up.edu.ph)+are+allowed.",
        origin
      )
    )
  }

  let roleCode: string | null = null
  try {
    const result = await ensureAppUser()
    roleCode = result.roleCode

    if (result.created) {
      await supabase.auth.refreshSession()
    }
  } catch {
    return NextResponse.redirect(
      new URL("/?error=Account+setup+failed.+Please+try+again.", origin)
    )
  }

  if (!roleCode) {
    return NextResponse.redirect(
      new URL(
        "/?error=Only+UP+email+accounts+(@up.edu.ph)+are+allowed.",
        origin
      )
    )
  }

  let destination = roleToDashboard(roleCode)
  if (roleCode === "admin") {
    destination = adminDestinationForView(
      request.cookies.get(ACTIVE_VIEW_COOKIE)?.value
    )
  }

  const response = NextResponse.redirect(new URL(destination, origin))

  try {
    const userAgent = request.headers.get("user-agent")
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null
    const sessionId = await createLoginSession({
      userId: user.id,
      userAgent,
      ipAddress,
    })
    if (sessionId) {
      response.cookies.set("nstp_login_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
    }
  } catch {
    // audit failure is non-fatal; user still proceeds to their dashboard
  }

  return response
}