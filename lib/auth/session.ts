import "server-only"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { parseUserAgent } from "@/lib/user-agent"

export async function createLoginSession(opts: {
  userId: string
  userAgent: string | null
  ipAddress: string | null
}): Promise<string | null> {
  const { device_type, browser, os } = parseUserAgent(opts.userAgent)
  const { data } = await createSupabaseServiceClient()
    .from("login_session")
    .insert({
      app_user_id: opts.userId,
      device_type,
      browser,
      os,
      ip_address: opts.ipAddress,
      user_agent: opts.userAgent,
    })
    .select("login_session_id")
    .single()
  return data?.login_session_id ?? null
}

export async function revokeLoginSession(sessionId: string, userId: string): Promise<void> {
  await createSupabaseServiceClient()
    .from("login_session")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("login_session_id", sessionId)
    .eq("app_user_id", userId)
}
