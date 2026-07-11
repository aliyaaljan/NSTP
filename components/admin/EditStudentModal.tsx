"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { updateStudent } from "@/lib/admin/student-list-actions"
import {
  studentRowToEditPayload,
  validateStudentEditPayload,
  type StudentEditPayload,
} from "@/lib/admin/student-edit"
import type { StudentListRow, StudentListSectionOption } from "@/lib/admin/student-list"
import { clearFormSession, isFormDirty, shouldLoadFormSession, snapshotForm } from "@/lib/admin/form-dirty"
import { PROGRESS_STATUS_LABELS } from "@/lib/admin/student-progress"
import { FONT_HEADING, TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
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
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "email"
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        boxSizing: "border-box",
        ...TYPE.body,
        fontStyle: "normal",
        color: disabled ? COLORS.textGray : COLORS.textDark,
        background: disabled ? "#F5F4F1" : COLORS.fieldBg,
        border: "none",
        borderRadius: 6,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  )
}

function SectionCombobox({
  value,
  onChange,
  sections,
}: {
  value: string
  onChange: (value: string) => void
  sections: StudentListSectionOption[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const selectedSection = useMemo(
    () => sections.find((section) => section.sectionId === value),
    [sections, value]
  )

  useEffect(() => {
    setInputValue(selectedSection?.label ?? "")
  }, [selectedSection?.label, value])

  const filteredSections = useMemo(() => {
    const normalizedQuery = inputValue.trim().toLowerCase()
    if (!normalizedQuery) return sections
    return sections.filter((section) =>
      section.label.toLowerCase().includes(normalizedQuery)
    )
  }, [sections, inputValue])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  function reconcileInput() {
    const exactMatch = sections.find(
      (section) => section.label.toLowerCase() === inputValue.trim().toLowerCase()
    )
    if (exactMatch) {
      onChange(exactMatch.sectionId)
      setInputValue(exactMatch.label)
      return
    }

    setInputValue(selectedSection?.label ?? "")
  }

  function selectSection(section: StudentListSectionOption) {
    onChange(section.sectionId)
    setInputValue(section.label)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value)
          setOpen(true)
          if (selectedSection && event.target.value !== selectedSection.label) {
            onChange("")
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              reconcileInput()
              setOpen(false)
            }
          }, 0)
        }}
        placeholder="Select class"
        style={{
          width: "100%",
          boxSizing: "border-box",
          ...TYPE.body,
          fontStyle: "normal",
          color: inputValue ? COLORS.textDark : COLORS.textGray,
          background: COLORS.fieldBg,
          border: "none",
          borderRadius: 6,
          padding: "12px 40px 12px 14px",
          outline: "none",
        }}
      />
      <button
        type="button"
        aria-label="Toggle class list"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setOpen((current) => !current)
        }}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.textGray,
        }}
      >
        <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "#fff",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          {filteredSections.length === 0 ? (
            <li
              style={{
                ...TYPE.body,
                color: COLORS.textGray,
                padding: "10px 12px",
              }}
            >
              No classes found
            </li>
          ) : (
            filteredSections.map((section) => {
              const isSelected = section.sectionId === value
              return (
                <li key={section.sectionId}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSection(section)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      ...TYPE.body,
                      color: COLORS.textDark,
                      background: isSelected ? "#F0F4F1" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {section.label}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

export default function EditStudentModal({
  open,
  student,
  sections,
  onClose,
}: {
  open: boolean
  student: StudentListRow | null
  sections: StudentListSectionOption[]
  onClose: () => void
}) {
  const [form, setForm] = useState<StudentEditPayload | null>(null)
  const [initialForm, setInitialForm] = useState<StudentEditPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const loadedSessionRef = useRef<string | null>(null)

  const close = useCallback(() => {
    clearFormSession(loadedSessionRef)
    setForm(null)
    setInitialForm(null)
    setError(null)
    onClose()
  }, [onClose])

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
    setError(null)
  }, [open, student])

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

  function patchForm(updates: Partial<StudentEditPayload>) {
    setForm((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  function handleSave() {
    if (!form) return

    const validationError = validateStudentEditPayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateStudent(form)
      if (!result.ok) {
        setError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open || !student || !form) return null

  const isDirty =
    form && initialForm ? isFormDirty(initialForm, form) : false

  const canSave =
    !isPending &&
    isDirty &&
    Boolean(form.fullName.trim() && form.email.trim() && form.sectionId)

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

          <FormField label="Full Name">
            <TextInput
              value={form.fullName}
              onChange={(fullName) => patchForm({ fullName })}
              placeholder="Student full name"
            />
          </FormField>

          <FormField label="Email" hint="Must be a UP email (@up.edu.ph).">
            <TextInput
              type="email"
              value={form.email}
              onChange={(email) => patchForm({ email })}
              placeholder="name@up.edu.ph"
            />
          </FormField>

          <FormField label="Student ID">
            <TextInput
              value={form.studentNumber ?? ""}
              onChange={(value) =>
                patchForm({ studentNumber: value.trim() || null })
              }
              placeholder="Student number"
            />
          </FormField>

          <FormField label="Class">
            <SectionCombobox
              key={student.enrollmentId}
              value={form.sectionId}
              onChange={(sectionId) => patchForm({ sectionId })}
              sections={sections}
            />
          </FormField>

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
