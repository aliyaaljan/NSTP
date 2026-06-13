import SidebarLayout from '@/components/shared/SidebarLayout'

const facilitatorNav = [
  { label: 'Dashboard', href: '/facilitator/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'My Students', href: '/facilitator/students', icon: 'ti-users' },
  { label: 'Schedule',    href: '/facilitator/schedule', icon: 'ti-calendar' },
  { label: 'Profile',     href: '/facilitator/profile',  icon: 'ti-user-circle' },
]

export default function FacilitatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout role="facilitator" navItems={facilitatorNav}>
      {children}
    </SidebarLayout>
  )
}
