"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // check if there is error with supabase or google
    const errorDescription =
      searchParams.get("error_description") || searchParams.get("error")
    if (errorDescription) {
      router.push(`/login?error=${encodeURIComponent(errorDescription)}`)
      return
    }

    const finishLogin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // domain verification
      if (!user.email?.endsWith("@up.edu.ph")) {
        await supabase.auth.signOut()
        router.push(
          "/login?error=Only+UP+email+accounts+(@up.edu.ph)+are+allowed."
        )
        return
      }

      // match role to user
      const role = user.user_metadata?.role || "student"

      if (role === "admin") router.push("/admin/dashboard")
      else if (role === "facilitator") router.push("/facilitator/dashboard")
      else router.push("/student/dashboard")
    }

    finishLogin()
  }, [router, searchParams, supabase])

  return <p>Signing in...</p>
}
