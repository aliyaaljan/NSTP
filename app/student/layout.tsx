export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getAppUserRole } from "@/lib/auth-actions"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const role = await getAppUserRole()
  if (role !== "student") redirect("/")

  return <>{children}</>
}
