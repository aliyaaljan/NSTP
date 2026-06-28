"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const C = {
  maroonDark:"#6B0D10",
  gold:"#C8A84B",
  goldText:"#4A2C00",
}

interface ProfilePillProps {
  name:string
  initials:string
  section:string
}

export default function ProfilePill({
  name,
  initials,
  section
}:ProfilePillProps){

  const pathname = usePathname()
  
  // Profile route based on the current path
  const getProfileLink = () => {
    if (pathname?.startsWith('/student/leader')) {
      return '/student/leader/profile'
    }
    return '/student/profile'
  }

  return (
    <Link
      href={getProfileLink()}
      style={{
        display:"flex",
        alignItems:"center",
        gap:10,
        background:C.maroonDark,
        borderRadius:40,
        padding:"7px 18px 7px 8px",
        textDecoration:"none"
      }}
    >
      <div
        style={{
          width:36,
          height:36,
          borderRadius:"50%",
          background:C.gold,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          fontSize:11,
          fontWeight:700,
          color:C.goldText
        }}
      >
        {initials}
      </div>

      <div>
        <div
          style={{
            color:"#fff",
            fontSize:13,
            fontWeight:700
          }}
        >
          {name}
        </div>

        <div
          style={{
            color:"rgba(255,255,255,.7)",
            fontSize:11
          }}
        >
          NSTP - {section}
        </div>
      </div>
    </Link>
  )
}