import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  console.log("MIDDLEWARE:", {
    path,
    user: user?.email ?? "NO USER",
    role: user?.user_metadata?.role,
    cookies: request.cookies.getAll().map(c => c.name),
  });
  const role = user?.user_metadata?.role;

  if (path.startsWith("/booking")) {
    return supabaseResponse;
  }

  if (path === "/login" && user) {
    if (role === "admin") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (role === "adviser") return NextResponse.redirect(new URL("/facilitator/dashboard", request.url));
    if (role === "student leader") return NextResponse.redirect(new URL("/student/dashboard", request.url));
    if (role === "student") return NextResponse.redirect(new URL("/student/dashboard", request.url));
    return supabaseResponse;
  }

  const isProtected = path.startsWith("/admin/dashboard") || path.startsWith("/facilitator") ||path.startsWith("/student");

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    if (role === "admin" && !path.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else if (role === "adviser" && !path.startsWith("/facilitator")) {
      return NextResponse.redirect(new URL("/facilitator/dashboard", request.url));
    } else if (role === "student leader" && !path.startsWith("/student")) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    } else if (role === "student" && !path.startsWith("/student")) {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  return supabaseResponse;
} 

export const config = {
  matcher: ["/login", "/admin/:path*", "/facilitator/:path*", "/student/:path*"],
};