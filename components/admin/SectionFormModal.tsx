"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import {
  AdminFormField,
  AdminNativeSelect,
  AdminTextInput,
} from "@/components/admin/AdminFormControls"
import { createSection, updateSection } from "@/lib/admin/section-list-actions"
import {
  collectSectionFieldErrors,
  emptySectionCreatePayload,
  SECTION_COURSE_OPTIONS,
  type SectionCreatePayload,
  type SectionEditPayload,
  type SectionFieldErrors,
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

function isSectionCourseCode(
  value: string
): value is (typeof SECTION_COURSE_OPTIONS)[number] {
  return SECTION_COURSE_OPTIONS.includes(
    value as (typeof SECTION_COURSE_OPTIONS)[number]
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
  const [fieldErrors, setFieldErrors] = useState<SectionFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setForm(emptySectionCreatePayload())
    setInitialForm(null)
    setEditSectionId(null)
    setFieldErrors({})
    setFormError(null)
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
        courseCode: isSectionCourseCode(initialEdit.courseCode)
          ? initialEdit.courseCode
          : "",
        adviserUserId: advisers.some(
          (adviser) =>
            adviser.isActive && adviser.adviserUserId === initialEdit.adviserUserId
        )
          ? initialEdit.adviserUserId
          : "",
        statusCode: initialEdit.statusCode,
        requiredHourTotal: initialEdit.requiredHourTotal,
        dailyCutoffTime: initialEdit.dailyCutoffTime,
      })
      setForm(snapshot)
      setInitialForm(snapshotForm(snapshot))
      setEditSectionId(initialEdit.sectionId)
      setFieldErrors({})
      setFormError(null)
      return
    }

    if (mode === "create") {
      if (!shouldLoadFormSession(open, "create", loadedSessionRef)) return
      reset()
    }
  }, [open, mode, initialEdit, advisers, reset])

  const hasUnsavedChanges =
    mode === "edit" && initialForm
      ? isFormDirty(initialForm, form)
      : isFormDirty(emptySectionCreatePayload(), form)

  const requestClose = useCallback(() => {
    if (isPending) return
    if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) return
    onClose()
  }, [isPending, hasUnsavedChanges, onClose])

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

  const adviserOptions = useMemo(
    () =>
      advisers
        .filter((adviser) => adviser.isActive)
        .map((adviser) => ({
          value: adviser.adviserUserId,
          label: adviser.isAdmin ? `${adviser.fullName} (Admin)` : adviser.fullName,
        })),
    [advisers]
  )

  const statusOptions = useMemo(
    () => (mode === "create" ? statuses.filter((s) => s.code === "active") : statuses),
    [mode, statuses]
  )

  if (!open) return null

  function patchForm(updates: Partial<SectionCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof SectionCreatePayload)[]) {
        if (key === "courseCode") delete next.courseCode
        if (key === "adviserUserId") delete next.adviserUserId
        if (key === "requiredHourTotal") delete next.requiredHourTotal
        if (key === "dailyCutoffTime") delete next.dailyCutoffTime
      }
      return next
    })
    setFormError(null)
  }

  function handleSubmit() {
    const nextErrors = collectSectionFieldErrors(form)
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    if (mode === "edit" && editSectionId) {
      const payload: SectionEditPayload = {
        ...form,
        sectionId: editSectionId,
      }
      startTransition(async () => {
        const result = await updateSection(payload)
        if (!result.ok) {
          setFormError(result.error)
          return
        }
        onClose()
        window.location.reload()
      })
      return
    }

    startTransition(async () => {
      const result = await createSection(form, activeTermId)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      onClose()
      window.location.reload()
    })
  }

  const isDirty =
    mode === "edit" && initialForm ? isFormDirty(initialForm, form) : true

  const canSubmit = !isPending && (mode === "create" || isDirty)

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
            onClick={requestClose}
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
          <AdminFormField label="Course" error={fieldErrors.courseCode}>
            <AdminNativeSelect
              value={form.courseCode}
              onChange={(courseCode) => patchForm({ courseCode })}
              invalid={Boolean(fieldErrors.courseCode)}
            >
              <option value="">Select course</option>
              {SECTION_COURSE_OPTIONS.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </AdminNativeSelect>
          </AdminFormField>

          <AdminFormField label="Facilitator" error={fieldErrors.adviserUserId}>
            <SearchableCombobox
              key={editSectionId ?? "create"}
              value={form.adviserUserId}
              onChange={(adviserUserId) => patchForm({ adviserUserId })}
              options={adviserOptions}
              placeholder="Select facilitator"
              emptyMessage="No facilitators found"
              toggleAriaLabel="Toggle facilitator list"
            />
          </AdminFormField>

          <AdminFormField label="Status">
            <AdminNativeSelect
              value={form.statusCode}
              onChange={(statusCode) =>
                patchForm({
                  statusCode: statusCode as SectionCreatePayload["statusCode"],
                })
              }
            >
              {statusOptions.map((status) => (
                <option key={status.sectionStatusId} value={status.code}>
                  {status.name}
                </option>
              ))}
            </AdminNativeSelect>
          </AdminFormField>

          <AdminFormField label="Required Hours" error={fieldErrors.requiredHourTotal}>
            <AdminTextInput
              type="number"
              min={1}
              max={999}
              value={String(form.requiredHourTotal)}
              onChange={(value) =>
                patchForm({ requiredHourTotal: parseInt(value, 10) || 0 })
              }
              invalid={Boolean(fieldErrors.requiredHourTotal)}
            />
          </AdminFormField>

          <AdminFormField label="Daily Cutoff" error={fieldErrors.dailyCutoffTime}>
            <AdminTextInput
              type="time"
              value={form.dailyCutoffTime}
              onChange={(dailyCutoffTime) => patchForm({ dailyCutoffTime })}
              invalid={Boolean(fieldErrors.dailyCutoffTime)}
            />
          </AdminFormField>

          {formError && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{formError}</p>
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
            onClick={requestClose}
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
            disabled={!canSubmit}
            style={{
              ...TYPE.bodyBold,
              background: canSubmit ? COLORS.headerGreen : "#A8B5AD",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  )
}
