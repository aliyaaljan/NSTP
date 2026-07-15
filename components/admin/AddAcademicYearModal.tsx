"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAcademicYear } from "@/lib/admin/settings-actions"
import {
  collectAcademicYearFieldErrors,
  emptyAcademicYearCreatePayload,
  type AcademicYearCreatePayload,
  type AcademicYearFieldErrors,
} from "@/lib/admin/settings-edit"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import {
  ADMIN_FIELD_ERROR_STYLE,
  ADMIN_FIELD_NORMAL_STYLE,
  AdminFormField,
  AdminNativeSelect,
  AdminTextInput,
} from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

const SEMESTER_OPTIONS = [
  { value: "first", label: "1st Semester" },
  { value: "second", label: "2nd Semester" },
  { value: "midyear", label: "Midyear" },
]

export default function AddAcademicYearModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<AcademicYearCreatePayload>(emptyAcademicYearCreatePayload())
  const [yearStart, setYearStart] = useState("")
  const [yearEnd, setYearEnd] = useState("")
  const [fieldErrors, setFieldErrors] = useState<AcademicYearFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAcademicYearCreatePayload())
    setYearStart("")
    setYearEnd("")
    setFieldErrors({})
    setFormError(null)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyAcademicYearCreatePayload())
      setYearStart("")
      setYearEnd("")
      setFieldErrors({})
      setFormError(null)
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

  useEffect(() => {
    const combined = yearStart && yearEnd ? `${yearStart}-${yearEnd}` : ""
    setForm((prev) => (prev.schoolYear === combined ? prev : { ...prev, schoolYear: combined }))
  }, [yearStart, yearEnd])

  function patchForm(updates: Partial<AcademicYearCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof AcademicYearCreatePayload)[]) {
        if (key === "schoolYear") delete next.schoolYear
        if (key === "semester") delete next.semester
        if (key === "startDate") delete next.startDate
        if (key === "endDate") delete next.endDate
      }
      return next
    })
    setFormError(null)
  }

  function handleYearStartChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4)
    setYearStart(digitsOnly)
    setYearEnd(digitsOnly.length === 4 ? String(Number(digitsOnly) + 1) : "")
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.schoolYear
      return next
    })
    setFormError(null)
  }

  function handleAdd() {
    const nextErrors = collectAcademicYearFieldErrors(form)
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    startTransition(async () => {
      const result = await createAcademicYear(form)
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

  const yearInputStyle = fieldErrors.schoolYear
    ? ADMIN_FIELD_ERROR_STYLE
    : ADMIN_FIELD_NORMAL_STYLE

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
        aria-labelledby="add-academic-year-title"
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
            id="add-academic-year-title"
            style={{ ...TYPE.h2, fontFamily: FONT_HEADING, color: "#fff", margin: 0 }}
          >
            New Academic Year
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
          <AdminFormField
            label="School Year:"
            htmlFor="school_year_start"
            error={fieldErrors.schoolYear}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                id="school_year_start"
                name="school_year_start"
                type="text"
                inputMode="numeric"
                value={yearStart}
                onChange={(e) => handleYearStartChange(e.target.value)}
                placeholder="2026"
                maxLength={4}
                aria-invalid={Boolean(fieldErrors.schoolYear) || undefined}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  ...TYPE.body,
                  fontStyle: "normal",
                  color: COLORS.textDark,
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                  ...yearInputStyle,
                }}
              />
              <span style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>–</span>
              <input
                id="school_year_end"
                name="school_year_end"
                type="text"
                value={yearEnd}
                disabled
                placeholder="2027"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  ...TYPE.body,
                  fontStyle: "normal",
                  color: COLORS.textGray,
                  background: "#F5F4F1",
                  border: "1.5px solid transparent",
                  borderRadius: 6,
                  padding: "12px 14px",
                  outline: "none",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </AdminFormField>

          <AdminFormField label="Semester:" error={fieldErrors.semester}>
            <AdminNativeSelect
              value={form.semester}
              onChange={(semester) => patchForm({ semester })}
              invalid={Boolean(fieldErrors.semester)}
            >
              {SEMESTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminNativeSelect>
          </AdminFormField>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <AdminFormField label="Start Date:" htmlFor="start_date" error={fieldErrors.startDate}>
              <AdminTextInput
                id="start_date"
                name="start_date"
                type="date"
                value={form.startDate}
                onChange={(startDate) => patchForm({ startDate })}
                invalid={Boolean(fieldErrors.startDate)}
              />
            </AdminFormField>
            <AdminFormField label="End Date:" htmlFor="end_date" error={fieldErrors.endDate}>
              <AdminTextInput
                id="end_date"
                name="end_date"
                type="date"
                value={form.endDate}
                onChange={(endDate) => patchForm({ endDate })}
                invalid={Boolean(fieldErrors.endDate)}
              />
            </AdminFormField>
          </div>

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
