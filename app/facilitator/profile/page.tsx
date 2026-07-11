"use client";

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  navRoutes,
  dashboardStyles,
  Sidebar,
  ProfileCard,
} from "../facilitator"
import { signOutWithAudit } from "@/lib/auth-actions"
import { createClient } from "@/lib/client"
import LoadingPage from "@/components/shared/LoadingPage"

type RawProfileData = {
  full_name: string
  email: string
  college: { name: string } | null
  nstp_component: { name: string } | null
}

type ProfileData = {
  fullName: string
  email: string
  college: string
  component: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [activeNav, setActiveNav] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("app_user")
      .select(`full_name, email, college:college_id ( name ), nstp_component:nstp_component_id ( name )`)
      .eq("app_user_id", uid)
      .single<RawProfileData>()

    if (error) {
      console.error("Database error:", error.message)
      return
    }

    setProfile({
      fullName: data.full_name ?? "",
      email: data.email ?? "",
      college: data.college?.name ?? "",
      component: data.nstp_component?.name ?? "",
    })
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.id) await fetchProfile(user.id)
      setIsPageLoading(false)
    })
  }, [supabase, fetchProfile])

  function handleNavClick(label: string) {
    setActiveNav(label)
    setSidebarOpen(false)
    if (navRoutes?.[label]) {
      router.push(navRoutes[label])
    }
  }

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }

  const BoundSidebar = () => (
    <Sidebar
      open={sidebarOpen}
      activeNav={activeNav}
      onToggle={() => setSidebarOpen((o) => !o)}
      onNavClick={handleNavClick}
      onSignOut={handleSignOut}
    />
  )

  return (
    <>
      <style>{dashboardStyles}</style>

      {isPageLoading ? (
        <LoadingPage Sidebar={BoundSidebar} />
      ) : (
        <div className="db-root">
          <Sidebar
            open={sidebarOpen}
            activeNav={activeNav}
            onToggle={() => setSidebarOpen((o) => !o)}
            onNavClick={handleNavClick}
            onSignOut={handleSignOut}
          />

          {sidebarOpen && (
            <div
              className="sb-overlay"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          <div className="main-wrapper">
            <main className="main">
              <header className="header">
                <h1 className="header-greeting">Profile</h1>
              </header>

              <div className="body items-center">
                <ProfileCard
                  fullName={profile?.fullName}
                  email={profile?.email}
                  college={profile?.college}
                  component={profile?.component}
                />
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  )
}