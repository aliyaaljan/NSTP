"use client"

import { TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  fieldBg: "#EBEBE8",
  error: "#7B1113",
  errorBg: "#FDF2F2",
  errorBorder: "#E5A3A5",
}

export function AdminFormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
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
      {error ? (
        <p style={{ ...TYPE.caption, color: COLORS.error, margin: "6px 0 0" }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{ ...TYPE.caption, color: COLORS.textGray, margin: "6px 0 0" }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AdminTextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  inputMode,
  invalid = false,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "email"
  maxLength?: number
  inputMode?: "numeric"
  invalid?: boolean
  disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      style={{
        width: "100%",
        boxSizing: "border-box",
        ...TYPE.body,
        fontStyle: "normal",
        color: disabled ? COLORS.textGray : COLORS.textDark,
        background: invalid
          ? COLORS.errorBg
          : disabled
            ? "#F5F4F1"
            : COLORS.fieldBg,
        border: invalid ? `1.5px solid ${COLORS.errorBorder}` : "1.5px solid transparent",
        borderRadius: 6,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  )
}
