"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { updateAdviser } from "@/lib/admin/adviser-list-actions"
import {
  adviserRowToEditPayload,
  validateAdviserEditPayload,
  type AdviserEditPayload,
} from "@/lib/admin/adviser-edit"
import type { AdviserListRow } from "@/lib/admin/adviser-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  border: "#ECECEA",
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
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
      {hint && (
        <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "email"
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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

export default function EditAdviserModal({
  open,
  adviser,
  onClose,
}: {
  open: boolean
  adviser: AdviserListRow | null
  onClose: () => void
}) {
  const [form, setForm] = useState<AdviserEditPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(adviser ? adviserRowToEditPayload(adviser) : null)
    setError(null)
  }, [adviser])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open && adviser) {
      setForm(adviserRowToEditPayload(adviser))
      setError(null)
    }
  }, [open, adviser])

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

  function patchForm(updates: Partial<AdviserEditPayload>) {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  function handleSave() {
    if (!form) return

    const validationError = validateAdviserEditPayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateAdviser(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open || !adviser || !form) return null

  const sectionsLabel =
    adviser.sectionNames.length > 0 ? adviser.sectionNames.join(", ") : "—"

  const canSave =
    !isPending && Boolean(form.fullName.trim() && form.email.trim())

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
        aria-labelledby="edit-adviser-title"
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
          <h2 id="edit-adviser-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Edit Adviser
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
          <div
            style={{
              ...TYPE.body,
              color: COLORS.textGray,
              background: "#F9F9F7",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
              {adviser.studentCount} students · {adviser.avgCompletionPct}% avg completion
            </div>
            <div style={{ marginTop: 4 }}>
              {adviser.pendingRequestCount} pending request
              {adviser.pendingRequestCount === 1 ? "" : "s"}
            </div>
            <div style={{ marginTop: 4 }}>Section/s: {sectionsLabel}</div>
          </div>

          <FormField label="Full Name">
            <TextInput
              value={form.fullName}
              onChange={(fullName) => patchForm({ fullName })}
              placeholder="Adviser full name"
            />
          </FormField>

          <FormField label="Email" hint="Must be a UP email (@up.edu.ph).">
            <TextInput
              type="email"
              value={form.email}
              onChange={(email) => patchForm({ email })}
              placeholder="name@up.edu.ph"
            />
          </FormField>

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

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
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
            onClick={close}
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
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...TYPE.bodyBold,
              fontFamily: FONT_HEADING,
              color: "#fff",
              background: canSave ? COLORS.headerGreen : "#A8B5AD",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              cursor: canSave ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="ti ti-device-floppy" style={{ fontSize: 16 }} />
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
