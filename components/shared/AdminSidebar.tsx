'use client'

import NstpSidebar, { type NavGroup, type NavItem } from '@/components/shared/NstpSidebar'
import { FONT_BODY } from '@/lib/admin-typography'
import { ADMIN_COLORS } from '@/lib/admin-theme'

export type { NavGroup, NavItem }

export default function AdminSidebar({
  navGroups,
  children,
}: {
  navGroups: NavGroup[]
  children: React.ReactNode
}) {
  return (
    <NstpSidebar
      navGroups={navGroups}
      mainClassName="admin-main-scroll"
      pageBg={ADMIN_COLORS.bg}
      zIndex={1000}
    >
      <div style={{ fontFamily: FONT_BODY, color: ADMIN_COLORS.text }}>
        {children}
      </div>
    </NstpSidebar>
  )
}
