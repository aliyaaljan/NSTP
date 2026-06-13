import SidebarLayout from '@/components/shared/SidebarLayout'

const adminNav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Users',     href: '/admin/users',     icon: 'ti-users' },
  { label: 'Reports',   href: '/admin/reports',   icon: 'ti-report' },
  { label: 'Settings',  href: '/admin/settings',  icon: 'ti-settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout role="admin" navItems={adminNav}>
      {children}
    </SidebarLayout>
  )
}
