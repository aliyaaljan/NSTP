"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"

export async function upsertAppUser() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // check if user exists in app_user
  const { data: existing } = await supabase
    .from("app_user")
    .select("*")
    .eq("app_user_id", user.id)
    .single()

  if (existing) return existing

  // create new app_user
  const { data, error } = await supabase
    .from("app_user")
    .insert({
      app_user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name ?? "",
      role_id: "DEFAULT_ROLE_UUID", // temp
    })
    .select()
    .single()

  if (error) throw error

  return data
}
