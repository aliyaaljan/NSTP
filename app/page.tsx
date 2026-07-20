export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import LoginForm from './login/LoginForm'
import { getAppUserRole } from '@/lib/auth-actions'
import { roleToDashboard, ACTIVE_VIEW_COOKIE, adminDestinationForView } from '@/lib/auth/routes'

export default async function Home() {
  const role = await getAppUserRole()

  if (role === 'admin') {
    const jar = await cookies()
    redirect(adminDestinationForView(jar.get(ACTIVE_VIEW_COOKIE)?.value))
  }

  if (role === 'adviser' || role === 'student') {
    redirect(roleToDashboard(role))
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}