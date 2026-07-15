"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createHoliday } from "@/lib/admin/settings-actions"
import {
  collectHolidayFieldErrors,
  emptyHolidayCreatePayload,
  type HolidayCreatePayload,
  type HolidayFieldErrors,
} from "@/lib/admin/settings-edit"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
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
  const [fieldErrors, setFieldErrors] = useState<HolidayFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyHolidayCreatePayload(termId))
    setFieldErrors({})
    setFormError(null)
  }, [termId])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyHolidayCreatePayload(termId))
      setFieldErrors({})
      setFormError(null)
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
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof HolidayCreatePayload)[]) {
        if (key === "name") delete next.name
        if (key === "date") delete next.date
      }
      return next
    })
    setFormError(null)
  }

  function handleAdd() {
    const nextErrors = collectHolidayFieldErrors(form)
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    startTransition(async () => {
      const result = await createHoliday(form)
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

          <AdminFormField
            label="Holiday Name:"
            htmlFor="holiday_name"
            error={fieldErrors.name}
          >
            <AdminTextInput
              id="holiday_name"
              name="holiday_name"
              value={form.name}
              onChange={(name) => patchForm({ name })}
              placeholder="e.g. National Heroes Day"
              invalid={Boolean(fieldErrors.name)}
            />
          </AdminFormField>

          <AdminFormField label="Date:" htmlFor="holiday_date" error={fieldErrors.date}>
            <AdminTextInput
              id="holiday_date"
              name="holiday_date"
              type="date"
              value={form.date}
              onChange={(date) => patchForm({ date })}
              invalid={Boolean(fieldErrors.date)}
            />
          </AdminFormField>

          <AdminFormField label="Description (optional):" htmlFor="holiday_description">
            <AdminTextInput
              id="holiday_description"
              name="holiday_description"
              value={form.description ?? ""}
              onChange={(description) =>
                patchForm({ description: description.trim() || null })
              }
              placeholder="e.g. Regular holiday"
            />
          </AdminFormField>

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
              <i className="ti ti-plus" style={{ fontSize: 16 }} />
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
