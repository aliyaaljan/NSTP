/** Shared styling constants for the admin import modal + its sub-components.
 * Same modal-chrome palette every other admin modal (Add/Edit Student/Adviser,
 * ConfirmDelete) uses — distinct from the list-page palette in lib/admin-theme.ts. */
export const COLORS = {
  textDark: "#2C2C2A",
  textGray: "#8C8C88",
  headerGreen: "#14492E",
  fieldBg: "#EBEBE8",
  uploadBtnBg: "#D4E4DA",
  error: "#7B1113",
  amber: "#D97706",
  border: "#ECECEA",
  cardBg: "#F9F9F7",
} as const

export const SEVERITY_COLORS = {
  error: "#7B1113",
  warning: "#D97706",
  info: "#8C8C88",
} as const

export const SEVERITY_LABELS = {
  error: "Errors",
  warning: "Warnings",
  info: "Notes",
} as const
