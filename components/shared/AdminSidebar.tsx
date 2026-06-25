'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from "react"
import { usePathname, useRouter } from 'next/navigation'
import { signOutWithAudit } from '@/lib/auth-actions'
import { FONT_BODY, FONT_SUB, FONT_TITLE, TYPE } from '@/lib/admin-typography'
import { ADMIN_COLORS } from '@/lib/admin-theme'

/**
 * Admin collapsible sidebar.
 * ──────────────────────────────────────────────────────────────────────────
 * Collapsed by default (icon-only rail). Expands on hover to reveal the NSTP
 * wordmark, section headers and nav labels — matching both reference shots.
 * Nav groups are passed in by the layout so the same component can be reused
 * for other roles later.
 * ──────────────────────────────────────────────────────────────────────────
 */

export interface NavItem {
  label: string
  href: string
  icon: string
}

export interface NavGroup {
  /** Section heading shown when expanded (e.g. "MAIN"). */
  heading: string
  items: NavItem[]
}

const COLLAPSED_W = 88
const EXPANDED_W = 256
const RAIL_MARGIN = 16

const C = {
  green: ADMIN_COLORS.green,
  greenHover: 'rgba(255,255,255,0.08)',
  activeBg: 'rgba(232,232,232,0.92)',
  activeText: ADMIN_COLORS.green,
  idleText: ADMIN_COLORS.greenLight,
  headingText: 'rgba(255,255,255,0.45)',
  divider: 'rgba(255,255,255,0.14)',
  logout: '#FCA5A5',
}

function NstpLogo({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/nstp-logo.jpg"
      alt="NSTP UP Baguio Logo"
      width={size}
      height={size}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
      priority
    />
  )
}

export default function AdminSidebar({
  navGroups,
  children,
}: {
  navGroups: NavGroup[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  async function handleSignOut() {
    await signOutWithAudit()
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: ADMIN_COLORS.bg, fontFamily: FONT_BODY, fontSize: 14, color: ADMIN_COLORS.text }}>
      <style>{`
        .nstp-rail {
          position: fixed;
          top: ${RAIL_MARGIN}px;
          left: ${RAIL_MARGIN}px;
          bottom: ${RAIL_MARGIN}px;
          width: ${COLLAPSED_W}px;
          background: ${C.green};
          border-radius: 22px;
          display: flex;
          flex-direction: column;
          padding: 22px 0 18px;
          overflow: hidden;
          white-space: nowrap;
          z-index: 1000;
          transition: width 0.22s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }
        .nstp-rail:hover { width: ${EXPANDED_W}px; }
        .nstp-expand { opacity: 0; transition: opacity 0.18s ease; }
        .nstp-rail:hover .nstp-expand { opacity: 1; }
        .nstp-link:hover { background: ${C.greenHover}; }
        .nstp-link.active:hover { background: ${C.activeBg}; }
      `}</style>

      {expanded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 40,
            pointerEvents: "none",
          }}
        />
      )}

      <aside
        className="nstp-rail"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 22px', minHeight: 48 }}>
          <div style={{ width: COLLAPSED_W - 44, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <NstpLogo />
          </div>
          <div className="nstp-expand" style={{ marginLeft: 6 }}>
            <div
              style={{
                fontFamily: FONT_TITLE,
                color: "#fff",
                fontSize: 30,
                lineHeight: 1,
                letterSpacing: 0.5,
              }}
            >
              NSTP
            </div>

            <div
              style={{
                fontFamily: FONT_SUB,
                fontSize: 12,
                color: ADMIN_COLORS.greenLight,
                lineHeight: 1.4,
                marginTop: 4,
                opacity: 0.9,
                whiteSpace: "nowrap",
              }}
            >
              University of the Philippines Baguio
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: C.divider, margin: '20px 22px 8px' }} />

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 14px' }} className="nstp-scroll-dark">
          {navGroups.map((group, gi) => (
            <div key={group.heading} style={{ marginTop: gi === 0 ? 0 : 22 }}>
              <div
                className="nstp-expand"
                style={{
                  ...TYPE.sectionLabel,
                  color: C.headingText,
                  padding: '0 4px 10px',
                }}
              >
                {group.heading}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nstp-link${active ? ' active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: 46,
                        borderRadius: 14,
                        textDecoration: 'none',
                        overflow: 'hidden',
                        background: active ? C.activeBg : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span
                        style={{
                          width: COLLAPSED_W - 28,
                          flexShrink: 0,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <i
                          className={`ti ${item.icon}`}
                          style={{ fontSize: 21, color: active ? C.activeText : C.idleText }}
                        />
                      </span>
                      <span
                        className="nstp-expand"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 15,
                          fontWeight: 600,
                          color: active ? C.activeText : C.idleText,
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Log out */}
        <div style={{ padding: '8px 14px 0' }}>
          <button
            onClick={handleSignOut}
            className="nstp-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 46,
              width: '100%',
              borderRadius: 14,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              overflow: 'hidden',
              padding: 0,
            }}
          >
            <span
              style={{
                width: COLLAPSED_W - 28,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <i className="ti ti-logout" style={{ fontSize: 21, color: C.logout }} />
            </span>
            <span
              className="nstp-expand"
              style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: C.logout }}
            >
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main content — offset by the collapsed rail so it never shifts on hover */}
      <main
        style={{
          flex: 1,
          marginLeft: COLLAPSED_W + RAIL_MARGIN * 2,
          padding: '36px 28px',
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  )
}
