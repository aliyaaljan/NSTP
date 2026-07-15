import { Suspense } from "react"
import AdminLoadingFallback from "@/components/admin/AdminLoadingFallback"
import ProfileClient from "@/components/admin/ProfileClient"
import { getProfileData } from "@/lib/admin/profile-actions"

export const revalidate = 0

async function ProfileContent() {
  const data = await getProfileData()

  return <ProfileClient profile={data.profile} currentUser={data.currentUser} />
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <ProfileContent />
    </Suspense>
  )
}
