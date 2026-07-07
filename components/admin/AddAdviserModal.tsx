"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAdviser } from "@/lib/admin/adviser-list-actions"
import {
  emptyAdviserCreatePayload,
  validateAdviserCreatePayload,
  type AdviserCreatePayload,
} from "@/lib/admin/adviser-edit"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
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

export default function AddAdviserModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<AdviserCreatePayload>(emptyAdviserCreatePayload())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAdviserCreatePayload())
    setError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyAdviserCreatePayload())
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

  function patchForm(updates: Partial<AdviserCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleAdd() {
    const validationError = validateAdviserCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createAdviser(form)
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
          <FormField label="Full Name">
            <TextInput
              value={form.fullName}
              onChange={(fullName) => patchForm({ fullName })}
              placeholder="Facilitator full name"
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
