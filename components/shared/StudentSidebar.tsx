"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOutWithAudit } from "@/lib/auth-actions"

const C = {
  green: "#14492E",
  greenHover: "rgba(255,255,255,0.10)",
  activeBg: "#F2EEE6",
  activeText: "#14492E",
  idleText: "rgba(255,255,255,0.86)",
  divider: "rgba(255,255,255,0.14)",
  logout: "#D9534F",
}

const COLLAPSED_W = 88
const EXPANDED_W = 256
const RAIL_MARGIN = 16

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { icon: "ti-layout-dashboard", label: "Dashboard", href: "/student/dashboard" },
  { icon: "ti-presentation", label: "My Class", href: "/student/classlist" },
  { icon: "ti-users", label: "Attendance", href: "/student/attendance" },
  { icon: "ti-clipboard-check", label: "Files", href: "/student/files" },
  { icon: "ti-pencil", label: "Submit Request", href: "/student/request" },
]

export default function StudentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }

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
  
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [])

  return (
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
          z-index: 60;
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
        ref={sidebarRef}
        className={`nstp-rail ${expanded ? "expanded" : ""}`}
        onClick={() => setExpanded((prev) => !prev)}
      >

        {/* header */}
        <div
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
              style={{
                borderRadius: "50%",
                objectFit: "cover",
              }}
              priority
            />
          </div>

          <div className="nstp-expand" style={{ marginLeft: 6 }}>
            <div
              style={{
                color: "#fff",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 1,
                lineHeight: 1,
              }}
            >
              NSTP
            </div>

            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.4,
              }}
            >
              University of the Philippines Baguio
            </div>
          </div>
        </div>

        <div
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.label === "Dashboard" &&
                  (pathname === "/student/dashboard" ||
                    pathname === "/student"))

              return (
                <Link
                  key={item.href}
                  href={expanded ? item.href : "#"}
                  onClick={(e) => {
                    if (!expanded) {
                      e.preventDefault()
                      setExpanded(true)
                    }
                  }}
                  className={`nstp-link${active ? " active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 46,
                    borderRadius: 14,
                    textDecoration: "none",
                    overflow: "hidden",
                    pointerEvents: expanded ? "auto" : "none",
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
                      fontSize: 14,
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
        </nav>

        <div style={{ padding: "8px 14px 0" }}>
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
                style={{
                  fontSize: 21,
                  color: C.logout,
                }}
              />
            </span>

            <span
              className="nstp-expand"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.logout,
              }}
            >
              Log Out
            </span>
          </button>
        </div>

      </aside>
    </>
  )
}