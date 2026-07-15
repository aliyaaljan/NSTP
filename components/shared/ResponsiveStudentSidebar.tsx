"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOutWithAudit } from "@/lib/auth-actions"
import { Goblin_One, Cormorant } from "next/font/google"
import { useStudent } from "@/app/student/StudentContext" 

const goblin = Goblin_One({
  subsets: ["latin"],
  weight: "400",
})

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const C = {
  green: "#14492E",
  greenDark: "#0E3521",
  greenHover: "rgba(255,255,255,0.08)",
  activeBg: "rgba(232,232,232,0.92)",
  activeText: "#14492E",
  idleText: "#FFFFFF",
  idleTextHover: "rgba(255,255,255,0.8)",
  divider: "rgba(255,255,255,0.25)",
  logout: "#FCA5A5",
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

const NAV_ITEMS: NavItem[] = [
  { icon: "ti-layout-dashboard", label: "Dashboard", href: "/student/dashboard" },
  { icon: "ti-users", label: "Class", href: "/student/classlist" },
  { icon: "ti-qrcode", label: "Attendance", href: "/student/attendance" },
  { icon: "ti-folder", label: "Forms", href: "/student/forms" },
  { icon: "ti-pencil", label: "Request", href: "/student/request" },
]

interface StudentSidebarProps {
  isLeader?: boolean
  navGroups?: NavGroup[]
  children?: React.ReactNode
  mainClassName?: string
  pageBg?: string
}

export default function StudentSidebar({
  isLeader: propIsLeader,
  navGroups,
  children,
  mainClassName,
  pageBg = "#F0F0F0",
}: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sizes, setSizes] = useState({
    icon: 21,
    label: 13,
    logo: 44,
    item: 46,
    railPadding: 22,
    mobileHeight: 74,
    mobilePadding: 12,
    mobileGap: 0,
    mobileLabelSize: 8,
    mobileIconSize: 18,
    mobileLogoSize: 36,
    mobileTopHeight: 60,
    mobileTopLogoSize: 36,
    mobileTopFontSize: 20,
    mobileTopSubFontSize: 6,
    mobileAvatarSize: 24,
  })
  const [windowWidth, setWindowWidth] = useState(0)
  const [windowHeight, setWindowHeight] = useState(0)

  const { isLeader: contextIsLeader, isLoading, studentData } = useStudent()
  const isLeader = propIsLeader !== undefined ? propIsLeader : contextIsLeader

  useEffect(() => {
    const calculateSizes = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowWidth(width)
      setWindowHeight(height)
      
      // Determine if mobile
      const mobile = width <= 480
      setIsMobile(mobile)
      
      if (mobile) {
        const baseWidth = width
        const baseHeight = height
        
        // Scale factors based on device size
        const widthScale = Math.min(1, Math.max(0.45, baseWidth / 430))
        const heightScale = Math.min(1, Math.max(0.35, baseHeight / 932))
        const scale = Math.min(widthScale, heightScale)
        
        // Dynamic sizing
        let iconSize, labelSize, logoSize, itemSize, mobileHeight, mobilePadding, mobileGap, mobileLabelSize, mobileIconSize
        let mobileLogoSize, mobileTopHeight, mobileTopLogoSize, mobileTopFontSize, mobileTopSubFontSize
        let mobileAvatarSize
        
        // Very small devices (<= 375px width or <= 667px height)
        if (baseWidth <= 375 || baseHeight <= 667) {
          iconSize = Math.max(10, 14 * scale)
          labelSize = Math.max(4, 5.5 * scale)
          logoSize = Math.max(16, 22 * scale)
          itemSize = Math.max(22, 28 * scale)
          mobileHeight = Math.max(34, 42 * scale)
          mobilePadding = Math.max(2, 4 * scale)
          mobileGap = Math.max(0, 0.5 * scale)
          mobileLabelSize = Math.max(3.5, 4.5 * scale)
          mobileIconSize = Math.max(8, 12 * scale)
          mobileLogoSize = Math.max(14, 20 * scale)
          mobileTopHeight = Math.max(30, 36 * scale)
          mobileTopLogoSize = Math.max(14, 20 * scale)
          mobileTopFontSize = Math.max(10, 12 * scale)
          mobileTopSubFontSize = Math.max(3.5, 4.5 * scale)
          mobileAvatarSize = Math.max(10, 14 * scale)
        }
        // Medium devices (376px - 414px width or 668px - 844px height)
        else if (baseWidth <= 414 || baseHeight <= 844) {
          iconSize = Math.max(12, 16 * scale)
          labelSize = Math.max(5, 7 * scale)
          logoSize = Math.max(20, 26 * scale)
          itemSize = Math.max(26, 32 * scale)
          mobileHeight = Math.max(38, 48 * scale)
          mobilePadding = Math.max(3, 5 * scale)
          mobileGap = Math.max(0, 1 * scale)
          mobileLabelSize = Math.max(4.5, 5.5 * scale)
          mobileIconSize = Math.max(10, 14 * scale)
          mobileLogoSize = Math.max(18, 26 * scale)
          mobileTopHeight = Math.max(36, 44 * scale)
          mobileTopLogoSize = Math.max(18, 26 * scale)
          mobileTopFontSize = Math.max(12, 15 * scale)
          mobileTopSubFontSize = Math.max(4.5, 5.5 * scale)
          mobileAvatarSize = Math.max(12, 16 * scale)
        }
        // Large devices (415px - 480px width or 845px - 932px height)
        else {
          iconSize = Math.max(14, 18 * scale)
          labelSize = Math.max(6, 8 * scale)
          logoSize = Math.max(24, 30 * scale)
          itemSize = Math.max(30, 36 * scale)
          mobileHeight = Math.max(42, 52 * scale)
          mobilePadding = Math.max(4, 6 * scale)
          mobileGap = Math.max(0, 2 * scale)
          mobileLabelSize = Math.max(5.5, 6.5 * scale)
          mobileIconSize = Math.max(12, 16 * scale)
          mobileLogoSize = Math.max(22, 30 * scale)
          mobileTopHeight = Math.max(42, 50 * scale)
          mobileTopLogoSize = Math.max(22, 30 * scale)
          mobileTopFontSize = Math.max(14, 17 * scale)
          mobileTopSubFontSize = Math.max(5.5, 6.5 * scale)
          mobileAvatarSize = Math.max(14, 18 * scale)
        }
        
        // Extreme small height adjustment
        if (baseHeight < 700) {
          const heightRatio = Math.max(0.35, baseHeight / 700)
          mobileHeight = Math.max(28, mobileHeight * heightRatio)
          itemSize = Math.max(18, itemSize * heightRatio)
          iconSize = Math.max(8, iconSize * heightRatio)
          mobileIconSize = Math.max(8, mobileIconSize * heightRatio)
          mobileLabelSize = Math.max(3, mobileLabelSize * heightRatio)
          mobileTopHeight = Math.max(26, mobileTopHeight * heightRatio)
          mobileTopLogoSize = Math.max(12, mobileTopLogoSize * heightRatio)
          mobileTopFontSize = Math.max(9, mobileTopFontSize * heightRatio)
          mobileTopSubFontSize = Math.max(3, mobileTopSubFontSize * heightRatio)
          logoSize = Math.max(14, logoSize * heightRatio)
          mobileLogoSize = Math.max(14, mobileLogoSize * heightRatio)
          mobileAvatarSize = Math.max(8, mobileAvatarSize * heightRatio)
        }
        
        // Extreme small width adjustment
        if (baseWidth < 360) {
          const widthRatio = Math.max(0.4, baseWidth / 360)
          itemSize = Math.max(16, itemSize * widthRatio)
          mobileIconSize = Math.max(7, mobileIconSize * widthRatio)
          mobileLabelSize = Math.max(3, mobileLabelSize * widthRatio)
          mobileGap = Math.max(0, mobileGap * widthRatio)
          mobilePadding = Math.max(2, mobilePadding * widthRatio)
        }
        
        setSizes({
          icon: iconSize,
          label: labelSize,
          logo: logoSize,
          item: itemSize,
          railPadding: 22,
          mobileHeight: mobileHeight,
          mobilePadding: mobilePadding,
          mobileGap: mobileGap,
          mobileLabelSize: mobileLabelSize,
          mobileIconSize: mobileIconSize,
          mobileLogoSize: mobileLogoSize,
          mobileTopHeight: mobileTopHeight,
          mobileTopLogoSize: mobileTopLogoSize,
          mobileTopFontSize: mobileTopFontSize,
          mobileTopSubFontSize: mobileTopSubFontSize,
          mobileAvatarSize: mobileAvatarSize,
        })
        return
      }
      
      // Tablet sizes (481px - 768px)
      if (width > 480 && width <= 768) {
        const scale = width / 768
        setSizes({
          icon: Math.max(16, 21 * scale),
          label: Math.max(11, 13 * scale),
          logo: Math.max(30, 44 * scale),
          item: Math.max(36, 46 * scale),
          railPadding: Math.max(18, 22 * scale),
          mobileHeight: 74,
          mobilePadding: 12,
          mobileGap: 0,
          mobileLabelSize: 8,
          mobileIconSize: 18,
          mobileLogoSize: 36,
          mobileTopHeight: 60,
          mobileTopLogoSize: 36,
          mobileTopFontSize: 20,
          mobileTopSubFontSize: 6,
          mobileAvatarSize: 24,
        })
        return
      }
      
      // Desktop sizes
      setSizes({
        icon: 21,
        label: 13,
        logo: 44,
        item: 46,
        railPadding: 22,
        mobileHeight: 74,
        mobilePadding: 12,
        mobileGap: 0,
        mobileLabelSize: 8,
        mobileIconSize: 18,
        mobileLogoSize: 36,
        mobileTopHeight: 60,
        mobileTopLogoSize: 36,
        mobileTopFontSize: 20,
        mobileTopSubFontSize: 6,
        mobileAvatarSize: 24,
      })
    }

    calculateSizes()
    window.addEventListener("resize", calculateSizes)
    return () => window.removeEventListener("resize", calculateSizes)
  }, [])

  const isAdminMode = Boolean(navGroups?.length)

  // Navigation items based on role or admin nav groups
  const navItems = navGroups
    ? navGroups.flatMap((group) => group.items)
    : isLeader
      ? [
          { icon: "ti-layout-dashboard", label: "Dashboard", href: "/student/dashboard" },
          { icon: "ti-presentation", label: "Class", href: "/student/classlist" },
          { icon: "ti-scan", label: "Scanner", href: "/student/scanner" },
          { icon: "ti-users", label: "Attendance", href: "/student/attendance" },
          { icon: "ti-clipboard-check", label: "Forms", href: "/student/forms" },
          { icon: "ti-pencil", label: "Request", href: "/student/request" },
        ]
      : NAV_ITEMS

  function isItemActive(item: NavItem) {
    return (
      pathname === item.href ||
      (!isAdminMode &&
        item.label === "Dashboard" &&
        (pathname === "/student/dashboard" || pathname === "/student"))
    )
  }

  async function handleSignOut() {
    await signOutWithAudit()
    router.push("/")
    router.refresh()
  }

  const toggleSidebar = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }
    setExpanded(prev => !prev)
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        expanded &&
        !isMobile
      ) {
        setExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [expanded, isMobile])

  // Dynamic styles for mobile
  const mobileStyles = isMobile ? {
    height: `${sizes.mobileHeight}px`,
    padding: `0 ${sizes.mobilePadding}px`,
  } : {}

  const mobileItemStyles = isMobile ? {
    height: `${sizes.item}px`,
    minWidth: `${sizes.item}px`,
  } : {}

  const tabletRailWidth = windowWidth > 480 && windowWidth <= 768 
    ? Math.max(70, COLLAPSED_W * (windowWidth / 768))
    : COLLAPSED_W
    
  const tabletExpandedWidth = windowWidth > 480 && windowWidth <= 768
    ? Math.max(200, EXPANDED_W * (windowWidth / 768))
    : EXPANDED_W

  const renderMobileNavLink = (item: NavItem) => {
    const active = isItemActive(item)

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`nstp-link${active ? " active" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: sizes.item,
          minWidth: sizes.item,
          borderRadius: 10,
          textDecoration: "none",
          flexShrink: 0,
          padding: "1px 2px",
          background: "transparent !important",
        }}
      >
        <span
          style={{
            width: `${sizes.mobileIconSize + 10}px`,
            height: `${sizes.mobileIconSize + 10}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "50%",
            transition: "background 0.15s ease",
            background: active ? C.activeBg : "transparent",
          }}
        >
          <i
            className={`ti ${item.icon}`}
            style={{
              fontSize: sizes.mobileIconSize,
              color: active ? C.activeText : C.idleText,
              lineHeight: 1,
            }}
          />
        </span>

        <span
          className="nstp-label"
          style={{
            display: "block",
            fontSize: sizes.mobileLabelSize,
            fontWeight: active ? 700 : 500,
            color: active ? "#ffffff" : "rgba(255,255,255,0.7)",
            textAlign: "center",
            lineHeight: 1,
            letterSpacing: "0.02px",
            marginTop: "1px",
            whiteSpace: "nowrap",
            width: "auto",
            maxWidth: `${sizes.item + 4}px`,
          }}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  const renderDesktopNavLink = (item: NavItem) => {
    const active = isItemActive(item)

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={(e) => {
          e.stopPropagation()
        }}
        title={!expanded ? item.label : undefined}
        className={`nstp-link${active ? " active" : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          height: 46,
          width: expanded ? "auto" : 46,
          alignSelf: expanded ? "auto" : "center",
          borderRadius: 999,
          textDecoration: "none",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            width: expanded ? COLLAPSED_W - 16 : "100%",
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <i
            className={`ti ${item.icon}`}
            style={{
              fontSize: 20,
              color: active ? C.activeText : C.idleText,
            }}
          />
        </span>

        <span
          className="nstp-expand"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: active ? C.greenDark : C.idleText,
            maxWidth: expanded ? 200 : 0,
            opacity: expanded ? 1 : 0,
            overflow: 'hidden',
            textOverflow: 'clip',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            transition: 'max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s',
          }}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  const sidebarContent = (
    <>
      <style>{`
        .nstp-rail {
          position: fixed;
          top: ${RAIL_MARGIN}px;
          left: ${RAIL_MARGIN}px;
          bottom: ${RAIL_MARGIN}px;
          width: ${COLLAPSED_W}px;
          background: ${C.green};
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          padding: 22px 0 18px;
          overflow: hidden;
          white-space: nowrap;
          z-index: 60;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .nstp-rail.expanded {
          width: ${EXPANDED_W}px;
          cursor: default;
        }

        .nstp-expand {
          opacity: 0;
          max-width: 0;
          overflow: hidden;
          text-overflow: clip;
          white-space: nowrap;
          display: inline-block;
          transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s;
        }

        .nstp-rail.expanded .nstp-expand {
          opacity: 1;
          max-width: 200px;
        }

        .nstp-header .nstp-expand {
          max-width: 0;
          transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s;
        }

        .nstp-rail.expanded .nstp-header .nstp-expand {
          max-width: 200px;
        }

        .nstp-link {
          transition: color 0.13s, background 0.13s;
          border-radius: 999px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          color: ${C.idleText};
          position: relative;
        }

        .nstp-link .nstp-expand {
          max-width: 0;
          opacity: 0;
          overflow: hidden;
          text-overflow: clip;
          white-space: nowrap;
          display: inline-block;
          transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s;
        }

        .nstp-rail.expanded .nstp-link .nstp-expand {
          max-width: 200px;
          opacity: 1;
        }

        .nstp-link:hover:not(.active) {
          color: ${C.idleTextHover};
          background: ${C.greenHover};
        }

        .nstp-link.active {
          background: ${C.activeBg};
          color: ${C.greenDark};
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

        /* Mobile styles (screens <= 480px) */
        @media(max-width:480px) {
          .nstp-rail {
            top: auto;
            left: ${Math.max(2, 4)}px;
            right: ${Math.max(2, 4)}px;
            bottom: ${Math.max(2, 4)}px;
            width: auto !important;
            height: ${sizes.mobileHeight}px !important;
            border-radius: 999px;
            padding: 0 ${sizes.mobilePadding}px !important;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            background: rgba(20,73,46,.92);
            border: 1px solid rgba(255,255,255,.15);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            cursor: default;
            overflow: visible !important;
          }

          .nstp-header,
          .nstp-divider,
          .nstp-logout {
            display: none !important;
          }

          .nstp-expand {
            display: none !important;
          }

          .nstp-scroll-dark {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            padding: 0 !important;
            flex: 1;
            display: flex;
            align-items: center;
            height: 100%;
            scrollbar-width: none;
            -ms-overflow-style: none;
            -webkit-overflow-scrolling: touch;
          }

          .nstp-scroll-dark::-webkit-scrollbar {
            display: none;
          }

          .nstp-scroll-dark .nstp-menu {
            flex-direction: row;
            height: 100%;
            align-items: center;
            gap: ${Math.max(0, sizes.mobileGap)}px;
            padding: 0 2px;
            width: 100%;
            min-width: min-content;
            justify-content: space-around;
          }

          .nstp-menu > div:first-child {
            display: none !important;
          }

          .nstp-link {
            flex-shrink: 0;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1px 2px !important;
            border-radius: 10px !important;
            background: transparent !important;
            min-width: ${Math.max(24, sizes.item)}px !important;
            width: auto !important;
            height: ${sizes.item}px !important;
          }

          .nstp-link span:first-child {
            width: ${Math.max(18, sizes.mobileIconSize + 10)}px !important;
            height: ${Math.max(18, sizes.mobileIconSize + 10)}px !important;
            margin: 0 !important;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            transition: background 0.15s ease;
          }

          .nstp-link.active span:first-child {
            background: ${C.activeBg} !important;
          }

          .nstp-link i {
            margin: 0 !important;
            font-size: ${sizes.mobileIconSize}px !important;
            transition: transform .2s ease;
          }

          .nstp-link .nstp-label {
            display: block !important;
            font-size: ${sizes.mobileLabelSize}px !important;
            font-weight: 500;
            color: rgba(255,255,255,0.7);
            text-align: center;
            line-height: 1;
            letter-spacing: 0.02px;
            margin-top: 1px;
            white-space: nowrap;
            width: auto;
            max-width: ${Math.max(24, sizes.item + 4)}px;
            overflow: visible;
            text-overflow: clip;
          }

          .nstp-link.active .nstp-label {
            color: #ffffff;
            font-weight: 700;
          }

          /* Profile avatar styles */
          .nstp-link.profile-link span:first-child {
            width: ${Math.max(18, sizes.mobileIconSize + 10)}px !important;
            height: ${Math.max(18, sizes.mobileIconSize + 10)}px !important;
            margin: 0 !important;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            transition: background 0.15s ease;
            background: transparent !important;
            padding: 0 !important;
          }

          .nstp-link.profile-link.active span:first-child {
            background: ${C.activeBg} !important;
          }

          .nstp-link.profile-link .nstp-avatar-image {
            width: ${sizes.mobileIconSize}px !important;
            height: ${sizes.mobileIconSize}px !important;
            border-radius: 50%;
            object-fit: cover;
            border: none !important;
            display: block;
          }

          .nstp-link.profile-link .nstp-avatar-fallback {
            width: ${sizes.mobileIconSize}px !important;
            height: ${sizes.mobileIconSize}px !important;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.1);
          }

          .nstp-link.profile-link .nstp-avatar-fallback i {
            font-size: ${Math.max(8, sizes.mobileIconSize * 0.6)}px !important;
            color: ${C.idleText};
          }

          .nstp-link.profile-link.active .nstp-avatar-fallback i {
            color: ${C.activeText};
          }

          .nstp-link.profile-link .nstp-label {
            display: block !important;
            font-size: ${sizes.mobileLabelSize}px !important;
            font-weight: 500;
            color: rgba(255,255,255,0.7);
            text-align: center;
            line-height: 1;
            letter-spacing: 0.02px;
            margin-top: 1px;
            white-space: nowrap;
            width: auto;
            max-width: ${Math.max(24, sizes.item + 4)}px;
            overflow: visible;
            text-overflow: clip;
          }

          .nstp-link.profile-link.active .nstp-label {
            color: #ffffff;
            font-weight: 700;
          }

          .nstp-menu.admin-mobile-menu {
            justify-content: flex-start !important;
          }
        }

        @media(min-width:481px) and (max-width:768px) {
          .nstp-rail {
            width: ${tabletRailWidth}px;
            padding: ${Math.max(18, 22)}px 0;
          }
          
          .nstp-rail.expanded {
            width: ${tabletExpandedWidth}px;
          }
          
          .nstp-link {
            height: ${Math.max(36, 46)}px;
          }
          
          .nstp-link i {
            font-size: ${Math.max(16, 21)}px;
          }
          
          .nstp-expand {
            font-size: ${Math.max(11, 13)}px;
          }
          
          .nstp-header img {
            width: ${Math.max(30, 44)}px;
            height: ${Math.max(30, 44)}px;
          }
        }

        .nstp-layout-main {
          flex: 1;
          min-width: 0;
        }

        @media (max-width: 480px) {
          .nstp-layout-main.with-responsive-sidebar {
            padding-top: ${sizes.mobileTopHeight + 10}px !important;
            padding-bottom: ${sizes.mobileHeight + 20}px !important;
          }
        }
      `}</style>

      {/* Mobile Top Sticky Header */}
      {isMobile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: `${sizes.mobileTopHeight}px`,
            background: C.green,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            zIndex: 50,
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "0 0 7px 7px",
          }}
        >
          {/* Logo and NSTP text */}
          <Link
            href="/student/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
            }}
          >
            <Image
              src="/nstp-logo.jpg"
              alt="NSTP UP Baguio Logo"
              width={sizes.mobileTopLogoSize}
              height={sizes.mobileTopLogoSize}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                cursor: "pointer",
              }}
              priority
            />
            <div>
              <div className={goblin.className}
                style={{
                  color: "#fff",
                  fontSize: `${sizes.mobileTopFontSize}px`,
                  fontWeight: 100,
                  letterSpacing: 0.3,
                  lineHeight: 1,
                }}
              >
                NSTP
              </div>
              <div className={cormorant.className}
                style={{
                  fontSize: `${sizes.mobileTopSubFontSize}px`,
                  fontWeight: 15,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1,
                }}
              >
                University of the Philippines Baguio
              </div>
            </div>
          </Link>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "3px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <i
              className="ti ti-logout"
              style={{
                fontSize: `${Math.min(18, sizes.mobileTopFontSize * 1.1)}px`,
                color: C.logout,
              }}
            />
          </button>
        </div>
      )}

      {expanded && !isMobile && (
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
        onClick={toggleSidebar}
      >
        {/* header */}
        <div
          className="nstp-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: expanded ? "flex-start" : "center",
            padding: expanded ? "0 18px" : "0",
            minHeight: 46,
          }}
        >
          <Link
            href="/student/dashboard"
            style={{
              width: expanded ? 46 : COLLAPSED_W - 28,
              display: "flex",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Image
              src="/nstp-logo.jpg"
              alt="NSTP UP Baguio Logo"
              width={46}
              height={46}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
              }}
              priority
            />
          </Link>

          <div
            className="nstp-expand"
            style={{
              marginLeft: expanded ? 10 : 0,
              overflow: "hidden",
              flexShrink: 0,
              maxWidth: expanded ? 200 : 0,
              opacity: expanded ? 1 : 0,
              transition: 'max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s',
            }}
          >
            <div className={goblin.className}
              style={{
                color: "#fff",
                fontSize: 30,
                fontWeight: 100,
                letterSpacing: 0.5,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              NSTP
            </div>

            <div className={cormorant.className}
              style={{
                fontSize: 10,
                fontWeight: 15,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.4,
                marginTop: 4,
                whiteSpace: "nowrap",
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
            margin: "8px 18px 8px",
          }}
        />

        <nav
          className="nstp-scroll-dark"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "6px 8px",
          }}
        >
          <div
            className={`nstp-menu${isAdminMode && isMobile ? " admin-mobile-menu" : ""}`}
            style={{ position: "relative" }}
          >
            {!isAdminMode && (
              <div
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
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    maxWidth: expanded ? 200 : 0,
                    overflow: "hidden",
                    opacity: expanded ? 1 : 0,
                    transition: "max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease 0.15s",
                  }}
                >
                  MAIN
                </span>
              </div>
            )}

            {isMobile ? (
              <>
                {navItems.map(renderMobileNavLink)}

                {!isAdminMode && (
                  <Link
                    href="/student/profile"
                    className={`nstp-link profile-link${pathname === "/student/profile" ? " active" : ""}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: sizes.item,
                      minWidth: sizes.item,
                      borderRadius: 10,
                      textDecoration: "none",
                      flexShrink: 0,
                      padding: "1px 2px",
                    }}
                  >
                    <span
                      style={{
                        width: `${sizes.mobileIconSize + 10}px`,
                        height: `${sizes.mobileIconSize + 10}px`,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "50%",
                        transition: "background 0.15s ease",
                        background: pathname === "/student/profile" ? C.activeBg : "transparent",
                        padding: "1px",
                      }}
                    >
                      {studentData?.avatarUrl ? (
                        <img
                          src={studentData.avatarUrl}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          className="nstp-avatar-image"
                          style={{
                            width: `${sizes.mobileIconSize}px`,
                            height: `${sizes.mobileIconSize}px`,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "none",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="nstp-avatar-fallback" style={{
                          width: `${sizes.mobileIconSize}px`,
                          height: `${sizes.mobileIconSize}px`,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.1)",
                        }}>
                          <i
                            className="ti ti-user"
                            style={{
                              fontSize: `${Math.max(8, sizes.mobileIconSize * 0.6)}px`,
                              color: pathname === "/student/profile" ? C.activeText : C.idleText,
                            }}
                          />
                        </div>
                      )}
                    </span>
                    <span
                      className="nstp-label"
                      style={{
                        display: "block",
                        fontSize: `${sizes.mobileLabelSize}px`,
                        fontWeight: pathname === "/student/profile" ? 700 : 500,
                        color: pathname === "/student/profile" ? "#ffffff" : "rgba(255,255,255,0.7)",
                        textAlign: "center",
                        lineHeight: 1,
                        letterSpacing: "0.02px",
                        marginTop: "1px",
                        whiteSpace: "nowrap",
                        width: "auto",
                        maxWidth: `${sizes.item + 4}px`,
                        overflow: "visible",
                        textOverflow: "clip",
                      }}
                    >
                      Profile
                    </span>
                  </Link>
                )}
              </>
            ) : navGroups ? (
              navGroups.map((group, groupIndex) => (
                <div                  key={group.heading}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: groupIndex > 0 ? 8 : 0,
                  }}
                >
                  {groupIndex > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: C.divider,
                        margin: expanded ? "12px 12px 10px" : "8px 18px 8px",
                      }}
                    />
                  )}
                  <div
                    style={{
                      margin: "4px 12px 2px",
                      display: expanded || groupIndex === 0 ? "flex" : "none",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        maxWidth: expanded ? 200 : 0,
                        overflow: "hidden",
                        opacity: expanded ? 1 : 0,
                        transition: "max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease 0.15s",
                      }}
                    >
                      {group.heading}
                    </span>
                  </div>
                  {group.items.map(renderDesktopNavLink)}
                </div>
              ))
            ) : (
              navItems.map(renderDesktopNavLink)
            )}
          </div>
        </nav>

        <div
          className="nstp-logout"
          style={{
            padding: "8px 8px 8px",
            display: "flex",
            justifyContent: expanded || isMobile ? "flex-start" : "center",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSignOut()
            }}
            title={!expanded && !isMobile ? "Log Out" : undefined}
            className="nstp-link"
            style={{
              display: "flex",
              alignItems: "center",
              height: 46,
              width: expanded || isMobile ? "100%" : 46,
              alignSelf: expanded || isMobile ? "auto" : "center",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              overflow: "hidden",
              padding: 0,
              fontFamily: "inherit",
              ...(isMobile ? mobileItemStyles : {}),
            }}
          >
            <span
              style={{
                width: expanded || isMobile ? COLLAPSED_W - 16 : "100%",
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <i
                className="ti ti-logout"
                style={{
                  fontSize: 20,
                  color: C.logout,
                }}
              />
            </span>

            <span
              className="nstp-expand"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: C.logout,
                maxWidth: expanded ? 200 : 0,
                opacity: expanded ? 1 : 0,
                transition: 'max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease 0.1s',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
            >
              Log Out
            </span>
          </button>
        </div>
      </aside>
    </>
  )

  if (children == null) {
    return sidebarContent
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
      {sidebarContent}
      <main
        className={`nstp-layout-main with-responsive-sidebar ${mainClassName ?? ""}`.trim()}
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : COLLAPSED_W + RAIL_MARGIN * 2,
          padding: isMobile ? "10px" : "36px 28px",
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  )
}