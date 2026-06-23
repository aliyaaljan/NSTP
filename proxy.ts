import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { decodeRoleClaim, roleFromDb } from "@/lib/auth/role"

const ROLE_PREFIX: Record<string, string> = {
  admin: "/admin",
  adviser: "/facilitator",
  student: "/student",
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

  if (path === "/" && user) {
    if (role === "admin" || role === "adviser") {
      const prefix = ROLE_PREFIX[role]
      return redirect(`${prefix}/dashboard`)
    }
    return supabaseResponse
  }

  const isProtected =
    path.startsWith("/admin") ||
    path.startsWith("/facilitator") ||
    path.startsWith("/student")

  if (!user && isProtected) {
    return redirect("/")
  }

  if (user && isProtected && role) {
    const allowedPrefix = ROLE_PREFIX[role]
    if (allowedPrefix && !path.startsWith(allowedPrefix)) {
      return redirect(`${allowedPrefix}/dashboard`)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/", "/admin/:path*", "/facilitator/:path*", "/student/:path*"],
}
