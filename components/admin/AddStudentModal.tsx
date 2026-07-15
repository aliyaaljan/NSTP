"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { SearchableCombobox } from "@/components/shared/SearchableCombobox"
import {
  checkStudentEmail,
  createStudent,
  enrollExistingStudent,
  type CheckStudentEmailResult,
} from "@/lib/admin/student-list-actions"
import {
  emptyStudentCreatePayload,
  type StudentCreatePayload,
} from "@/lib/admin/student-edit"
import { isFormDirty } from "@/lib/admin/form-dirty"
import type { PriorDecision } from "@/lib/admin/student-import"
import {
  collectUserFieldErrors,
  digitsOnly,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  SAIS_ID_MAX_LENGTH,
  STUDENT_NUMBER_LENGTH,
  type UserFieldErrors,
} from "@/lib/admin/user-field-validation"
import type {
  StudentEnrollmentLookups,
  StudentListSectionOption,
  StudentLookupOption,
} from "@/lib/admin/student-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  amber: "#D97706",
  cardBg: "#F9F9F7",
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

function DecisionToggle({
  value,
  onChange,
}: {
  value: PriorDecision
  onChange: (value: PriorDecision) => void
}) {
  const options: { value: PriorDecision; label: string }[] = [
    { value: "complete", label: "Complete" },
    { value: "drop", label: "Drop" },
  ]
  return (
    <div style={{ display: "inline-flex", marginTop: 8 }}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...TYPE.caption,
              fontWeight: 700,
              background: selected ? COLORS.headerGreen : COLORS.fieldBg,
              color: selected ? "#fff" : COLORS.textDark,
              border: "none",
              padding: "6px 14px",
              cursor: "pointer",
              borderRadius:
                index === 0 ? "999px 0 0 999px" : index === options.length - 1 ? "0 999px 999px 0" : 0,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function HoursBadge({ met }: { met: boolean }) {
  return (
    <span
      style={{
        ...TYPE.caption,
        fontWeight: 700,
        borderRadius: 999,
        padding: "2px 10px",
        marginLeft: 8,
        background: met ? "#D4E4DA" : "#FDF0E0",
        color: met ? COLORS.headerGreen : COLORS.amber,
      }}
    >
      {met ? "Met" : "Short"}
    </span>
  )
}

export default function AddStudentModal({
  open,
  sections,
  lookups,
  onClose,
}: {
  open: boolean
  sections: StudentListSectionOption[]
  lookups: StudentEnrollmentLookups
  onClose: () => void
}) {
  const [form, setForm] = useState<StudentCreatePayload>(emptyStudentCreatePayload())
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "done">("idle")
  const [checkResult, setCheckResult] = useState<CheckStudentEmailResult | null>(null)
  const [priorDecision, setPriorDecision] = useState<PriorDecision | null>(null)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setForm(emptyStudentCreatePayload())
    setFieldErrors({})
    setFormError(null)
    setCheckStatus("idle")
    setCheckResult(null)
    setPriorDecision(null)
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const isDirty = isFormDirty(emptyStudentCreatePayload(), form)

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return
    close()
  }, [isDirty, close])

  useEffect(() => {
    if (open) {
      setForm(emptyStudentCreatePayload())
      setFieldErrors({})
      setFormError(null)
      setCheckStatus("idle")
      setCheckResult(null)
      setPriorDecision(null)
    }
  }, [open])

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

  useEffect(() => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)

    const email = form.email.trim().toLowerCase()
    setCheckResult(null)
    setPriorDecision(null)
    if (!email.endsWith("@up.edu.ph")) {
      setCheckStatus("idle")
      return
    }

    setCheckStatus("checking")
    checkTimeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await checkStudentEmail(email)
        setCheckResult(result)
        setCheckStatus("done")
        if (result.ok && result.exists && result.activeEnrollment && !result.activeEnrollment.isActiveTerm) {
          setPriorDecision(result.activeEnrollment.suggested)
        }
      })
    }, 500)

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.email])

  function patchForm(updates: Partial<StudentCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof StudentCreatePayload)[]) {
        if (key === "fullName") delete next.fullName
        if (key === "email") delete next.email
        if (key === "studentNumber") delete next.studentNumber
        if (key === "saisId") delete next.saisId
      }
      return next
    })
    setFormError(null)
  }

  const existing =
    checkResult && checkResult.ok && checkResult.exists ? checkResult : null
  const isNonStudent = existing !== null && existing.roleCode !== null && existing.roleCode !== "student"
  const sameTermConflict =
    existing?.activeEnrollment && existing.activeEnrollment.isActiveTerm ? existing.activeEnrollment : null
  const priorEnrollment =
    existing?.activeEnrollment && !existing.activeEnrollment.isActiveTerm
      ? existing.activeEnrollment
      : null

  function handleAdd() {
    if (existing) {
      if (isNonStudent || sameTermConflict) return
      if (!form.sectionId) {
        setFormError("Class is required.")
        return
      }
      if (priorEnrollment && !priorDecision) {
        setFormError("Choose whether to complete or drop the previous enrollment.")
        return
      }
      setFormError(null)
      startTransition(async () => {
        const result = await enrollExistingStudent({
          studentUserId: existing.studentUserId,
          sectionId: form.sectionId,
          priorDecision: priorDecision ?? undefined,
          programId: form.programId,
          studentClassificationId: form.studentClassificationId,
          enlistmentStatusId: form.enlistmentStatusId,
        })
        if (!result.ok) {
          setFormError(result.error)
          return
        }
        close()
        window.location.reload()
      })
      return
    }

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
      const result = await createStudent(form)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

  const canAdd =
    !isPending &&
    (existing
      ? !isNonStudent && !sameTermConflict && (!priorEnrollment || priorDecision !== null)
      : true)

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
        aria-labelledby="add-student-title"
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
          <h2 id="add-student-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Add Student
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

          {checkStatus === "checking" && (
            <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: 0 }}>Checking…</p>
          )}

          {isNonStudent && (
            <div
              style={{
                background: "#FBEFEF",
                border: "1px solid #E5C4C5",
                borderRadius: 8,
                padding: "12px 14px",
                ...TYPE.body,
                color: COLORS.error,
              }}
            >
              This email belongs to a facilitator/admin account — only students can be
              enrolled.
            </div>
          )}

          {existing && !isNonStudent && (
            <div
              style={{
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-user-check" style={{ fontSize: 16, color: COLORS.headerGreen }} />
                <span style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>{existing.fullName}</span>
              </div>
              <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 4 }}>
                Student No. {existing.studentNumber ?? "—"} · existing account
              </div>
            </div>
          )}

          {!existing && (
            <AdminFormField label="Full Name" error={fieldErrors.fullName}>
              <AdminTextInput
                value={form.fullName}
                onChange={(fullName) => patchForm({ fullName })}
                placeholder="Student full name"
                maxLength={FULL_NAME_MAX_LENGTH}
                invalid={Boolean(fieldErrors.fullName)}
              />
            </AdminFormField>
          )}

          {!existing && (
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
          )}

          {!existing && (
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
          )}

          {sameTermConflict && (
            <div
              style={{
                background: "#FDF6EC",
                border: "1px solid #EAD7B7",
                borderRadius: 8,
                padding: "12px 14px",
                ...TYPE.body,
                color: COLORS.amber,
              }}
            >
              Already enrolled with {sameTermConflict.facilitatorName} this term. Use Edit
              Student to move them.
            </div>
          )}

          {priorEnrollment && (
            <div
              style={{
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div style={{ ...TYPE.bodyBold, color: COLORS.textDark }}>
                {priorEnrollment.classLabel}
              </div>
              <div style={{ ...TYPE.caption, color: COLORS.textGray, marginTop: 2 }}>
                {priorEnrollment.termName} · {priorEnrollment.hoursEarned} /{" "}
                {priorEnrollment.hoursRequired} hrs
                <HoursBadge met={priorEnrollment.hoursEarned >= priorEnrollment.hoursRequired} />
              </div>
              <DecisionToggle
                value={priorDecision ?? priorEnrollment.suggested}
                onChange={setPriorDecision}
              />
              <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "8px 0 0" }}>
                The previous enrollment will be closed out with this status.
              </p>
            </div>
          )}

          {!isNonStudent && !sameTermConflict && (
            <>
              <AdminFormField label="Class">
                <SearchableCombobox
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
                <SearchableCombobox
                  value={form.programId ?? ""}
                  onChange={(programId) => patchForm({ programId: programId || null })}
                  options={lookups.programs.map((program) => ({
                    value: program.id,
                    label: program.label,
                  }))}
                  placeholder="Select program"
                  emptyMessage="No programs found"
                  toggleAriaLabel="Toggle program list"
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
            </>
          )}

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
            {isPending ? (existing ? "Enrolling…" : "Adding…") : existing ? "Enroll Student" : "Add Student"}
          </button>
        </div>
      </div>
    </div>
  )
}
