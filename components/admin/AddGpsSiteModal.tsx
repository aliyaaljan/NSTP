"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { createSite } from "@/lib/admin/site-list-actions"
import {
  collectSiteFieldErrors,
  emptySiteCreatePayload,
  type SiteCreatePayload,
  type SiteFieldErrors,
} from "@/lib/admin/site-edit"
import type { SiteListSectionOption } from "@/lib/admin/site-list"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { isFormDirty } from "@/lib/admin/form-dirty"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

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

/** Loose bounding box around the Philippines — a sanity hint, not a hard rule. */
function isOutsidePhilippines(lat: number, lng: number): boolean {
  return lat < 4 || lat > 21 || lng < 116 || lng > 127
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
  const initialPayload = emptySiteCreatePayload()
  const [form, setForm] = useState<SiteCreatePayload>(initialPayload)
  const [latInput, setLatInput] = useState(String(initialPayload.centerLatitude))
  const [lngInput, setLngInput] = useState(String(initialPayload.centerLongitude))
  const [fieldErrors, setFieldErrors] = useState<SiteFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const classOptions = useMemo(
    () =>
      gpsSections.map((section) => ({
        value: section.sectionId,
        label: section.label,
      })),
    [gpsSections]
  )

  const reset = useCallback(() => {
    const empty = emptySiteCreatePayload()
    setForm(empty)
    setLatInput(String(empty.centerLatitude))
    setLngInput(String(empty.centerLongitude))
    setFieldErrors({})
    setFormError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const isDirty = isFormDirty(emptySiteCreatePayload(), form)

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return
    close()
  }, [isDirty, close])

  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, requestClose])

  function patchForm(updates: Partial<SiteCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof SiteCreatePayload)[]) {
        if (key === "siteName") delete next.siteName
        if (key === "sectionId") delete next.sectionId
        if (key === "radiusMeters") delete next.radiusMeters
      }
      return next
    })
    setFormError(null)
  }

  function handleLatChange(value: string) {
    setLatInput(value)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.centerLatitude
      return next
    })
    setFormError(null)
  }

  function handleLngChange(value: string) {
    setLngInput(value)
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.centerLongitude
      return next
    })
    setFormError(null)
  }

  const parsedLat = Number.parseFloat(latInput)
  const latValid = Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90
  const parsedLng = Number.parseFloat(lngInput)
  const lngValid = Number.isFinite(parsedLng) && parsedLng >= -180 && parsedLng <= 180

  // Keep the map/payload in sync with the latest VALID coordinate only — an
  // in-progress or invalid keystroke never silently collapses to 0.
  useEffect(() => {
    if (latValid) patchForm({ centerLatitude: parsedLat })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latValid, parsedLat])
  useEffect(() => {
    if (lngValid) patchForm({ centerLongitude: parsedLng })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lngValid, parsedLng])

  const showOutsidePhWarning =
    latValid && lngValid && isOutsidePhilippines(parsedLat, parsedLng)

  function handleAdd() {
    const nextErrors = collectSiteFieldErrors({
      siteName: form.siteName,
      sectionId: form.sectionId,
      radiusMeters: form.radiusMeters,
      latInput,
      lngInput,
    })
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    const payload: SiteCreatePayload = {
      ...form,
      centerLatitude: parsedLat,
      centerLongitude: parsedLng,
    }

    startTransition(async () => {
      const result = await createSite(payload)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

  const canAdd = !isPending

  return (
    <div
      role="presentation"
      onClick={requestClose}
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
            onClick={requestClose}
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
          <AdminFormField
            label="Site Name:"
            htmlFor="gps_site_name"
            error={fieldErrors.siteName}
          >
            <AdminTextInput
              id="gps_site_name"
              name="site_name"
              value={form.siteName}
              onChange={(siteName) => patchForm({ siteName })}
              placeholder="e.g. Baguio City — Main Campus"
              invalid={Boolean(fieldErrors.siteName)}
            />
          </AdminFormField>

          <AdminFormField label="Class:" error={fieldErrors.sectionId}>
            <SearchableCombobox
              id="gps_section_id"
              name="section_id"
              value={form.sectionId}
              onChange={(sectionId) => patchForm({ sectionId })}
              options={classOptions}
              placeholder="Select class"
              emptyMessage="No classes found"
              toggleAriaLabel="Toggle class list"
            />
          </AdminFormField>

          <AdminFormField
            label="Site Radius (meters):"
            htmlFor="gps_site_radius"
            error={fieldErrors.radiusMeters}
          >
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
          </AdminFormField>

          <div className="flex flex-row gap-6 w-full">
            <div className="flex-1">
              <AdminFormField
                label="Latitude:"
                htmlFor="gps_center_latitude"
                error={fieldErrors.centerLatitude}
              >
                <AdminTextInput
                  id="gps_center_latitude"
                  name="center_latitude"
                  type="number"
                  value={latInput}
                  onChange={handleLatChange}
                  placeholder="16.411100"
                  invalid={Boolean(fieldErrors.centerLatitude)}
                />
              </AdminFormField>
            </div>

            <div className="flex-1">
              <AdminFormField
                label="Longitude:"
                htmlFor="gps_center_longitude"
                error={fieldErrors.centerLongitude}
              >
                <AdminTextInput
                  id="gps_center_longitude"
                  name="center_longitude"
                  type="number"
                  value={lngInput}
                  onChange={handleLngChange}
                  placeholder="120.596600"
                  invalid={Boolean(fieldErrors.centerLongitude)}
                />
              </AdminFormField>
            </div>
          </div>

          {showOutsidePhWarning && (
            <p style={{ ...TYPE.caption, color: "#8A6D00", margin: 0 }}>
              These coordinates are outside the Philippines — double-check latitude/longitude
              aren&apos;t swapped.
            </p>
          )}

          {latValid && lngValid && (
            <div style={{ height: 300, borderRadius: 8, overflow: "hidden" }}>
              <Map
                center={[form.centerLatitude, form.centerLongitude]}
                radius={form.radiusMeters}
                onCenterChange={(lat, lng) => {
                  patchForm({ centerLatitude: lat, centerLongitude: lng })
                  setLatInput(String(lat))
                  setLngInput(String(lng))
                }}
              />
            </div>
          )}

          {formError && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{formError}</p>
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
                background: canAdd ? COLORS.headerGreen : "#A8B5AD",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "10px 22px",
                cursor: canAdd ? "pointer" : "not-allowed",
                opacity: canAdd ? 1 : 0.5,
              }}
            >
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
