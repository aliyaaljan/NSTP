"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Montserrat } from "next/font/google"
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
  Sidebar: React.ComponentType
}

export default function LoadingPage({ 
  Sidebar, 
}: LoadingPageProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsSmallMobile(width < 480)
    }
    
    handleResize()
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

  return (
    <div
      className={montserrat.variable}
      style={{
        fontFamily: "'Montserrat', 'Fallback Montserrat'",
        background: C.pageBg,
        height: "100vh", 
        display: "flex",
        fontSize: isSmallMobile ? "12px" : "13px",
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : 0,
        overflow: "hidden", 
        position: "relative", 
      }}
    >
      <Sidebar />

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
          marginTop: isMobile ? '60px' : 0,
        }}
      >

        {/* Loading Content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isSmallMobile ? "16px" : isMobile ? "20px" : "24px",
        }}>
          {/* NSTP Logo */}
          <div style={{
            position: "relative",
            width: isSmallMobile ? 120 : isMobile ? 160 : 220,
            height: isSmallMobile ? 120 : isMobile ? 160 : 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            }}>
              <Image
                src="/nstp-logo.jpg"
                alt="NSTP UP Baguio Logo"
                width={isSmallMobile ? 96 : isMobile ? 130 : 180}
                height={isSmallMobile ? 96 : isMobile ? 130 : 180}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  animation: "logoInnerPump 1.8s ease-in-out infinite",
                }}
                priority
              />
            </div>
          </div>

          {/* Loading Text */}
          <div style={{
            textAlign: "center",
            marginTop: isSmallMobile ? "2px" : isMobile ? "3px" : "4px",
          }}>
            <div className={goblin.className}
              style={{
                fontSize: isSmallMobile ? "24px" : isMobile ? "28px" : "36px",
                fontWeight: 100,
                color: C.maroon,
                letterSpacing: 2,
                marginBottom: isSmallMobile ? 0 : isMobile ? 0 : 1,
              }}
            >
              NSTP
            </div>
            <div className={goblin.className}
              style={{
                fontSize: isSmallMobile ? "10px" : isMobile ? "12px" : "14px",
                fontWeight: 900,
                color: C.maroon,
                opacity: 0.7,
                letterSpacing: 0.5,
                fontFamily: "'Cormorant', 'Fallback Cormorant'",
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
          }}>
            <span style={{
              width: isSmallMobile ? 6 : isMobile ? 8 : 10,
              height: isSmallMobile ? 6 : isMobile ? 8 : 10,
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite",
            }} />
            <span style={{
              width: isSmallMobile ? 6 : isMobile ? 8 : 10,
              height: isSmallMobile ? 6 : isMobile ? 8 : 10,
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite 0.2s",
            }} />
            <span style={{
              width: isSmallMobile ? 6 : isMobile ? 8 : 10,
              height: isSmallMobile ? 6 : isMobile ? 8 : 10,
              borderRadius: "50%",
              background: C.maroon,
              opacity: 0.2,
              animation: "dotPulse 1.4s ease-in-out infinite 0.4s",
            }} />
          </div>
        </div>
      </main>

      {/* Animations */}
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
    </div>
  )
}