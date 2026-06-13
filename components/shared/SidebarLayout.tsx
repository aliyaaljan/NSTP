'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface SidebarLayoutProps {
  role: 'student' | 'facilitator' | 'admin'
  navItems: NavItem[]
  children: React.ReactNode
}

const ROLE_META = {
  student:     { label: 'Student Portal',      color: '#2D6A4F', icon: 'ti-user' },
  facilitator: { label: 'Facilitator Portal',  color: '#7B1113', icon: 'ti-users' },
  admin:       { label: 'Admin Panel',         color: '#5C0B18', icon: 'ti-settings' },
}

export default function SidebarLayout({ role, navItems, children }: SidebarLayoutProps) {
  const pathname = usePathname()
  const meta = ROLE_META[role]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Cormorant', Georgia, serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: meta.color,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 0',
        flexShrink: 0,
      }}>
        {/* Logo / role header */}
        <div style={{ padding: '0 24px 28px', borderBottom: 'rgba(255,255,255,0.15) 1px solid' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6 }}>NSTP UP</div>
          <div style={{ fontSize: '17px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className={`ti ${meta.icon}`} />
            {meta.label}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: active ? 700 : 400,
                transition: 'background 0.15s',
              }}>
                <i className={`ti ${item.icon}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            <i className="ti ti-logout" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#EDE8E0', padding: '40px' }}>
        {children}
      </main>
    </div>
  )
}
