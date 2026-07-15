"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAcademicYear } from "@/lib/admin/settings-actions"
import {
  emptyAcademicYearCreatePayload,
  validateAcademicYearCreatePayload,
  type AcademicYearCreatePayload,
} from "@/lib/admin/settings-edit"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

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

const inputStyle: React.CSSProperties = {
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
}

export default function AddAcademicYearModal({open, onClose,}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState<AcademicYearCreatePayload>(emptyAcademicYearCreatePayload())
  const [yearStart, setYearStart] = useState("")
  const [yearEnd, setYearEnd] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAcademicYearCreatePayload())
    setYearStart("")
    setYearEnd("")
    setError(null)
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

  useEffect(() => {
    const combined = yearStart && yearEnd ? `${yearStart}-${yearEnd}` : ""
    setForm((prev) => (prev.schoolYear === combined ? prev : { ...prev, schoolYear: combined }))
  }, [yearStart, yearEnd])

  function patchForm(updates: Partial<AcademicYearCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleYearStartChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4)
    setYearStart(digitsOnly)
    setYearEnd(digitsOnly.length === 4 ? String(Number(digitsOnly) + 1) : "")
  }

  function handleAdd() {
    const validationError = validateAcademicYearCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createAcademicYear(form)
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
    Boolean(
      yearStart.length === 4 &&
        form.semester.trim() &&
        form.startDate &&
        form.endDate
    )

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
          <FormField label="School Year:" htmlFor="school_year_start">
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
                style={inputStyle}
              />
              <span style={{ ...TYPE.bodyBold, color: COLORS.textGray }}>–</span>
              <input
                id="school_year_end"
                name="school_year_end"
                type="text"
                value={yearEnd}
                disabled
                placeholder="2027"
                style={{...inputStyle, cursor: "not-allowed",}}
              />
            </div>
          </FormField>

          <FormField label="Semester:" htmlFor="semester">
            <div style={{ position: "relative" }}>
              <select
                id="semester"
                name="semester"
                value={form.semester}
                onChange={(e) => patchForm({ semester: e.target.value })}
                style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}
              >
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <i
                className="ti ti-chevron-down"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: COLORS.textGray,
                }}
              />
            </div>
          </FormField>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField label="Start Date:" htmlFor="start_date">
              <input
                id="start_date"
                name="start_date"
                type="date"
                value={form.startDate}
                onChange={(e) => patchForm({ startDate: e.target.value })}
                style={inputStyle}
              />
            </FormField>
            <FormField label="End Date:" htmlFor="end_date">
              <input
                id="end_date"
                name="end_date"
                type="date"
                value={form.endDate}
                onChange={(e) => patchForm({ endDate: e.target.value })}
                style={inputStyle}
              />
            </FormField>
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
              <i className="ti ti-plus" style={{ fontSize: 16 }} />
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}