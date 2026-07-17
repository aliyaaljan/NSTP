"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { TYPE } from "@/lib/admin-typography"

const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  fieldBg: "#EBEBE8",
  border: "#ECECEA",
}

export interface SearchableComboboxOption {
  value: string
  label: string
  description?: string
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = "No results found",
  toggleAriaLabel = "Toggle options",
  id,
  name,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options: SearchableComboboxOption[]
  placeholder: string
  emptyMessage?: string
  toggleAriaLabel?: string
  id?: string
  name?: string
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  useEffect(() => {
    setInputValue(selectedOption?.label ?? "")
  }, [selectedOption?.label, value])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = inputValue.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    )
  }, [options, inputValue])

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
    const exactMatch = options.find(
      (option) => option.label.toLowerCase() === inputValue.trim().toLowerCase()
    )
    if (exactMatch) {
      onChange(exactMatch.value)
      setInputValue(exactMatch.label)
      return
    }

    setInputValue(selectedOption?.label ?? "")
  }

  function selectOption(option: SearchableComboboxOption) {
    onChange(option.value)
    setInputValue(option.label)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        id={id}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        value={inputValue}
        onChange={(event) => {
          if (disabled) return
          setInputValue(event.target.value)
          setOpen(true)
          if (selectedOption && event.target.value !== selectedOption.label) {
            onChange("")
          }
        }}
        onFocus={() => {
          if (!disabled) setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              reconcileInput()
              setOpen(false)
            }
          }, 0)
        }}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          ...TYPE.body,
          fontStyle: "normal",
          color: disabled ? COLORS.textGray : inputValue ? COLORS.textDark : COLORS.textGray,
          background: disabled ? "#F5F4F1" : COLORS.fieldBg,
          border: "none",
          borderRadius: 6,
          padding: "12px 40px 12px 14px",
          outline: "none",
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      <button
        type="button"
        aria-label={toggleAriaLabel}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (disabled) return
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
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.textGray,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />
      </button>

      {open && !disabled && (
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
          {filteredOptions.length === 0 ? (
            <li
              style={{
                ...TYPE.body,
                color: COLORS.textGray,
                padding: "10px 12px",
              }}
            >
              {emptyMessage}
            </li>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
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
                    <span style={{ display: "block" }}>{option.label}</span>
                    {option.description && (
                      <span
                        style={{
                          display: "block",
                          ...TYPE.caption,
                          color: COLORS.textGray,
                          marginTop: 2,
                        }}
                      >
                        {option.description}
                      </span>
                    )}
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
