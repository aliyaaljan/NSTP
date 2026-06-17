import type { SupabaseClient } from "@supabase/supabase-js"

/** Decode the custom `user_role` claim from a JWT access token. Edge-safe (no DB). */
export function decodeRoleClaim(accessToken?: string | null): string | null {
  if (!accessToken) return null
  try {
    const part = accessToken.split(".")[1]
    if (!part) return null
    // JWT payloads are base64url; atob() only accepts standard base64.
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
    const payload = JSON.parse(atob(padded))
    return (payload.user_role as string) ?? null
  } catch {
    return null
  }
}

/** Fallback: read role from app_user via PostgREST (RLS: own row). */
export async function roleFromDb(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("app_user")
    .select("role(code)")
    .eq("app_user_id", userId)
    .maybeSingle()
  return (data?.role as any)?.code ?? null
}
