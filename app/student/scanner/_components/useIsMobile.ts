import { useState, useEffect } from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isSmallMobile, setIsSmallMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      setIsSmallMobile(width < 480)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  
  return { isMobile, isSmallMobile, isTablet }
}