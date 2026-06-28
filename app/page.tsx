export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import LoginForm from './login/LoginForm'
import { getAppUserRole } from '@/lib/auth-actions'
import { createSupabaseServerClient } from '@/lib/supabase/server-client'
import { getActiveLeaderEnrollment } from '@/lib/auth/leader'
import { STUDENT_LEADER_DASHBOARD } from '@/lib/auth/routes'

const ROLE_DASHBOARD: Record<string, string> = {
  admin:   '/admin/dashboard',
  adviser: '/facilitator/dashboard',
  student: '/student/dashboard',
}

export default async function Home() {
  const role = await getAppUserRole()

  if (role === 'admin' || role === 'adviser') {
    redirect(ROLE_DASHBOARD[role])
  }

  if (role === 'student') {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const leader = await getActiveLeaderEnrollment(supabase, user.id)
      if (leader) redirect(STUDENT_LEADER_DASHBOARD)
    }
    redirect(ROLE_DASHBOARD.student)
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
