"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createForm, updateForm } from "@/lib/admin/form-list-actions"
import {
  emptyFormCreatePayload,
  formRowToEditPayload,
  FORM_GLOBAL_SECTION,
  validateFormCreatePayload,
  validateFormEditPayload,
  type FormCreatePayload,
  type FormEditPayload,
} from "@/lib/admin/form-edit"
import type { FormListSectionOption } from "@/lib/admin/form-list"
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
  type?: "text" | "date"
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

function SectionSelect({
  value,
  onChange,
  sections,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  sections: FormListSectionOption[]
  disabled?: boolean
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        disabled={disabled}
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
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <option value={FORM_GLOBAL_SECTION}>All sections (global default)</option>
        {sections.map((section) => (
          <option key={section.sectionId} value={section.sectionId}>
            Section {section.name}
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
  const [editMeta, setEditMeta] = useState<{
    formRequirementId: string
    listSectionId: string
    isGlobal: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyFormCreatePayload())
    setEditMeta(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return
    if (mode === "edit" && initialEdit) {
      setForm({
        title: initialEdit.title,
        description: initialEdit.description,
        dueDate: initialEdit.dueDate,
        sectionId: initialEdit.sectionId,
      })
      setEditMeta({
        formRequirementId: initialEdit.formRequirementId,
        listSectionId: initialEdit.listSectionId,
        isGlobal: initialEdit.isGlobal,
      })
    } else {
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

  if (!open) return null

  function patchForm(updates: Partial<FormCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function handleSubmit() {
    setError(null)

    if (mode === "edit" && editMeta) {
      const payload: FormEditPayload = {
        ...form,
        formRequirementId: editMeta.formRequirementId,
        listSectionId: editMeta.listSectionId,
        isGlobal: editMeta.isGlobal,
      }
      const validationError = validateFormEditPayload(payload)
      if (validationError) {
        setError(validationError)
        return
      }

      startTransition(async () => {
        const result = await updateForm(payload)
        if (!result.ok) {
          setError(result.error)
          return
        }
        onClose()
        window.location.reload()
      })
      return
    }

    const validationError = validateFormCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    startTransition(async () => {
      const result = await createForm(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onClose()
      window.location.reload()
    })
  }

  const canSubmit = Boolean(form.title.trim())

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
          <FormField label="Form Name">
            <TextInput
              value={form.title}
              onChange={(title) => patchForm({ title })}
              placeholder="e.g. Daily Time Record"
            />
          </FormField>

          <FormField label="Description" hint="Optional instructions for students.">
            <TextInput
              value={form.description ?? ""}
              onChange={(description) =>
                patchForm({ description: description.trim() || null })
              }
              placeholder="Optional description"
            />
          </FormField>

          <FormField label="Due Date" hint="Leave blank for no deadline.">
            <TextInput
              type="date"
              value={form.dueDate ?? ""}
              onChange={(dueDate) => patchForm({ dueDate: dueDate || null })}
            />
          </FormField>

          <FormField
            label="Section"
            hint={
              mode === "edit" && editMeta?.isGlobal
                ? "This form is a global default. Section scope cannot be changed here."
                : "Global forms apply to every section unless excluded."
            }
          >
            <SectionSelect
              value={form.sectionId ?? FORM_GLOBAL_SECTION}
              onChange={(sectionId) => patchForm({ sectionId })}
              sections={sections}
              disabled={mode === "edit" && Boolean(editMeta?.isGlobal)}
            />
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
              background: COLORS.headerGreen,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: !canSubmit || isPending ? "not-allowed" : "pointer",
              opacity: !canSubmit || isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Form"}
          </button>
        </div>
      </div>
    </div>
  )
}
