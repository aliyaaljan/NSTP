"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { createSite } from "@/lib/admin/site-list-actions"
import {
  emptySiteCreatePayload,
  validateSiteCreatePayload,
  type SiteCreatePayload,
} from "@/lib/admin/site-edit"
import type { SiteListSectionOption } from "@/lib/admin/site-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

//Map
import dynamic from "next/dynamic"
const Map = dynamic(() => import("@/components/admin/AdminMap"), { ssr: false })

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{
          ...TYPE.bodyBold,
          color: COLORS.textDark,
          display: "block",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
  step,
}: {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "number" | "range"
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}  
      max={max}  
      step={step}
      style={{
        width: "100%",
        boxSizing: "border-box",
        ...TYPE.body,
        fontStyle: "normal",
        color: COLORS.textDark,
        background: COLORS.fieldBg,
        border: "none",
        borderRadius: 6,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  )
}

export default function AddGpsSiteModal({
  open,
  gpsSections,
  onClose,
}: {
  open: boolean
  gpsSections: SiteListSectionOption[]
  onClose: () => void
}) {
  const [form, setForm] = useState<SiteCreatePayload>(emptySiteCreatePayload())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedSupervisor = useMemo(() => {
    const section = gpsSections.find((s) => s.sectionId === form.sectionId)
    return section?.supervisorName ?? ""
  }, [gpsSections, form.sectionId])

  const reset = useCallback(() => {
    setForm(emptySiteCreatePayload())
    setError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptySiteCreatePayload())
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, close])

  function patchForm(updates: Partial<SiteCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleAdd() {
    const validationError = validateSiteCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createSite(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

  const canAdd =
    !isPending &&
    Boolean(form.siteName.trim() && form.sectionId && form.radiusMeters > 0)

  return (
    <div
      role="presentation"
      onClick={close}
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
        aria-labelledby="add-gps-site-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            background: COLORS.headerGreen,
          }}
        >
          <h2
            id="add-gps-site-title"
            style={{ ...TYPE.h2, fontFamily: FONT_HEADING, color: "#fff", margin: 0 }}
          >
            Add Site
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAdd()
          }}
          style={{
            padding: "24px 22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <FormField label="Site Name:" htmlFor="gps_site_name">
            <TextInput
              id="gps_site_name"
              name="site_name"
              value={form.siteName}
              onChange={(siteName) => patchForm({ siteName })}
              placeholder="e.g. Baguio City — Main Campus"
            />
          </FormField>

          <FormField label="Section:" htmlFor="gps_section_id">
            <div style={{ position: "relative" }}>
              <select
                id="gps_section_id"
                name="section_id"
                value={form.sectionId}
                onChange={(e) => patchForm({ sectionId: e.target.value })}
                style={{
                  width: "100%",
                  ...TYPE.body,
                  fontStyle: "normal",
                  color: form.sectionId ? COLORS.textDark : COLORS.textGray,
                  background: COLORS.fieldBg,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 40px 12px 14px",
                  appearance: "none",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="" disabled>
                  Select section
                </option>
                {gpsSections.map((section) => (
                  <option key={section.sectionId} value={section.sectionId}>
                    {section.label}
                  </option>
                ))}
              </select>
              <i
                className="ti ti-chevron-down"
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  fontSize: 16,
                  color: COLORS.textGray,
                }}
              />
            </div>
          </FormField>
          
          <FormField label="Site Radius (meters):" htmlFor="gps_site_radius">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                id="gps_site_radius"
                name="site_radius"
                type="range"
                min={10}
                max={1000}
                step={10}
                value={form.radiusMeters}
                onChange={(e) => patchForm({ radiusMeters: parseInt(e.target.value, 10) || 0 })}
                style={{
                  accentColor: COLORS.headerGreen,
                  width: "100%",
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                  height: "8px",
                  borderRadius: "6px",
                  outline: "none",
                  background: form.radiusMeters >= 1000 
                    ? COLORS.headerGreen  
                    : `linear-gradient(to right, ${COLORS.headerGreen} 0%, ${COLORS.headerGreen} ${((form.radiusMeters - 10) / 990) * 100}%, ${COLORS.fieldBg} ${((form.radiusMeters - 10) / 990) * 100}%, ${COLORS.fieldBg} 100%)`,
                }}
              />
              
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                ...TYPE.caption, 
                color: COLORS.textDark,
                fontWeight: 600 
              }}>
                <span>Min: 10m</span>
                <span style={{ color: COLORS.headerGreen, fontSize: "15px" }}>
                  Selected: {form.radiusMeters} meters
                </span>
                <span>Max: 1km</span>
              </div>

            </div>
          </FormField>

          <div className="flex flex-row gap-6 w-full">
            <div className="flex-1">
              <FormField label="Latitude:" htmlFor="gps_center_latitude">
              <TextInput
                id="gps_center_latitude"
                name="center_latitude"
                type="number"
                value={String(form.centerLatitude)}
                onChange={(v) => patchForm({ centerLatitude: parseFloat(v) || 0 })}
                placeholder="16.411100"
              />
            </FormField>
            </div>
            
            <div className="flex-1">
              <FormField label="Longitude:" htmlFor="gps_center_longitude">
              <TextInput
                id="gps_center_longitude"
                name="center_longitude"
                type="number"
                value={String(form.centerLongitude)}
                onChange={(v) => patchForm({ centerLongitude: parseFloat(v) || 0 })}
                placeholder="120.596600"
              />
            </FormField>
            </div>
          </div>

          <div style={{ height: 300, borderRadius: 8, overflow: "hidden" }}>
            <Map
              center={[form.centerLatitude, form.centerLongitude]}
              radius={form.radiusMeters}
              onCenterChange={(lat, lng) =>
                patchForm({ centerLatitude: lat, centerLongitude: lng })
              }
            />
          </div>

          {error && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="submit"
              disabled={!canAdd}
              style={{
                ...TYPE.bodyBold,
                fontFamily: FONT_HEADING,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: COLORS.headerGreen,
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "10px 22px",
                cursor: canAdd ? "pointer" : "not-allowed",
                opacity: canAdd ? 1 : 0.5,
              }}
            >
              {/* <i className="ti ti-plus" style={{ fontSize: 16 }} /> */}
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
