"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import {
  checkStudentEmail,
  createStudent,
  enrollExistingStudent,
  type CheckStudentEmailResult,
} from "@/lib/admin/student-list-actions"
import {
  emptyStudentCreatePayload,
  validateStudentCreatePayload,
  type StudentCreatePayload,
} from "@/lib/admin/student-edit"
import type { PriorDecision } from "@/lib/admin/student-import"
import type { StudentListSectionOption } from "@/lib/admin/student-list"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

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
  type?: "text" | "email"
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
}: {
  value: string
  onChange: (value: string) => void
  sections: StudentListSectionOption[]
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
        <option value="" disabled>
          Select class
        </option>
        {sections.map((section) => (
          <option key={section.sectionId} value={section.sectionId}>
            {section.label}
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
  onClose,
}: {
  open: boolean
  sections: StudentListSectionOption[]
  onClose: () => void
}) {
  const [form, setForm] = useState<StudentCreatePayload>(emptyStudentCreatePayload())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "done">("idle")
  const [checkResult, setCheckResult] = useState<CheckStudentEmailResult | null>(null)
  const [priorDecision, setPriorDecision] = useState<PriorDecision | null>(null)
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setForm(emptyStudentCreatePayload())
    setError(null)
    setCheckStatus("idle")
    setCheckResult(null)
    setPriorDecision(null)
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)
  }, [])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyStudentCreatePayload())
      setError(null)
      setCheckStatus("idle")
      setCheckResult(null)
      setPriorDecision(null)
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
        setError("Class is required.")
        return
      }
      if (priorEnrollment && !priorDecision) {
        setError("Choose whether to complete or drop the previous enrollment.")
        return
      }
      setError(null)
      startTransition(async () => {
        const result = await enrollExistingStudent({
          studentUserId: existing.studentUserId,
          sectionId: form.sectionId,
          priorDecision: priorDecision ?? undefined,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        close()
        window.location.reload()
      })
      return
    }

    const validationError = validateStudentCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createStudent(form)
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
    Boolean(form.email.trim() && form.sectionId) &&
    (existing
      ? !isNonStudent && !sameTermConflict && (!priorEnrollment || priorDecision !== null)
      : Boolean(form.fullName.trim()))

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
          <FormField label="Email" hint="Must be a UP email (@up.edu.ph).">
            <TextInput
              type="email"
              value={form.email}
              onChange={(email) => patchForm({ email })}
              placeholder="name@up.edu.ph"
            />
          </FormField>

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
            <FormField label="Full Name">
              <TextInput
                value={form.fullName}
                onChange={(fullName) => patchForm({ fullName })}
                placeholder="Student full name"
              />
            </FormField>
          )}

          {!existing && (
            <FormField label="Student ID">
              <TextInput
                value={form.studentNumber ?? ""}
                onChange={(value) => patchForm({ studentNumber: value.trim() || null })}
                placeholder="Student number"
              />
            </FormField>
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
            <FormField label="Class">
              <SectionSelect
                value={form.sectionId}
                onChange={(sectionId) => patchForm({ sectionId })}
                sections={sections}
              />
            </FormField>
          )}

          {error && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{error}</p>
          )}
        </div>

        <div
          style={{
            padding: "0 22px 22px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={close}
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
