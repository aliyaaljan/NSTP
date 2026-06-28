"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { createAccessUser } from "@/lib/admin/access-control-actions"
import {
  emptyAccessUserCreatePayload,
  validateAccessUserCreatePayload,
  type AccessUserCreatePayload,
} from "@/lib/admin/access-control-edit"
import type { AccessControlRoleOption } from "@/lib/admin/access-control"
import { ROLE_CODE_LABELS } from "@/lib/admin/access-control"
import { FONT_BODY, TYPE } from "@/lib/admin-typography"
import { ADMIN_COLORS } from "@/lib/admin-theme"

const COLORS = {
  textDark: ADMIN_COLORS.text,
  textGray: ADMIN_COLORS.muted,
  headerMaroon: ADMIN_COLORS.maroon,
  fieldBg: "#F3F4F6",
  error: ADMIN_COLORS.maroon,
  border: ADMIN_COLORS.border,
  maroon: ADMIN_COLORS.maroon,
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
        fontFamily: FONT_BODY,
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
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = useCallback(() => {
    setForm(emptyAccessUserCreatePayload(roles))
    setError(null)
  }, [roles])

  const close = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    if (open) {
      setForm(emptyAccessUserCreatePayload(roles))
      setError(null)
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
  }

  function handleAdd() {
    const validationError = validateAccessUserCreatePayload(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createAccessUser(form)
      if (!result.ok) {
        setError(result.error)
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
            background: COLORS.headerMaroon,
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
          <FormField label="Full Name">
            <TextInput
              value={form.fullName}
              onChange={(value) => patchForm({ fullName: value })}
              placeholder="Last name, First name"
            />
          </FormField>

          <FormField label="Email" hint="Must be a valid UP address (@up.edu.ph).">
            <TextInput
              type="email"
              value={form.email}
              onChange={(value) => patchForm({ email: value })}
              placeholder="name@up.edu.ph"
            />
          </FormField>

          <FormField label="Student Number" hint="Leave blank for non-student accounts.">
            <TextInput
              value={form.studentNumber ?? ""}
              onChange={(value) => patchForm({ studentNumber: value.trim() || null })}
              placeholder="20XX-XXXXX"
            />
          </FormField>

          <FormField label="SAIS ID" hint="Optional identifier for staff accounts.">
            <TextInput
              value={form.saisId ?? ""}
              onChange={(value) => patchForm({ saisId: value.trim() || null })}
              placeholder="SAIS ID"
            />
          </FormField>

          <FormField label="Role">
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
          </FormField>

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
                accentColor: COLORS.headerMaroon,
                cursor: "pointer",
              }}
            />
            Account is active
          </label>

          {error && (
            <p style={{ ...TYPE.caption, color: COLORS.error, margin: 0 }}>{error}</p>
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
              background: canAdd ? COLORS.maroon : COLORS.border,
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
