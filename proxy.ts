import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { decodeRoleClaim, roleFromDb } from "@/lib/auth/role"
import {
  ACTIVE_VIEW_COOKIE,
  ACTIVE_VIEW_COOKIE_OPTIONS,
  adminDestinationForView,
  type ActiveView,
} from "@/lib/auth/routes"

const ROLE_PREFIX: Record<string, string> = {
  admin: "/admin",
  adviser: "/facilitator",
  student: "/student",
}

function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    (request.headers.get("sec-purpose") ?? "").includes("prefetch")
  )
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Hybrid role resolution: claim-first (fast path), DB fallback (if hook off or first login)
  let role: string | undefined
  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    role = decodeRoleClaim(session?.access_token) ?? undefined
    if (!role) {
      role = (await roleFromDb(supabase, user.id)) ?? undefined
    }
  }

  function redirect(path: string) {
    const res = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value))
    return res
  }

  const cookieView = request.cookies.get(ACTIVE_VIEW_COOKIE)?.value
  const adminHome = adminDestinationForView(cookieView)

  if (path === "/" && user) {
    if (role === "admin") return redirect(adminHome)
    if (role === "adviser") return redirect("/facilitator/dashboard")
    return supabaseResponse
  }

  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/facilitator") ||
    path.startsWith("/student")

  if (!user && isProtected) {
    return redirect("/")
  }

  if (user && isProtected && !role) {
    return redirect("/")
  }

  if (user && isProtected && role) {
    const allowedPrefixes =
      role === "admin"
        ? ["/admin", "/facilitator"]
        : ROLE_PREFIX[role]
          ? [ROLE_PREFIX[role]]
          : null

    if (allowedPrefixes && !allowedPrefixes.some((p) => path.startsWith(p))) {
      return redirect(role === "admin" ? adminHome : `${ROLE_PREFIX[role]}/dashboard`)
    }

    // "Allow + follow": an admin browsing either area updates the remembered view.
    // Pass-through responses only (the redirect() helper drops cookie attributes),
    // and never on prefetches (they'd flip the view without a real navigation).
    if (role === "admin" && !isPrefetch(request)) {
      const desired: ActiveView | null = path.startsWith("/facilitator")
        ? "facilitator"
        : path.startsWith("/admin")
          ? "admin"
          : null
      if (desired && desired !== cookieView) {
        supabaseResponse.cookies.set(ACTIVE_VIEW_COOKIE, desired, ACTIVE_VIEW_COOKIE_OPTIONS)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/", "/admin/:path*", "/facilitator/:path*", "/student/:path*"],
}
