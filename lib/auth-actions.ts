"use server"

import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { decodeRoleClaim, roleFromDb } from "@/lib/auth/role"
import { revokeLoginSession } from "@/lib/auth/session"

export async function getAppUserRole(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: { session } } = await supabase.auth.getSession()
  const claimRole = decodeRoleClaim(session?.access_token)
  if (claimRole) return claimRole

  return roleFromDb(supabase, user.id)
}

export async function ensureAppUser(): Promise<{ roleCode: string | null; created: boolean }> {
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { roleCode: null, created: false }

  if (!user.email?.toLowerCase().endsWith("@up.edu.ph")) {
    await supabase.auth.signOut()
    return { roleCode: null, created: false }
  }

  const { data: existing } = await service
    .from("app_user")
    .select("role(code)")
    .eq("app_user_id", user.id)
    .maybeSingle()

  if (existing) {
    return { roleCode: (existing.role as any)?.code ?? "student", created: false }
  }

  const { data: studentRole } = await service
    .from("role")
    .select("role_id")
    .eq("code", "student")
    .maybeSingle()

  if (!studentRole) throw new Error("student role not found in role table")
  const { data, error } = await service
    .from("app_user")
    .insert({
      app_user_id: user.id,
      email: user.email.toLowerCase(),
      full_name: user.user_metadata?.full_name ?? "",
      role_id: studentRole.role_id,
    })
    .select("role(code)")
    .single()

  if (error) {
    if ((error as any).code === "23505") {
      const { data: row } = await service
        .from("app_user")
        .select("role(code)")
        .eq("app_user_id", user.id)
        .maybeSingle()
      return { roleCode: (row?.role as any)?.code ?? "student", created: false }
    }
    throw new Error(error.message)
  }

  return { roleCode: (data.role as any)?.code ?? "student", created: true }
}

export async function signOutWithAudit(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const jar = await cookies()
  const sessionId = jar.get("nstp_login_session")?.value

  if (user && sessionId) {
    await revokeLoginSession(sessionId, user.id)
  }

  await supabase.auth.signOut()
  jar.delete("nstp_login_session")
}
