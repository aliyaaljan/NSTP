"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import { updateStudent } from "@/lib/admin/student-list-actions"
import {
  studentRowToEditPayload,
  type StudentEditPayload,
} from "@/lib/admin/student-edit"
import type {
  StudentEnrollmentLookups,
  StudentListRow,
  StudentListSectionOption,
  StudentLookupOption,
} from "@/lib/admin/student-list"
import { clearFormSession, isFormDirty, shouldLoadFormSession, snapshotForm } from "@/lib/admin/form-dirty"
import { PROGRESS_STATUS_LABELS } from "@/lib/admin/student-progress"
import {
  collectUserFieldErrors,
  digitsOnly,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  SAIS_ID_MAX_LENGTH,
  STUDENT_NUMBER_LENGTH,
  type UserFieldErrors,
} from "@/lib/admin/user-field-validation"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  border: "#ECECEA",
}

function LookupSelect({
  value,
  onChange,
  options,
}: {
  value: string | null
  onChange: (value: string | null) => void
  options: StudentLookupOption[]
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
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
        {/* Enabled (not disabled) so the value can be cleared back to null. */}
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
          pointerEvents: "none",
          fontSize: 16,
          color: COLORS.textGray,
        }}
      />
    </div>
  )
}

export default function EditStudentModal({
  open,
  student,
  sections,
  lookups,
  onClose,
}: {
  open: boolean
  student: StudentListRow | null
  sections: StudentListSectionOption[]
  lookups: StudentEnrollmentLookups
  onClose: () => void
}) {
  const [form, setForm] = useState<StudentEditPayload | null>(null)
  const [initialForm, setInitialForm] = useState<StudentEditPayload | null>(null)
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const close = useCallback(() => {
    clearFormSession(loadedSessionRef)
    setForm(null)
    setInitialForm(null)
    setFieldErrors({})
    setFormError(null)
    onClose()
  }, [onClose])

  const isDirty = form && initialForm ? isFormDirty(initialForm, form) : false

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return
    close()
  }, [isDirty, close])

  useEffect(() => {
    if (
      !shouldLoadFormSession(
        open,
        student?.enrollmentId ?? null,
        loadedSessionRef
      ) ||
      !student
    ) {
      return
    }

    const next = snapshotForm(studentRowToEditPayload(student))
    setForm(next)
    setInitialForm(snapshotForm(next))
    setFieldErrors({})
    setFormError(null)
  }, [open, student])

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

  function patchForm(updates: Partial<StudentEditPayload>) {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof StudentEditPayload)[]) {
        if (key === "fullName") delete next.fullName
        if (key === "email") delete next.email
        if (key === "studentNumber") delete next.studentNumber
        if (key === "saisId") delete next.saisId
      }
      return next
    })
    setFormError(null)
  }

  function handleSave() {
    if (!form) return

    const nextErrors = collectUserFieldErrors({
      fullName: form.fullName,
      email: form.email,
      studentNumber: form.studentNumber,
      saisId: form.saisId,
    })
    if (!form.studentNumber?.trim()) {
      nextErrors.studentNumber = `Please enter the ${STUDENT_NUMBER_LENGTH} digits of the Student ID.`
    }
    if (!form.sectionId.trim()) {
      setFormError("Class is required.")
    } else {
      setFormError(null)
    }
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !form.sectionId.trim()) return

    startTransition(async () => {
      const result = await updateStudent(form)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open || !student || !form) return null

  const canSave = !isPending && isDirty

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
        aria-labelledby="edit-student-title"
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
          <h2 id="edit-student-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Edit Student
          </h2>
          <button
            type="button"
            onClick={requestClose}
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
            maxHeight: "min(70vh, 560px)",
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
              {student.completionPct}% complete ·{" "}
              {PROGRESS_STATUS_LABELS[student.progressStatus]}
            </div>
            <div style={{ marginTop: 4 }}>
              {student.hoursCompleted}/{student.hoursRequired} hours · Adviser:{" "}
              {student.adviserName}
            </div>
          </div>

          <AdminFormField label="Full Name" error={fieldErrors.fullName}>
            <AdminTextInput
              value={form.fullName}
              onChange={(fullName) => patchForm({ fullName })}
              placeholder="Student full name"
              maxLength={FULL_NAME_MAX_LENGTH}
              invalid={Boolean(fieldErrors.fullName)}
            />
          </AdminFormField>

          <AdminFormField label="Email" error={fieldErrors.email}>
            <AdminTextInput
              type="email"
              value={form.email}
              onChange={(email) => patchForm({ email })}
              placeholder="name@up.edu.ph"
              maxLength={EMAIL_MAX_LENGTH}
              invalid={Boolean(fieldErrors.email)}
            />
          </AdminFormField>

          <AdminFormField label="Student ID" error={fieldErrors.studentNumber}>
            <AdminTextInput
              value={form.studentNumber ?? ""}
              onChange={(value) =>
                patchForm({
                  studentNumber: digitsOnly(value, STUDENT_NUMBER_LENGTH) || null,
                })
              }
              placeholder="Student number"
              maxLength={STUDENT_NUMBER_LENGTH}
              inputMode="numeric"
              invalid={Boolean(fieldErrors.studentNumber)}
            />
          </AdminFormField>

          <AdminFormField label="SAIS ID" error={fieldErrors.saisId}>
            <AdminTextInput
              value={form.saisId ?? ""}
              onChange={(value) =>
                patchForm({
                  saisId: digitsOnly(value, SAIS_ID_MAX_LENGTH) || null,
                })
              }
              placeholder="SAIS ID"
              maxLength={SAIS_ID_MAX_LENGTH}
              inputMode="numeric"
              invalid={Boolean(fieldErrors.saisId)}
            />
          </AdminFormField>

          <AdminFormField label="Class">
            <SearchableCombobox
              key={student.enrollmentId}
              value={form.sectionId}
              onChange={(sectionId) => patchForm({ sectionId })}
              options={sections.map((section) => ({
                value: section.sectionId,
                label: section.label,
              }))}
              placeholder="Select class"
              emptyMessage="No classes found"
              toggleAriaLabel="Toggle class list"
            />
          </AdminFormField>

          <AdminFormField label="Program">
            <LookupSelect
              value={form.programId}
              onChange={(programId) => patchForm({ programId })}
              options={lookups.programs}
            />
          </AdminFormField>

          <AdminFormField label="Classification">
            <LookupSelect
              value={form.studentClassificationId}
              onChange={(studentClassificationId) => patchForm({ studentClassificationId })}
              options={lookups.classifications}
            />
          </AdminFormField>

          <AdminFormField label="Enlistment Status">
            <LookupSelect
              value={form.enlistmentStatusId}
              onChange={(enlistmentStatusId) => patchForm({ enlistmentStatusId })}
              options={lookups.enlistmentStatuses}
            />
          </AdminFormField>

          {formError && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{formError}</p>
          )}
        </div>

        <div
          style={{
            padding: "14px 22px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={requestClose}
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
