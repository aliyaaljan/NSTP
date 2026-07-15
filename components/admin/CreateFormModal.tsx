"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { createForm, updateForm } from "@/lib/admin/form-list-actions"
import {
  collectFormFieldErrors,
  emptyFormCreatePayload,
  formRowToEditPayload,
  FORM_GLOBAL_SECTION,
  type FormCreatePayload,
  type FormEditPayload,
  type FormFieldErrors,
} from "@/lib/admin/form-edit"
import type { FormListSectionOption } from "@/lib/admin/form-list"
import { isFormDirty, shouldLoadFormSession, snapshotForm } from "@/lib/admin/form-dirty"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
}

export default function CreateFormModal({
  open,
  mode,
  sections,
  initialEdit,
  onClose,
}: {
  open: boolean
  mode: "create" | "edit"
  sections: FormListSectionOption[]
  initialEdit?: FormEditPayload | null
  onClose: () => void
}) {
  const [form, setForm] = useState<FormCreatePayload>(emptyFormCreatePayload())
  const [initialForm, setInitialForm] = useState<FormCreatePayload | null>(null)
  const [editMeta, setEditMeta] = useState<{
    formRequirementId: string
    listSectionId: string
    isGlobal: boolean
  } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setForm(emptyFormCreatePayload())
    setInitialForm(null)
    setEditMeta(null)
    setFieldErrors({})
    setFormError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      loadedSessionRef.current = null
      return
    }

    if (mode === "edit" && initialEdit) {
      const sessionKey = `edit:${initialEdit.formRequirementId}:${initialEdit.listSectionId}`
      if (!shouldLoadFormSession(open, sessionKey, loadedSessionRef)) return

      const snapshot = snapshotForm<FormCreatePayload>({
        title: initialEdit.title,
        description: initialEdit.description,
        dueDate: initialEdit.dueDate,
        sectionId: initialEdit.sectionId,
      })
      setForm(snapshot)
      setInitialForm(snapshotForm(snapshot))
      setEditMeta({
        formRequirementId: initialEdit.formRequirementId,
        listSectionId: initialEdit.listSectionId,
        isGlobal: initialEdit.isGlobal,
      })
      setFieldErrors({})
      setFormError(null)
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

  const classOptions = useMemo(
    () => [
      { value: FORM_GLOBAL_SECTION, label: "All classes (global default)" },
      ...sections.map((section) => ({
        value: section.sectionId,
        label: section.label,
      })),
    ],
    [sections]
  )

  if (!open) return null

  function patchForm(updates: Partial<FormCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof FormCreatePayload)[]) {
        if (key === "title") delete next.title
        if (key === "dueDate") delete next.dueDate
      }
      return next
    })
    setFormError(null)
  }

  function handleSubmit() {
    const nextErrors = collectFormFieldErrors(form)
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    if (mode === "edit" && editMeta) {
      const payload: FormEditPayload = {
        ...form,
        formRequirementId: editMeta.formRequirementId,
        listSectionId: editMeta.listSectionId,
        isGlobal: editMeta.isGlobal,
      }

      startTransition(async () => {
        const result = await updateForm(payload)
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
      const result = await createForm(form)
      if (!result.ok) {
        setFormError(result.error)
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

  const canSubmit = !isPending && (mode === "create" || isDirty)

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
        aria-labelledby="create-form-title"
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
            id="create-form-title"
            style={{
              ...TYPE.h1,
              fontFamily: FONT_HEADING,
              color: "#fff",
              margin: 0,
            }}
          >
            {mode === "edit" ? "Edit Form" : "Create Form"}
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
          <AdminFormField label="Form Name" error={fieldErrors.title}>
            <AdminTextInput
              value={form.title}
              onChange={(title) => patchForm({ title })}
              placeholder="e.g. Daily Time Record"
              invalid={Boolean(fieldErrors.title)}
            />
          </AdminFormField>

          <AdminFormField label="Description" hint="Optional instructions for students.">
            <AdminTextInput
              value={form.description ?? ""}
              onChange={(description) =>
                patchForm({ description: description.trim() || null })
              }
              placeholder="Optional description"
            />
          </AdminFormField>

          <AdminFormField label="Due Date" hint="Leave blank for no deadline." error={fieldErrors.dueDate}>
            <AdminTextInput
              type="date"
              value={form.dueDate ?? ""}
              onChange={(dueDate) => patchForm({ dueDate: dueDate || null })}
              invalid={Boolean(fieldErrors.dueDate)}
            />
          </AdminFormField>

          <AdminFormField
            label="Class"
            hint={
              mode === "edit" && editMeta?.isGlobal
                ? "This form is a global default. Class scope cannot be changed here."
                : "Global forms apply to every class unless excluded."
            }
          >
            <SearchableCombobox
              key={editMeta ? `${editMeta.formRequirementId}:${editMeta.listSectionId}` : "create"}
              value={form.sectionId ?? FORM_GLOBAL_SECTION}
              onChange={(sectionId) => patchForm({ sectionId })}
              options={classOptions}
              placeholder="Select class"
              emptyMessage="No classes found"
              toggleAriaLabel="Toggle class list"
              disabled={mode === "edit" && Boolean(editMeta?.isGlobal)}
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
            disabled={!canSubmit}
            style={{
              ...TYPE.bodyBold,
              background: canSubmit ? COLORS.headerGreen : "#A8B5AD",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 1,
            }}
          >
            {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Form"}
          </button>
        </div>
      </div>
    </div>
  )
}
