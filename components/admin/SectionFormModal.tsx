"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { createSection, updateSection } from "@/lib/admin/section-list-actions"
import {
  emptySectionCreatePayload,
  SECTION_COURSE_OPTIONS,
  sectionRowToEditPayload,
  validateSectionCreatePayload,
  validateSectionEditPayload,
  type SectionCourseCode,
  type SectionCreatePayload,
  type SectionEditPayload,
} from "@/lib/admin/section-edit"
import type {
  SectionListAdviserOption,
  SectionListStatusOption,
} from "@/lib/admin/section-list"
import { isFormDirty, shouldLoadFormSession, snapshotForm } from "@/lib/admin/form-dirty"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

function isSectionCourseCode(value: string): value is SectionCourseCode {
  return SECTION_COURSE_OPTIONS.includes(value as SectionCourseCode)
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

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        {children}
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

export default function SectionFormModal({
  open,
  mode,
  advisers,
  statuses,
  activeTermId,
  initialEdit,
  onClose,
}: {
  open: boolean
  mode: "create" | "edit"
  advisers: SectionListAdviserOption[]
  statuses: SectionListStatusOption[]
  activeTermId: string
  initialEdit?: SectionEditPayload | null
  onClose: () => void
}) {
  const [form, setForm] = useState<SectionCreatePayload>(emptySectionCreatePayload())
  const [initialForm, setInitialForm] = useState<SectionCreatePayload | null>(null)
  const [editSectionId, setEditSectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setForm(emptySectionCreatePayload())
    setInitialForm(null)
    setEditSectionId(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      loadedSessionRef.current = null
      return
    }

    if (mode === "edit" && initialEdit) {
      const sessionKey = `edit:${initialEdit.sectionId}`
      if (!shouldLoadFormSession(open, sessionKey, loadedSessionRef)) return

      const snapshot = snapshotForm<SectionCreatePayload>({
        courseCode: isSectionCourseCode(initialEdit.courseCode) ? initialEdit.courseCode : "",
        adviserUserId: initialEdit.adviserUserId,
        statusCode: initialEdit.statusCode,
        requiredHourTotal: initialEdit.requiredHourTotal,
        dailyCutoffTime: initialEdit.dailyCutoffTime,
      })
      setForm(snapshot)
      setInitialForm(snapshotForm(snapshot))
      setEditSectionId(initialEdit.sectionId)
      return
    }

    if (mode === "create") {
      if (!shouldLoadFormSession(open, "create", loadedSessionRef)) return
      reset()
    }
  }, [open, mode, initialEdit, reset])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose()
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, isPending, onClose])

  const adviserOptions = useMemo(
    () =>
      advisers.map((adviser) => ({
        value: adviser.adviserUserId,
        label: adviser.fullName,
      })),
    [advisers]
  )

  if (!open) return null

  function patchForm(updates: Partial<SectionCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleSubmit() {
    setError(null)

    if (mode === "edit" && editSectionId) {
      const payload: SectionEditPayload = {
        ...form,
        sectionId: editSectionId,
      }
      const validationError = validateSectionEditPayload(payload)
      if (validationError) {
        setError(validationError)
        return
      }

      startTransition(async () => {
        const result = await updateSection(payload)
        if (!result.ok) {
          setError(result.error)
          return
        }
        onClose()
        window.location.reload()
      })
      return
    }

    const validationError = validateSectionCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      const result = await createSection(form, activeTermId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
      window.location.reload()
    })
  }

  const isDirty =
    mode === "edit" && initialForm
      ? isFormDirty(initialForm, form)
      : true

  const canSubmit =
    Boolean(form.courseCode.trim()) &&
    Boolean(form.adviserUserId) &&
    isDirty

  return (
    <div
      role="presentation"
      onClick={isPending ? undefined : onClose}
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
        aria-labelledby="section-form-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 16,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            background: COLORS.headerGreen,
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            id="section-form-title"
            style={{
              ...TYPE.h1,
              fontFamily: FONT_HEADING,
              color: "#fff",
              margin: 0,
            }}
          >
            {mode === "edit" ? "Edit Class" : "Add Class"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: isPending ? "not-allowed" : "pointer",
              padding: 4,
              opacity: isPending ? 0.5 : 1,
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <FormField label="Course">
            <NativeSelect
              value={form.courseCode}
              onChange={(courseCode) => patchForm({ courseCode })}
            >
              <option value="">Select course</option>
              {SECTION_COURSE_OPTIONS.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField label="Adviser">
            <SearchableCombobox
              key={editSectionId ?? "create"}
              value={form.adviserUserId}
              onChange={(adviserUserId) => patchForm({ adviserUserId })}
              options={adviserOptions}
              placeholder="Select adviser"
              emptyMessage="No advisers found"
              toggleAriaLabel="Toggle adviser list"
            />
          </FormField>

          <FormField label="Status">
            <NativeSelect
              value={form.statusCode}
              onChange={(statusCode) =>
                patchForm({ statusCode: statusCode as SectionCreatePayload["statusCode"] })
              }
            >
              {statuses.map((status) => (
                <option key={status.sectionStatusId} value={status.code}>
                  {status.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {error && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{error}</p>
          )}
        </div>

        <div
          style={{
            padding: "16px 24px 24px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              ...TYPE.bodyBold,
              background: "none",
              border: "none",
              color: COLORS.textGray,
              cursor: isPending ? "not-allowed" : "pointer",
              padding: "10px 16px",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            style={{
              ...TYPE.bodyBold,
              background: canSubmit ? COLORS.headerGreen : "#A8B5AD",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: !canSubmit || isPending ? "not-allowed" : "pointer",
              opacity: !canSubmit || isPending ? 1 : 1,
            }}
          >
            {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  )
}
