"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOutWithAudit } from "@/lib/auth-actions"
import { Goblin_One } from "next/font/google"

const goblin = Goblin_One({
  subsets: ["latin"],
  weight: "400",
})

const C = {
  green: "#14492E",
  greenHover: "rgba(255,255,255,0.10)",
  activeBg: "#F2EEE6",
  activeText: "#14492E",
  idleText: "rgba(255,255,255,0.86)",
  headingText: "rgba(255,255,255,0.45)",
  divider: "rgba(255,255,255,0.14)",
  logout: "#D9534F",
}

const COLLAPSED_W = 88
const EXPANDED_W = 256
const RAIL_MARGIN = 16

export interface NavItem {
  label: string
  href: string
  icon: string
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

interface NstpSidebarProps {
  navGroups: NavGroup[]
  children?: React.ReactNode
  mainClassName?: string
  pageBg?: string
  zIndex?: number
  isActive?: (pathname: string, item: NavItem) => boolean
}

function defaultIsActive(pathname: string, item: NavItem) {
  return pathname === item.href
}

export default function NstpSidebar({
  navGroups,
  children,
  mainClassName,
  pageBg = "#F0F0F0",
  zIndex = 60,
  isActive = defaultIsActive,
}: NstpSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }

  const rail = (
    <>
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
          z-index: ${zIndex};
          transition: width 0.22s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }

        .nstp-rail.expanded {
          width: ${EXPANDED_W}px;
        }

        .nstp-rail.expanded .nstp-expand {
          opacity: 1;
        }

        .nstp-expand {
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .nstp-link {
          transition: background 0.15s;
        }

        .nstp-link:hover {
          background: ${C.greenHover};
        }

        .nstp-link.active {
          background: ${C.activeBg};
        }

        .nstp-link.active:hover {
          background: ${C.activeBg};
        }

        .nstp-scroll-dark {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }

        .nstp-scroll-dark::-webkit-scrollbar {
          width: 4px;
        }

        .nstp-scroll-dark::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 999px;
        }

        .nstp-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        @media (max-width: 768px) {
          .nstp-logout {
            padding: 0 !important;
            margin-left: 8px;
            flex-shrink: 0;
          }

          .nstp-logout button {
            width: 46px !important;
            height: 46px !important;
          }

          .nstp-logout span:first-child {
            width: 46px !important;
          }

          .nstp-rail {
            top: auto;
            left: 16px;
            right: 16px;
            bottom: 16px;
            width: auto;
            height: 74px;
            border-radius: 999px;
            padding: 0 18px;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            background: rgba(20, 73, 46, 0.82);
            border: 1px solid rgba(255, 255, 255, 0.15);
          }

          .nstp-menu {
            flex-direction: row;
            align-items: center;
            gap: 4px;
            width: 100%;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .nstp-menu::-webkit-scrollbar {
            display: none;
          }

          .nstp-header,
          .nstp-divider,
          .nstp-group-heading,
          .nstp-group-divider {
            display: none;
          }

          .nstp-logout {
            display: flex;
          }

          .nstp-expand {
            display: none;
          }

          .nstp-link {
            width: 46px;
            height: 46px;
            justify-content: center;
            flex-shrink: 0;
          }

          .nstp-scroll-dark {
            overflow: visible !important;
            padding: 0 14px !important;
            width: 100%;
          }

          .nstp-link.active i {
            transform: scale(1.15);
          }

          .nstp-link i {
            transition: transform 0.2s ease;
          }

          .nstp-layout-main {
            margin-left: 0 !important;
            padding-bottom: 106px !important;
          }
        }
      `}</style>

      {expanded && !isMobile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: zIndex - 1,
            pointerEvents: "none",
          }}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`nstp-rail ${expanded ? "expanded" : ""}`}
        onClick={() => {
          if (!isMobile) {
            setExpanded((prev) => !prev)
          }
        }}
      >
        <div
          className="nstp-header"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            minHeight: 48,
          }}
        >
          <div
            style={{
              width: COLLAPSED_W - 44,
              display: "flex",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Image
              src="/nstp-logo.jpg"
              alt="NSTP UP Baguio Logo"
              width={44}
              height={44}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              priority
            />
          </div>

          <div className="nstp-expand" style={{ marginLeft: 6 }}>
            <div
              className={goblin.className}
              style={{
                color: "#fff",
                fontSize: 30,
                fontWeight: 100,
                letterSpacing: 1,
                lineHeight: 1,
              }}
            >
              NSTP
            </div>
            <div
              className={goblin.className}
              style={{
                fontSize: 6,
                fontWeight: 10,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.4,
              }}
            >
              University of the Philippines Baguio
            </div>
          </div>
        </div>

        <div
          className="nstp-divider"
          style={{
            height: 1,
            background: C.divider,
            margin: "20px 22px 8px",
          }}
        />

        <nav
          className="nstp-scroll-dark"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "6px 14px",
          }}
        >
          <div className="nstp-menu">
            {navGroups.map((group, gi) => (
              <div key={group.heading} style={{ marginTop: gi === 0 ? 0 : 8 }}>
                {gi > 0 && (
                  <div
                    className="nstp-group-divider"
                    style={{
                      height: 1,
                      background: C.divider,
                      margin: "12px 8px 16px",
                    }}
                  />
                )}
                <div
                  className="nstp-group-heading"
                  style={{
                    margin: "4px 12px 2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.headingText,
                      letterSpacing: 1.5,
                      textTransform: "uppercase",
                      opacity: expanded ? 1 : 0,
                      transition: "opacity 0.15s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {group.heading}
                  </span>
                </div>

                {group.items.map((item) => {
                  const active = isActive(pathname, item)
                  return (
                    <Link
                      key={item.href}
                      href={isMobile || expanded ? item.href : "#"}
                      onClick={(e) => {
                        if (!isMobile && !expanded) {
                          e.preventDefault()
                          setExpanded(true)
                        }
                      }}
                      className={`nstp-link${active ? " active" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: 46,
                        borderRadius: 50,
                        textDecoration: "none",
                        overflow: "hidden",
                        pointerEvents: isMobile || expanded ? "auto" : "none",
                      }}
                    >
                      <span
                        style={{
                          width: COLLAPSED_W - 28,
                          flexShrink: 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <i
                          className={`ti ${item.icon}`}
                          style={{
                            fontSize: 21,
                            color: active ? C.activeText : C.idleText,
                          }}
                        />
                      </span>
                      <span
                        className="nstp-expand"
                        style={{
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                          color: active ? C.activeText : C.idleText,
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        <div className="nstp-logout" style={{ padding: "8px 14px 0" }}>
          <button
            onClick={handleSignOut}
            className="nstp-link"
            style={{
              display: "flex",
              alignItems: "center",
              height: 46,
              width: "100%",
              borderRadius: 14,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              overflow: "hidden",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                width: COLLAPSED_W - 28,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <i
                className="ti ti-logout"
                style={{ fontSize: 21, color: C.logout }}
              />
            </span>
            <span
              className="nstp-expand"
              style={{ fontSize: 14, fontWeight: 500, color: C.logout }}
            >
              Log Out
            </span>
          </button>
        </div>
      </aside>
    </>
  )

  if (children == null) {
    return rail
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: pageBg,
        fontFamily: "var(--font, 'Helvetica Neue', Arial, sans-serif)",
        fontSize: 14,
      }}
    >
      {rail}
      <main
        className={`nstp-layout-main ${mainClassName ?? ""}`.trim()}
        style={{
          flex: 1,
          marginLeft: COLLAPSED_W + RAIL_MARGIN * 2,
          padding: "36px 28px",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  )
}
