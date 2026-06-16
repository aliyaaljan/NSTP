import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const error = searchParams.get("error")
  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, origin))
  }

  const code = searchParams.get("code")
  if (!code) {
    return NextResponse.redirect(new URL("/", origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, origin))
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/", origin))
  }

  if (!user.email?.endsWith("@up.edu.ph")) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      new URL("/?error=Only+UP+email+accounts+(@up.edu.ph)+are+allowed.", origin)
    )
  }

  const role = user.user_metadata?.role
  //console.log("ROLE: ", role)

  if (role === "admin") return NextResponse.redirect(new URL("/admin/dashboard", origin))
  if (role === "adviser") return NextResponse.redirect(new URL("/facilitator/dashboard", origin))
  return NextResponse.redirect(new URL("/student/dashboard", origin))
}