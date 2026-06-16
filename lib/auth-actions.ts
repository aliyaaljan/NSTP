"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { redirect } from "next/navigation"

export async function upsertAppUser() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // check domain
  if (!user?.email?.endsWith("@up.edu.ph")) {
    // await supabase.auth.signOut()
    return
  }

  if (!user) return null
  

  // check if user exists in app_user
  const { data: existing } = await supabase
    .from("app_user")
    .select("*")
    .eq("app_user_id", user.id)
    .single()

  if (existing) {//return existing
    console.log("user_metadata:", user?.user_metadata)
    console.log("app_metadata:", user?.app_metadata)
    const role = user?.user_metadata?.user_role;
    console.log(role)
    if (role === "admin") {
      redirect("/admin/dashboard")
    } else if (role === "adviser") {
      redirect("/facilitator/dashboard")
    } else {
      redirect("/student/dashboard")
    }
  }
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

  if (error) throw error.message; 

  return data
}
