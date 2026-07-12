import type { User } from "@supabase/supabase-js"

/**
 * Google profile photo from Supabase auth user metadata.
 * Checks user_metadata first (avatar_url, then picture), then the
 * Google identity's identity_data. Null for password-auth dev accounts.
 */
export function googleAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null
  return (
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    user.identities?.[0]?.identity_data?.avatar_url ??
    null
  )
}
