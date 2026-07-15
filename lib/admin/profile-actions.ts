"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import { googleAvatarUrl } from "@/lib/auth/avatar"
import type { AdminProfilePageData } from "@/lib/admin/profile"
import type { AdminCurrentUser } from "@/lib/admin/settings"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import type { User } from "@supabase/supabase-js"

function resolveSignInMethod(user: User): string {
  const provider =
    user.app_metadata?.provider ??
    user.identities?.find((identity) => identity.provider)?.provider

  if (provider === "google") return "Google (@up.edu.ph)"
  if (provider === "email") return "Email & password"
  return "UP account"
}

export async function getProfileData(): Promise<AdminProfilePageData> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    throw new Error("Unauthorized")
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const { data: appUser, error } = await supabase
    .from("app_user")
    .select(
      "full_name, email, avatar_url, is_active, created_at, updated_at, role:role_id(code, name)"
    )
    .eq("app_user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[getProfileData] app_user query failed", error)
  }

  const roleData = appUser?.role as { code?: string; name?: string } | null
  const roleCode = roleData?.code ?? "admin"
  const roleName = roleData?.name ?? "Administrator"
  const avatarUrl =
    (appUser as { avatar_url?: string | null } | null)?.avatar_url ??
    googleAvatarUrl(user)

  const profile = {
    fullName: appUser?.full_name ?? "Administrator",
    email: appUser?.email ?? user.email ?? "",
    roleName,
    roleCode,
    avatarUrl,
    isActive: appUser?.is_active ?? true,
    createdAt: appUser?.created_at ?? null,
    updatedAt: appUser?.updated_at ?? null,
    signInMethod: resolveSignInMethod(user),
    lastSignInAt: user.last_sign_in_at ?? null,
  }

  const currentUser: AdminCurrentUser = {
    name: profile.fullName,
    role: roleCode === "admin" ? "NSTP Admin" : roleName,
    avatarUrl: avatarUrl ?? undefined,
  }

  return { profile, currentUser }
}
