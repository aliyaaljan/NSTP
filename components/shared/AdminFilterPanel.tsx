"use client"

import { useEffect, useRef } from "react"
import {
  ADMIN_FILTER_PANEL_OPTIONS_PER_COLUMN,
  countActiveFilters,
  filterGroupMaxWidth,
  resolveFilterPanelLayout,
  toggleFilterValue,
  type ActiveFilters,
  type FilterGroupDef,
} from "@/lib/admin/filter-utils"
import { FONT_BODY } from "@/lib/admin-typography"
import { ADMIN_COLORS as COLORS } from "@/lib/admin-theme"

function FilterOptionLabel({
  optLabel,
  checked,
  onToggle,
  compact = false,
}: {
  optLabel: string
  checked: boolean
  onToggle: () => void
  compact?: boolean
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        cursor: "pointer",
        fontSize: 13,
        color: COLORS.text,
        fontFamily: FONT_BODY,
        whiteSpace: compact ? "normal" : "nowrap",
        lineHeight: 1.35,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{
          accentColor: COLORS.maroon,
          width: 14,
          height: 14,
          cursor: "pointer",
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      {optLabel}
    </label>
  )
}

export function AdminFilterPanel({
  groups,
  activeFilters,
  onChange,
  onClear,
  width: maxWidthProp,
}: {
  groups: FilterGroupDef[]
  activeFilters: ActiveFilters
  onChange: (next: ActiveFilters) => void
  onClear: () => void
  /** Override max panel width (defaults to dashboard cap). */
  width?: number
}) {
  const { maxWidth, groups: layoutGroups } = resolveFilterPanelLayout(groups)
  const panelMaxWidth = maxWidthProp ?? maxWidth
  const totalActive = countActiveFilters(activeFilters)

  function toggle(field: string, value: string) {
    onChange(toggleFilterValue(activeFilters, field, value))
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 100,
        padding: 16,
        width: "max-content",
        maxWidth: panelMaxWidth,
        minWidth: 220,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.muted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontFamily: FONT_BODY,
          }}
        >
          Filters
        </span>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 11.5,
              color: COLORS.maroon,
              fontWeight: 600,
              fontFamily: FONT_BODY,
              padding: 0,
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {layoutGroups.map((group) => {
          if (group.options.length === 0) return null
          const checked = activeFilters[group.field] ?? []
          const rowsPerColumn =
            group.optionsPerColumn ?? ADMIN_FILTER_PANEL_OPTIONS_PER_COLUMN
          const columnCount = Math.max(
            1,
            Math.ceil(group.options.length / rowsPerColumn)
          )
          const groupMaxWidth = filterGroupMaxWidth(group.field)
          return (
            <div
              key={group.field}
              style={{
                flex: "0 0 auto",
                width: "max-content",
                maxWidth: groupMaxWidth,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: COLORS.text,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  fontFamily: FONT_BODY,
                }}
              >
                {group.label}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    columnCount === 1
                      ? "max-content"
                      : `repeat(${columnCount}, minmax(0, 1fr))`,
                  gap: "6px 16px",
                }}
              >
                {group.options.map(({ value, label: optLabel }) => (
                  <FilterOptionLabel
                    key={value}
                    optLabel={optLabel}
                    checked={checked.includes(value)}
                    onToggle={() => toggle(group.field, value)}
                    compact
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AdminIconFilterButton({
  activeFilters,
  onToggle,
  open,
  ariaLabel = "Filter",
}: {
  activeFilters: ActiveFilters
  onToggle: () => void
  open: boolean
  ariaLabel?: string
}) {
  const totalActive = countActiveFilters(activeFilters)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="true"
      aria-label={ariaLabel}
      style={{
        width: 60,
        height: 38,
        border: `1.5px solid ${
          totalActive > 0 ? COLORS.maroon : COLORS.green
        }`,
        borderRadius: 999,
        background: COLORS.white,
        color: totalActive > 0 ? COLORS.maroon : COLORS.green,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "border-color 0.13s, color 0.13s",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <i className="ti ti-filter" style={{ fontSize: 18 }} />
      {totalActive > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: COLORS.maroon,
            color: "#fff",
            borderRadius: "50%",
            width: 16,
            height: 16,
            fontSize: 9,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {totalActive}
        </span>
      )}
    </button>
  )
}

export function AdminFilterButton({
  activeFilters,
  onToggle,
  open,
}: {
  activeFilters: ActiveFilters
  onToggle: () => void
  open: boolean
}) {
  const totalActive = countActiveFilters(activeFilters)

  return (
    <button
      type="button"
      className={`admin-filter-btn${totalActive > 0 ? " admin-filter-btn-active" : ""}`}
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="true"
    >
      <i className="ti ti-chevron-down" style={{ fontSize: 16 }} />
      Filter
      {totalActive > 0 && (
        <span
          style={{
            background: COLORS.maroon,
            color: "#fff",
            borderRadius: "50%",
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 2,
          }}
        >
          {totalActive}
        </span>
      )}
    </button>
  )
}

export function useFilterPanelDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open, onClose])

  return ref
}
