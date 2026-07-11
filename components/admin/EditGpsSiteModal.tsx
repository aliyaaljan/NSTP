"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { updateSite } from "@/lib/admin/site-list-actions"
import {
  siteRowToUpdatePayload,
  validateSiteUpdatePayload,
  type SiteUpdatePayload,
} from "@/lib/admin/site-edit"
import type { SiteListRow, SiteListSectionOption } from "@/lib/admin/site-list"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { clearFormSession, isFormDirty, shouldLoadFormSession, snapshotForm } from "@/lib/admin/form-dirty"
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

export default function EditGpsSiteModal({
  open,
  site,
  gpsSections,
  onClose,
}: {
  open: boolean
  site: SiteListRow | null
  gpsSections: SiteListSectionOption[]
  onClose: () => void
}) {
  const [form, setForm] = useState<SiteUpdatePayload | null>(null)
  const [initialForm, setInitialForm] = useState<SiteUpdatePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const selectedSupervisor = useMemo(() => {
    if (!form) return ""
    const section = gpsSections.find((s) => s.sectionId === form.sectionId)
    return section?.supervisorName ?? site?.supervisorName ?? ""
  }, [gpsSections, form, site?.supervisorName])

  const classOptions = useMemo(
    () =>
      gpsSections.map((section) => ({
        value: section.sectionId,
        label: section.label,
      })),
    [gpsSections]
  )

  const close = useCallback(() => {
    clearFormSession(loadedSessionRef)
    setForm(null)
    setInitialForm(null)
    setError(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (
      !shouldLoadFormSession(open, site?.geofenceId ?? null, loadedSessionRef) ||
      !site
    ) {
      return
    }

    const next = snapshotForm(siteRowToUpdatePayload(site))
    setForm(next)
    setInitialForm(snapshotForm(next))
    setError(null)
  }, [open, site])

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

  function patchForm(updates: Partial<SiteUpdatePayload>) {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  function handleSave() {
    if (!form) return

    const validationError = validateSiteUpdatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateSite(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open || !site || !form) return null

  const isDirty =
    form && initialForm ? isFormDirty(initialForm, form) : false

  const canSave =
    !isPending &&
    isDirty &&
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
        aria-labelledby="edit-gps-site-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 920,
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
            id="edit-gps-site-title"
            style={{ ...TYPE.h2, fontFamily: FONT_HEADING, color: "#fff", margin: 0 }}
          >
            Edit GPS Site
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
            handleSave()
          }}
          style={{
            padding: "24px 22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
              <FormField label="NSTP Site:" htmlFor="edit_gps_site_name">
                <TextInput
                  id="edit_gps_site_name"
                  name="site_name"
                  value={form.siteName}
                  onChange={(siteName) => patchForm({ siteName })}
                  placeholder="e.g. Baguio City — Main Campus"
                />
              </FormField>

              <FormField label="Class:" htmlFor="edit_gps_section_id">
                <SearchableCombobox
                  key={site.geofenceId}
                  id="edit_gps_section_id"
                  name="section_id"
                  value={form.sectionId}
                  onChange={(sectionId) => patchForm({ sectionId })}
                  options={classOptions}
                  placeholder="Select class"
                  emptyMessage="No classes found"
                  toggleAriaLabel="Toggle class list"
                />
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
                    onChange={(e) =>
                      patchForm({ radiusMeters: parseInt(e.target.value, 10) || 0 })
                    }
                    style={{
                      accentColor: COLORS.headerGreen,
                      width: "100%",
                      cursor: "pointer",
                      appearance: "none",
                      WebkitAppearance: "none",
                      height: "8px",
                      borderRadius: "6px",
                      outline: "none",
                      background:
                        form.radiusMeters >= 1000
                          ? COLORS.headerGreen
                          : `linear-gradient(to right, ${COLORS.headerGreen} 0%, ${COLORS.headerGreen} ${((form.radiusMeters - 10) / 990) * 100}%, ${COLORS.fieldBg} ${((form.radiusMeters - 10) / 990) * 100}%, ${COLORS.fieldBg} 100%)`,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      ...TYPE.caption,
                      color: COLORS.textDark,
                      fontWeight: 600,
                    }}
                  >
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

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  ...TYPE.body,
                  color: COLORS.textDark,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patchForm({ isActive: e.target.checked })}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: COLORS.headerGreen,
                    cursor: "pointer",
                  }}
                />
                Site is active
              </label>
            </div>

            <div
              style={{
                minHeight: 420,
                height: "100%",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Map
                center={[form.centerLatitude, form.centerLongitude]}
                radius={form.radiusMeters}
                onCenterChange={(lat, lng) =>
                  patchForm({ centerLatitude: lat, centerLongitude: lng })
                }
              />
            </div>
          </div>

          {error && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="submit"
              disabled={!canSave}
              style={{
                ...TYPE.bodyBold,
                fontFamily: FONT_HEADING,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: canSave ? COLORS.headerGreen : "#A8B5AD",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "10px 22px",
                cursor: canSave ? "pointer" : "not-allowed",
                opacity: canSave ? 1 : 1,
              }}
            >
              <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
              {isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
