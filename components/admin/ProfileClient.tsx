"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import AdminProfilePill from "@/components/admin/AdminProfilePill"
import { EmailNotification } from "@/components/shared/EmailNotification"
import { PushNotification } from "@/components/shared/PushNotification"
import { formatProfileDate, type AdminProfile } from "@/lib/admin/profile"
import type { AdminCurrentUser } from "@/lib/admin/settings"
import { formatAuditLogTimestamp } from "@/lib/admin/audit-log"
import { signOutWithAudit } from "@/lib/auth-actions"
import { FONT_BODY, PAGE_TITLE, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"
import { getInitials } from "@/app/facilitator/facilitator"

function ProfileCard({ profile }: { profile: AdminProfile }) {
  const initials = getInitials(profile.fullName)

  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        padding: "28px 24px 24px",
        boxShadow: COLORS.cardShadow,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minWidth: 280,
        maxWidth: 360,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: profile.avatarUrl ? "transparent" : COLORS.maroon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: 16,
          border: `3px solid ${COLORS.border}`,
        }}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: 700,
              fontFamily: FONT_BODY,
            }}
          >
            {initials}
          </span>
        )}
      </div>

      <h2
        style={{
          ...TYPE.h1,
          fontSize: 20,
          fontWeight: 800,
          color: COLORS.text,
          margin: "0 0 6px",
        }}
      >
        {profile.fullName}
      </h2>

      <span
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: 999,
          background: COLORS.maroonBgLight,
          color: COLORS.maroon,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 20,
        }}
      >
        {profile.roleName}
      </span>

      <div
        style={{
          width: "100%",
          display: "grid",
          gap: 12,
          textAlign: "left",
        }}
      >
        <ProfileField label="Email" value={profile.email || "—"} />
        <ProfileField
          label="Account status"
          value={profile.isActive ? "Active" : "Inactive"}
          valueColor={profile.isActive ? COLORS.green : COLORS.amber}
        />
        <ProfileField label="Member since" value={formatProfileDate(profile.createdAt)} />
        <ProfileField label="Last updated" value={formatProfileDate(profile.updatedAt)} />
      </div>
    </div>
  )
}

function ProfileField({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: COLORS.iconBg,
      }}
    >
      <div
        style={{
          ...TYPE.sectionLabel,
          color: COLORS.textGray,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...TYPE.body,
          color: valueColor ?? COLORS.text,
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.border}`,
        borderRadius: COLORS.radius,
        boxShadow: COLORS.cardShadow,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "16px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: COLORS.maroon }} />
        <h3 style={{ ...TYPE.h2, margin: 0, color: COLORS.text }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SecurityRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderTop: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: COLORS.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: COLORS.maroon }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.caption, color: COLORS.textGray }}>{label}</div>
        <div style={{ ...TYPE.bodyBold, color: COLORS.text, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function AccountSecurityCard({ profile }: { profile: AdminProfile }) {
  const router = useRouter()
  const [isSigningOut, startSignOut] = useTransition()

  function handleSignOut() {
    startSignOut(async () => {
      await signOutWithAudit()
      router.push("/")
      router.refresh()
    })
  }

  return (
    <SettingsCard title="Account Security" icon="ti-shield-lock">
      <SecurityRow
        label="Sign-in method"
        value={profile.signInMethod}
        icon="ti-login"
      />
      <SecurityRow
        label="Last sign-in"
        value={
          profile.lastSignInAt
            ? formatAuditLogTimestamp(profile.lastSignInAt)
            : "—"
        }
        icon="ti-clock"
      />
      <div
        style={{
          padding: "16px 20px",
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 999,
            border: `1.5px solid ${COLORS.maroon}`,
            background: "#fff",
            color: COLORS.maroon,
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 700,
            cursor: isSigningOut ? "not-allowed" : "pointer",
            opacity: isSigningOut ? 0.7 : 1,
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: 16 }} />
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </SettingsCard>
  )
}

export default function ProfileClient({
  profile,
  currentUser,
}: {
  profile: AdminProfile
  currentUser: AdminCurrentUser
}) {
  return (
    <div style={{ padding: "8px 4px 32px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ ...PAGE_TITLE, color: COLORS.maroon, margin: 0 }}>Profile</h1>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
            Your account details and notification preferences
          </p>
        </div>
        <AdminProfilePill user={currentUser} />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <ProfileCard profile={profile} />

        <div
          style={{
            flex: 1,
            minWidth: 320,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <SettingsCard title="Notifications" icon="ti-bell">
            <PushNotification />
            <EmailNotification />
          </SettingsCard>

          <AccountSecurityCard profile={profile} />
        </div>
      </div>
    </div>
  )
}
