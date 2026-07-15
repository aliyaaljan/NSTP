"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAccessUser } from "@/lib/admin/access-control-actions"
import {
  emptyAccessUserCreatePayload,
  type AccessUserCreatePayload,
} from "@/lib/admin/access-control-edit"
import type { AccessControlRoleOption } from "@/lib/admin/access-control"
import { ROLE_CODE_LABELS } from "@/lib/admin/access-control"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS } from "@/lib/admin-theme"
import {
  collectUserFieldErrors,
  digitsOnly,
  EMAIL_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  SAIS_ID_MAX_LENGTH,
  STUDENT_NUMBER_LENGTH,
  type UserFieldErrors,
} from "@/lib/admin/user-field-validation"
import { AdminFormField, AdminTextInput } from "@/components/admin/AdminFormControls"

const COLORS = {
  textDark: ADMIN_COLORS.text,
  textGray: ADMIN_COLORS.muted,
  headerGreen: ADMIN_COLORS.green,
  fieldBg: "#F3F4F6",
  error: ADMIN_COLORS.maroon,
  border: ADMIN_COLORS.border,
  green: ADMIN_COLORS.green,
}

export default function AddAccessUserModal({
  open,
  roles,
  onClose,
}: {
  open: boolean
  roles: AccessControlRoleOption[]
  onClose: () => void
}) {
  const [form, setForm] = useState<AccessUserCreatePayload>(() =>
    emptyAccessUserCreatePayload(roles)
  )
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAccessUserCreatePayload(roles))
    setFieldErrors({})
    setFormError(null)
  }, [roles])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyAccessUserCreatePayload(roles))
    }
  }, [open, roles])

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

  function patchForm(updates: Partial<AccessUserCreatePayload>) {
    setForm((prev) => ({ ...prev, ...updates }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(updates) as (keyof AccessUserCreatePayload)[]) {
        if (key === "fullName") delete next.fullName
        if (key === "email") delete next.email
        if (key === "studentNumber") delete next.studentNumber
        if (key === "saisId") delete next.saisId
      }
      return next
    })
    setFormError(null)
  }

  function handleAdd() {
    const nextErrors = collectUserFieldErrors({
      fullName: form.fullName,
      email: form.email,
      studentNumber: form.studentNumber,
      saisId: form.saisId,
    })
    setFieldErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    startTransition(async () => {
      const result = await createAccessUser(form)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      close()
      window.location.reload()
    })
  }

  if (!open) return null

  const canAdd = !isPending && Boolean(form.fullName.trim() && form.email.trim() && form.roleId)

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
        aria-labelledby="add-access-user-title"
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
          <h2 id="add-access-user-title" style={{ ...TYPE.h2, color: "#fff", margin: 0 }}>
            Add User
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
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <AdminFormField label="Full Name" error={fieldErrors.fullName}>
            <AdminTextInput
              value={form.fullName}
              onChange={(value) => patchForm({ fullName: value })}
              placeholder="Last name, First name"
              maxLength={FULL_NAME_MAX_LENGTH}
              invalid={Boolean(fieldErrors.fullName)}
            />
          </AdminFormField>

          <AdminFormField label="Email" error={fieldErrors.email}>
            <AdminTextInput
              type="email"
              value={form.email}
              onChange={(value) => patchForm({ email: value })}
              placeholder="name@up.edu.ph"
              maxLength={EMAIL_MAX_LENGTH}
              invalid={Boolean(fieldErrors.email)}
            />
          </AdminFormField>

          <AdminFormField label="Student Number" error={fieldErrors.studentNumber}>
            <AdminTextInput
              value={form.studentNumber ?? ""}
              onChange={(value) =>
                patchForm({
                  studentNumber: digitsOnly(value, STUDENT_NUMBER_LENGTH) || null,
                })
              }
              placeholder="Student ID"
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

          <AdminFormField label="Role">
            <select
              value={form.roleId}
              onChange={(e) => {
                const selected = roles.find((role) => role.roleId === e.target.value)
                if (!selected) return
                patchForm({ roleId: selected.roleId, roleCode: selected.code })
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                ...TYPE.body,
                fontFamily: FONT_BODY,
                fontStyle: "normal",
                color: COLORS.textDark,
                background: COLORS.fieldBg,
                border: "none",
                borderRadius: 6,
                padding: "12px 14px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {roles.map((role) => (
                <option key={role.roleId} value={role.roleId}>
                  {ROLE_CODE_LABELS[role.code]}
                </option>
              ))}
            </select>
          </AdminFormField>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              ...TYPE.body,
              color: COLORS.textDark,
            }}
          >
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => patchForm({ isActive: e.target.checked })}
              style={{
                width: 16,
                height: 16,
                accentColor: COLORS.headerGreen,
                cursor: "pointer",
              }}
            />
            Account is active
          </label>

          {formError && (
            <p style={{ ...TYPE.body, color: COLORS.error, margin: 0 }}>{formError}</p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 22px 20px",
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            style={{
              ...TYPE.bodyBold,
              fontFamily: FONT_BODY,
              padding: "10px 18px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: "#fff",
              color: COLORS.textDark,
              cursor: isPending ? "not-allowed" : "pointer",
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
              fontFamily: FONT_BODY,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: canAdd ? COLORS.green : COLORS.border,
              color: "#fff",
              cursor: canAdd ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 16 }} />
            {isPending ? "Adding…" : "Add User"}
          </button>
        </div>
      </div>
    </div>
  )
}
