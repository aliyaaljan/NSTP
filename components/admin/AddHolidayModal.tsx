"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createHoliday } from "@/lib/admin/settings-actions"
import {
  emptyHolidayCreatePayload,
  validateHolidayCreatePayload,
  type HolidayCreatePayload,
} from "@/lib/admin/settings-edit"
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

export default function AddHolidayModal({
  open,
  termId,
  onClose,
}: {
  open: boolean
  termId: string
  onClose: () => void
}) {
  const [form, setForm] = useState<HolidayCreatePayload>(emptyHolidayCreatePayload(termId))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyHolidayCreatePayload(termId))
    setError(null)
  }, [termId])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyHolidayCreatePayload(termId))
      setError(null)
    }
  }, [open, termId])

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

  function patchForm(updates: Partial<HolidayCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleAdd() {
    const validationError = validateHolidayCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createHoliday(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

  const canAdd = !isPending && Boolean(form.name.trim() && form.date)

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
        aria-labelledby="add-holiday-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
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
            id="add-holiday-title"
            style={{ ...TYPE.h2, fontFamily: FONT_HEADING, color: "#fff", margin: 0 }}
          >
            Add Holiday
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
          <input type="hidden" name="term_id" value={form.termId} />

          <FormField label="Holiday Name:" htmlFor="holiday_name">
            <input
              id="holiday_name"
              name="holiday_name"
              type="text"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              placeholder="e.g. National Heroes Day"
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
          </FormField>

          <FormField label="Date:" htmlFor="holiday_date">
            <input
              id="holiday_date"
              name="holiday_date"
              type="date"
              value={form.date}
              onChange={(e) => patchForm({ date: e.target.value })}
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
          </FormField>

          <FormField label="Description (optional):" htmlFor="holiday_description">
            <input
              id="holiday_description"
              name="holiday_description"
              type="text"
              value={form.description ?? ""}
              onChange={(e) =>
                patchForm({ description: e.target.value.trim() || null })
              }
              placeholder="e.g. Regular holiday"
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
          </FormField>

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
              <i className="ti ti-plus" style={{ fontSize: 16 }} />
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
