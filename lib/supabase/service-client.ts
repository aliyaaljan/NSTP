import "server-only"
import { createClient } from "@supabase/supabase-js"

function getServiceRoleEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }

  return { supabaseUrl, serviceRoleKey }
}

export function createSupabaseServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnvVars()

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
