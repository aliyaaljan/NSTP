export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import LoginForm from './login/LoginForm'
import { getAppUserRole } from '@/lib/auth-actions'

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
    redirect(ROLE_DASHBOARD.student)
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}