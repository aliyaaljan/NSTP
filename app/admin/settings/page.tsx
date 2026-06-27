import { Suspense } from "react"
import SettingsClient from "@/components/admin/SettingsClient"
import { getSettingsData } from "@/lib/admin/settings-actions"

export const revalidate = 0

async function SettingsContent() {
  const data = await getSettingsData()

  return (
    <SettingsClient
      academic={data.academic}
      schoolYearOptions={data.schoolYearOptions}
      semesterOptions={data.semesterOptions}
      gpsSites={data.gpsSites}
      gpsSections={data.gpsSections}
      holidays={data.holidays}
      meta={data.meta}
      currentUser={data.currentUser}
    />
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  )
}
