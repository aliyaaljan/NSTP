"use client"

import ProfilePill from "@/components/shared/StudentProfilePill"
import { C } from "./theme"

export function PageHeader({
  isMobile,
  profile,
}: {
  isMobile: boolean
  profile?: { name: string; initials: string; section: string }
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "12px",
        width: "100%",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: isMobile ? "20px" : "32px",
            fontWeight: 800,
            color: C.maroon,
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Scan History
        </h1>
      </div>

      {!isMobile && (
        <div style={{ flexShrink: 0 }}>
          <ProfilePill
            name={profile?.name ?? ""}
            initials={profile?.initials ?? ""}
            section={profile?.section ?? ""}
          />
        </div>
      )}
    </div>
  )
}