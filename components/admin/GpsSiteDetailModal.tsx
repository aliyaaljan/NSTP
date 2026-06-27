"use client"

import { useEffect } from "react"
import type { GpsSite } from "@/lib/admin/settings"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "132px 1fr",
        gap: 16,
        alignItems: "baseline",
        padding: "12px 0",
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <dt style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>{label}</dt>
      <dd style={{ ...TYPE.body, color: COLORS.textDark, margin: 0, fontWeight: 600 }}>
        {value}
      </dd>
    </div>
  )
}

export default function GpsSiteDetailModal({
  open,
  site,
  onClose,
}: {
  open: boolean
  site: GpsSite | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!open || !site) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "rgba(44, 44, 42, 0.35)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gps-site-detail-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: COLORS.radius,
          overflow: "hidden",
          background: COLORS.white,
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          fontFamily: FONT_BODY,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 22px 16px",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div>
            <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "0 0 4px" }}>
              GPS Site
            </p>
            <h2
              id="gps-site-detail-title"
              style={{ ...TYPE.h1, color: COLORS.textDark, margin: 0 }}
            >
              {site.siteName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: COLORS.textGray,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <dl style={{ margin: 0, padding: "4px 22px 20px" }}>
          <InfoRow label="Section" value={site.sectionName} />
          <InfoRow label="Supervisor" value={site.supervisorName} />
          <InfoRow label="Radius" value={`${site.radiusMeters} meters`} />
          <InfoRow
            label="Coordinates"
            value={`${site.centerLatitude.toFixed(6)}, ${site.centerLongitude.toFixed(6)}`}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "132px 1fr",
              gap: 16,
              alignItems: "center",
              padding: "12px 0 0",
            }}
          >
            <dt style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>Status</dt>
            <dd style={{ margin: 0 }}>
              <span
                style={{
                  ...TYPE.caption,
                  fontWeight: 700,
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: site.isActive ? COLORS.greenBgLight : COLORS.maroonBgLight,
                  color: site.isActive ? COLORS.green : COLORS.maroon,
                }}
              >
                {site.isActive ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
