/**
 * Admin UI theme — aligned with the adviser (facilitator) dashboard palette.
 * Mirrors CSS variables from app/facilitator/layout.tsx.
 */
export const ADMIN_COLORS = {
  green: "#1B4332",
  greenDark: "#14532D",
  greenLight: "#86EFAC",
  maroon: "#7B1D1D",
  amber: "#D97706",
  bg: "#F0F0F0",
  white: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  light: "#9CA3AF",
  radius: 14,
  shadow: "0 2px 6px rgba(0,0,0,0.07)",

  // Semantic aliases used across admin pages
  textDark: "#111827",
  textGray: "#6B7280",
  cardBg: "#FFFFFF",
  cardShadow: "0 2px 6px rgba(0,0,0,0.07)",
  track: "#E5E7EB",
  tableHeadBg: "#F3F4F6",
  iconBg: "#F3F4F6",

  greenBgLight: "#F0FDF4",
  maroonBgLight: "rgba(123, 29, 29, 0.1)",
  maroonDark: "#5C0B18",
  maroonDarkBgLight: "rgba(92, 11, 24, 0.1)",
  amberBgLight: "rgba(217, 119, 6, 0.12)",
} as const

/** Inline :root block for admin layout — same tokens as the adviser dashboard. */
export const ADMIN_THEME_CSS = `
  :root {
    --green:       #1B4332;
    --green-dark:  #14532D;
    --green-light: #86EFAC;
    --maroon:      #7B1D1D;
    --amber:       #D97706;
    --bg:          #F0F0F0;
    --white:       #FFFFFF;
    --border:      #E5E7EB;
    --text:        #111827;
    --muted:       #6B7280;
    --light:       #9CA3AF;
    --radius:      14px;
    --shadow:      0 2px 6px rgba(0,0,0,0.07);
  }
`
