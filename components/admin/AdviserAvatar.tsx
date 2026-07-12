"use client"

import { FONT_BODY } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

export function AdviserAvatar({
  fullName,
  initials,
  photoUrl,
  size = 64,
}: {
  fullName: string
  initials: string
  photoUrl?: string | null
  size?: number
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        referrerPolicy="no-referrer"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: COLORS.maroon,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_BODY,
        fontSize: size >= 64 ? 14 : 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
