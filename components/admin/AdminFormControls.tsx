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

export const ADMIN_FIELD_ERROR_STYLE = {
  background: COLORS.errorBg,
  border: `1.5px solid ${COLORS.errorBorder}`,
} as const

export const ADMIN_FIELD_NORMAL_STYLE = {
  background: COLORS.fieldBg,
  border: "1.5px solid transparent",
} as const

export function AdminFormField({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string | null
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
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
  id,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  inputMode,
  invalid = false,
  disabled = false,
  min,
  max,
  step,
}: {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: "text" | "email" | "number" | "time" | "date"
  maxLength?: number
  inputMode?: "numeric" | "decimal"
  invalid?: boolean
  disabled?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
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
        border: invalid
          ? `1.5px solid ${COLORS.errorBorder}`
          : "1.5px solid transparent",
        borderRadius: 6,
        padding: "12px 14px",
        outline: "none",
      }}
    />
  )
}

export function AdminNativeSelect({
  value,
  onChange,
  invalid = false,
  children,
}: {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        style={{
          width: "100%",
          ...TYPE.body,
          fontStyle: "normal",
          color: value ? COLORS.textDark : COLORS.textGray,
          background: invalid ? COLORS.errorBg : COLORS.fieldBg,
          border: invalid
            ? `1.5px solid ${COLORS.errorBorder}`
            : "1.5px solid transparent",
          borderRadius: 6,
          padding: "12px 40px 12px 14px",
          appearance: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {children}
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
