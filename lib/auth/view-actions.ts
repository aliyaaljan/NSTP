"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { getAppUserRole } from "@/lib/auth-actions"
import { userOwnsActiveTermSection } from "@/lib/admin/facilitator-pool"
import {
  ACTIVE_VIEW_COOKIE,
  ACTIVE_VIEW_COOKIE_OPTIONS,
  adminDestinationForView,
  type ActiveView,
} from "@/lib/auth/routes"

export async function setActiveView(view: ActiveView): Promise<void> {
  const role = await getAppUserRole()
  if (role !== "admin") redirect("/")

  if (view === "facilitator") {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ownsClass = user
      ? await userOwnsActiveTermSection(createSupabaseServiceClient(), user.id)
      : false
    if (!ownsClass) redirect("/admin/dashboard")
  }

  const jar = await cookies()
  jar.set(ACTIVE_VIEW_COOKIE, view, ACTIVE_VIEW_COOKIE_OPTIONS)
  redirect(adminDestinationForView(view))
}
