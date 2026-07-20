"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Cormorant, Montserrat } from "next/font/google"
import { Goblin_One } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

const goblin = Goblin_One({
  subsets: ["latin"],
  weight: "400",
})

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const C = {
  green: '#14492E',
  maroon: "#7B1113",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  border: "#ECECEA",
}

const COLLAPSED_W = 88
const RAIL_MARGIN = 16

interface LoadingPageProps {
  Sidebar?: React.ComponentType
  /** When true, render only the loading animation (no sidebar / full-page shell). */
  embedded?: boolean
}

export default function LoadingPage({
  Sidebar,
  embedded = false,
}: LoadingPageProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Calculate sizes immediately on mount
    const calculateSizes = () => {
      const width = window.innerWidth
      const mobile = width < 768
      const tablet = width >= 768 && width < 1024
      const smallMobile = width < 480
      
      setIsMobile(mobile)
      setIsTablet(tablet)
      setIsSmallMobile(smallMobile)
      setIsReady(true)
    }

    calculateSizes()

    const handleResize = () => {
      calculateSizes()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getResponsivePadding = () => {
    if (isMobile) {
      const bottomPadding = isSmallMobile ? 100 : 110
      return {
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: isSmallMobile ? '12px' : '14px',
        paddingBottom: `${bottomPadding}px`,
        gap: isSmallMobile ? '12px' : '14px',
      }
    }
    
    if (isTablet) {
      return {
        paddingLeft: `${COLLAPSED_W + RAIL_MARGIN * 2 + 12}px`,
        paddingRight: '24px',
        paddingTop: '24px',
        paddingBottom: '24px',
        gap: '20px',
      }
    }
    
    return {
      paddingLeft: `${COLLAPSED_W + RAIL_MARGIN * 2 + 16}px`,
      paddingRight: '32px',
      paddingTop: '28px',
      paddingBottom: '28px',
      gap: '24px',
    }
  }

  const responsivePadding = getResponsivePadding()

  // Get size values based on current state
  const getLogoSize = () => {
    if (isSmallMobile) return 120
    if (isMobile) return 160
    return 220
  }

  const getImageSize = () => {
    if (isSmallMobile) return 96
    if (isMobile) return 130
    return 180
  }

  const getTitleSize = () => {
    if (isSmallMobile) return "24px"
    if (isMobile) return "28px"
    return "36px"
  }

  const getSubtitleSize = () => {
    if (isSmallMobile) return "10px"
    if (isMobile) return "12px"
    return "14px"
  }

  const getDotSize = () => {
    if (isSmallMobile) return 6
    if (isMobile) return 8
    return 10
  }

  const getGapSize = () => {
    if (isSmallMobile) return "16px"
    if (isMobile) return "20px"
    return "24px"
  }

  const getFontSize = () => {
    if (isSmallMobile) return "12px"
    return "13px"
  }

  const loadingContent = (
    <main
      style={{
        flex: 1,
        paddingLeft: responsivePadding.paddingLeft,
        paddingRight: responsivePadding.paddingRight,
        paddingTop: responsivePadding.paddingTop,
        paddingBottom: responsivePadding.paddingBottom,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: responsivePadding.gap,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        transition: "padding 0.3s ease",
        marginTop: isMobile ? "60px" : 0,
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: getGapSize(),
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}>
          {/* NSTP Logo */}
          <div style={{
            position: "relative",
            width: getLogoSize(),
            height: getLogoSize(),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(123, 17, 19, 0.15)",
              animation: "logoPump 1.8s ease-in-out infinite",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateZ(0)",
              WebkitTransform: "translateZ(0)",
            }}>
              <Image
                src="/nstp-logo.jpg"
                alt="NSTP UP Baguio Logo"
                width={getImageSize()}
                height={getImageSize()}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  animation: "logoInnerPump 1.8s ease-in-out infinite",
                  transform: "translateZ(0)",
                  WebkitTransform: "translateZ(0)",
                }}
                priority
                sizes="(max-width: 480px) 96px, (max-width: 768px) 130px, 180px"
              />
            </div>
          </div>

          {/* Loading Text */}
          <div style={{
            textAlign: "center",
            marginTop: isSmallMobile ? "2px" : isMobile ? "3px" : "4px",
            // Prevent zoom issues
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
          }}>
            <div className={goblin.className}
              style={{
                fontSize: getTitleSize(),
                fontWeight: 100,
                color: C.maroon,
                letterSpacing: 2,
                marginBottom: isSmallMobile ? 0 : isMobile ? 0 : 1,
                lineHeight: 1.2,
              }}
            >
              NSTP
            </div>
            <div className={cormorant.className}
              style={{
                fontSize: getSubtitleSize(),
                fontWeight: 900,
                color: C.maroon,
                opacity: 0.7,
                letterSpacing: 0.5,
                fontFamily: "'Cormorant', 'Fallback Cormorant'",
                lineHeight: 1.4,
              }}
            >
              University of the Philippines Baguio
            </div>
          </div>

          {/* Ellipsis */}
          <div style={{
            display: "flex",
            gap: isSmallMobile ? 6 : isMobile ? 8 : 10,
            alignItems: "center",
            justifyContent: "center",
            marginTop: isSmallMobile ? 2 : isMobile ? 3 : 4,
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
          }}>
            <span style={{
              width: getDotSize(),
              height: getDotSize(),
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite",
              flexShrink: 0,
            }} />
            <span style={{
              width: getDotSize(),
              height: getDotSize(),
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite 0.2s",
              flexShrink: 0,
            }} />
            <span style={{
              width: getDotSize(),
              height: getDotSize(),
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite 0.4s",
              flexShrink: 0,
            }} />
          </div>
        </div>
    </main>
  )

  const loadingAnimations = (
    <style>{`
        @keyframes logoPump {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 32px rgba(123, 17, 19, 0.15);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 12px 48px rgba(123, 17, 19, 0.2);
          }
        }

        @keyframes logoInnerPump {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
  )

  const shellStyle = {
    fontFamily: "'Montserrat', 'Fallback Montserrat'",
    background: C.pageBg,
    height: "100vh",
    width: "100vw",
    display: "flex" as const,
    fontSize: getFontSize(),
    paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : 0,
    overflow: "hidden" as const,
    touchAction: "manipulation" as const,
    WebkitTextSizeAdjust: "100%" as const,
    MozTextSizeAdjust: "100%" as const,
    textSizeAdjust: "100%" as const,
  }

  // Don't render until sizes are calculated
  if (!isReady) {
    return (
      <div
        style={{
          ...shellStyle,
          ...(embedded
            ? { position: "fixed" as const, inset: 0, zIndex: 1 }
            : { position: "relative" as const }),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ opacity: 0 }}>Loading...</div>
      </div>
    )
  }

  if (embedded) {
    return (
      <div
        className={montserrat.variable}
        style={{
          ...shellStyle,
          position: "fixed",
          inset: 0,
          zIndex: 1,
        }}
      >
        {loadingContent}
        {loadingAnimations}
      </div>
    )
  }

  if (!Sidebar) {
    throw new Error("LoadingPage requires a Sidebar when embedded is false")
  }

  return (
    <div
      className={montserrat.variable}
      style={{
        ...shellStyle,
        position: "relative",
      }}
    >
      <Sidebar />
      {loadingContent}
      {loadingAnimations}
    </div>
  )
}