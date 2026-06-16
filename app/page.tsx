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
  if (role && ROLE_DASHBOARD[role]) {
    redirect(ROLE_DASHBOARD[role])
  }
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
