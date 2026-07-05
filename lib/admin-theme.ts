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

  /* Native <select> lists inherit pill label color (#fff) without this. */
  .admin-root select {
    color: #111827;
    background-color: #ffffff;
  }

  .admin-root select option,
  .admin-root select optgroup {
    color: #111827;
    background-color: #ffffff;
  }

  .admin-root select option:disabled {
    color: #6B7280;
  }

  /* Main content scrollport — required for position: sticky on list pages. */
  .admin-main-scroll {
    max-height: 100vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #CFCFCB transparent;
  }
  .admin-main-scroll::-webkit-scrollbar { width: 6px; }
  .admin-main-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }

  /* Sticky summary cards until table headers reach the top (admin list pages). */
  .admin-list-kpi-sticky {
    position: sticky;
    top: 12px;
    z-index: 10;
    background: var(--bg);
    padding-top: 8px;
    padding-bottom: 4px;
    margin-top: -8px;
  }

  .admin-list-thead-wrap {
    position: sticky;
    top: 12px;
    z-index: 11;
    background: #F3F4F6;
  }

  .admin-list-table-scroll {
    overflow-x: auto;
    overflow-y: auto;
    max-height: calc(100vh - 380px);
    scrollbar-width: thin;
    scrollbar-color: #CFCFCB transparent;
  }
  .admin-list-table-scroll::-webkit-scrollbar { width: 5px; }
  .admin-list-table-scroll::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }

  .admin-list-card-scroll {
    padding: 4px 2px 8px;
  }
`

/** Overlay <select> used inside green filter pills (opacity 0, covers the pill). */
export const ADMIN_FILTER_SELECT_STYLE = {
  position: "absolute" as const,
  inset: 0,
  opacity: 0,
  cursor: "pointer",
  width: "100%",
  color: "#111827",
  backgroundColor: "#ffffff",
}
