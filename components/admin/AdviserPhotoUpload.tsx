"use client"

import { useRef, useState } from "react"
import { validateAdviserPhotoFile } from "@/lib/admin/adviser-photo-client"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
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

export default function AdviserPhotoUpload({
  fullName,
  initials,
  photoUrl,
  onPhotoChange,
}: {
  fullName: string
  initials: string
  photoUrl: string | null
  onPhotoChange: (photoUrl: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function openFilePicker() {
    inputRef.current?.click()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    const validationError = validateAdviserPhotoFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    onPhotoChange(URL.createObjectURL(file))
  }

  function handleRemove() {
    if (!photoUrl) return

    setError(null)
    onPhotoChange(null)
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <AdviserAvatar
          fullName={fullName}
          initials={initials}
          photoUrl={photoUrl}
          size={72}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={openFilePicker}
              style={{
                ...TYPE.bodyBold,
                fontFamily: FONT_BODY,
                color: COLORS.textDark,
                background: "#EBEBE8",
                border: "none",
                borderRadius: 999,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              <i className="ti ti-upload" style={{ marginRight: 6 }} />
              {photoUrl ? "Change photo" : "Upload photo"}
            </button>
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  ...TYPE.bodyBold,
                  fontFamily: FONT_BODY,
                  color: COLORS.maroon,
                  background: COLORS.maroonBgLight,
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
            JPG, PNG, WebP, or GIF · max 2 MB
          </p>
          <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>
            Preview only — photos are not saved until backend is connected.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-hidden
      />

      {error && (
        <p style={{ ...TYPE.caption, color: COLORS.maroon, margin: "8px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  )
}
