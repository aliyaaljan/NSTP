"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAdviser } from "@/lib/admin/adviser-list-actions"
import { isFormDirty } from "@/lib/admin/form-dirty"
import {
  emptyAdviserCreatePayload,
  type AdviserCreatePayload,
} from "@/lib/admin/adviser-edit"
import type { AdviserLookupOption, AdviserProfileLookups } from "@/lib/admin/adviser-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import {
  collectUserFieldErrors,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  type UserFieldErrors,
} from "@/lib/admin/user-field-validation"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

function LookupSelect({
  value,
  onChange,
  options,
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: AdviserLookupOption[]
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{
          width: "100%",
          ...TYPE.body,
          fontStyle: "normal",
          color: value ? COLORS.textDark : COLORS.textGray,
          background: COLORS.fieldBg,
          border: "none",
          borderRadius: 6,
          padding: "12px 40px 12px 14px",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {/* Enabled (not disabled) so the value can be cleared back to null. */}
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
          fontSize: 16,
          color: COLORS.textGray,
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

export default function AddAdviserModal({
  open,
  lookups,
  onClose,
}: {
  open: boolean
  lookups: AdviserProfileLookups
  onClose: () => void
}) {
  const [form, setForm] = useState<AdviserCreatePayload>(emptyAdviserCreatePayload())
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAdviserCreatePayload())
    setFieldErrors({})
    setFormError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const isDirty = isFormDirty(emptyAdviserCreatePayload(), form)

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return
    close()
  }, [isDirty, close])

  useEffect(() => {
    if (open) {
      setForm(emptyAdviserCreatePayload())
      setFieldErrors({})
      setFormError(null)
    }
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

  function patchForm(updates: Partial<AdviserCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof AdviserCreatePayload)[]) {
        if (key === "fullName") delete next.fullName
        if (key === "email") delete next.email
      }
      return next
    })
    setFormError(null)
  }

  function handleAdd() {
    const nextErrors = collectUserFieldErrors({
      fullName: form.fullName,
      email: form.email,
    })
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    startTransition(async () => {
      const result = await createAdviser(form)
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
        aria-labelledby="add-adviser-title"
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
          <h2 id="add-adviser-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Add Facilitator
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

        <div
          style={{
            padding: "24px 22px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxHeight: "min(70vh, 580px)",
            overflowY: "auto",
          }}
        >
          <AdminFormField label="Full Name" error={fieldErrors.fullName}>
            <AdminTextInput
              value={form.fullName}
              onChange={(fullName) => patchForm({ fullName })}
              placeholder="Facilitator full name"
              maxLength={FULL_NAME_MAX_LENGTH}
              invalid={Boolean(fieldErrors.fullName)}
            />
          </AdminFormField>

          <AdminFormField label="Email" error={fieldErrors.email}>
            <AdminTextInput
              type="email"
              value={form.email}
              onChange={(email) => patchForm({ email })}
              placeholder="name@up.edu.ph"
              maxLength={EMAIL_MAX_LENGTH}
              invalid={Boolean(fieldErrors.email)}
            />
          </AdminFormField>

          <AdminFormField label="College">
            <LookupSelect
              value={form.collegeId}
              onChange={(collegeId) => patchForm({ collegeId })}
              options={lookups.colleges}
            />
          </AdminFormField>

          <AdminFormField
            label="NSTP Component"
            hint="Optional. When set, auto-creates their class for the active term (e.g. NSTP 2 LTS). Leave blank to add without a class."
          >
            <LookupSelect
              value={form.nstpComponentId}
              onChange={(nstpComponentId) => patchForm({ nstpComponentId })}
              options={lookups.components}
            />
          </AdminFormField>

          <AdminFormField label="Partnership Type">
            <AdminTextInput
              value={form.partnershipType ?? ""}
              onChange={(partnershipType) =>
                patchForm({ partnershipType: partnershipType || null })
              }
              placeholder="e.g. LGU, NGO, School"
            />
          </AdminFormField>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              ...TYPE.body,
              fontStyle: "normal",
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
            Active account
          </label>

          {formError && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{formError}</p>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={requestClose}
            disabled={isPending}
            style={{
              ...TYPE.bodyBold,
              color: COLORS.textDark,
              background: COLORS.fieldBg,
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              ...TYPE.bodyBold,
              fontFamily: FONT_HEADING,
              color: "#fff",
              background: canAdd ? COLORS.headerGreen : "#A8B5AD",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: canAdd ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 16 }} />
            {isPending ? "Adding…" : "Add Facilitator"}
          </button>
        </div>
      </div>
    </div>
  )
}
