"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function getNotificationPreferences(): Promise<ActionResult<{ email_notifications_enabled: boolean; push_notifications_enabled: boolean }>> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("app_user")
    .select("email_notifications_enabled, push_notifications_enabled")
    .eq("app_user_id", user.id)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data }
}

export async function setEmailNotifications(enabled: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("app_user")
    .update({ email_notifications_enabled: enabled })
    .eq("app_user_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function setPushNotifications(enabled: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("app_user")
    .update({ push_notifications_enabled: enabled })
    .eq("app_user_id", user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function checkNotificationPreference(userId: string, type: "email" | "push"): Promise<boolean> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from("app_user")
    .select("email_notifications_enabled, push_notifications_enabled")
    .eq("app_user_id", userId)
    .single()

  if (error || !data) {
    console.error(`[Preferences] Error fetching preferences for user ${userId}:`, error?.message)
    return true 
  }

  return type === "email" ? data.email_notifications_enabled : data.push_notifications_enabled
}