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

  /* Embedded table card — matches adviser (facilitator) adv-table-* pattern */
  .admin-table-card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .admin-table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    gap: 16px;
    flex-wrap: wrap;
  }
  .admin-table-title { font-weight: 700; font-size: 15px; color: var(--text); }
  .admin-table-count { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .admin-search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid var(--maroon);
    border-radius: 999px;
    padding: 8px 18px;
    min-width: 280px;
    background: var(--white);
    transition: border-color 0.15s;
  }
  .admin-search-bar:focus-within { border-color: var(--green); }
  .admin-search-input {
    border: none;
    outline: none;
    font-size: 13.5px;
    font-family: var(--font-content, 'Montserrat', sans-serif);
    color: var(--text);
    width: 100%;
    background: transparent;
  }
  .admin-search-input::placeholder { color: var(--light); }
  .admin-filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1.5px solid var(--border);
    border-radius: 999px;
    padding: 8px 18px;
    background: var(--white);
    font-size: 13.5px;
    font-family: var(--font-content, 'Montserrat', sans-serif);
    font-weight: 500;
    cursor: pointer;
    color: var(--text);
    transition: border-color 0.13s, color 0.13s;
  }
  .admin-filter-btn:hover { border-color: #9CA3AF; }
  .admin-filter-btn-active {
    border-color: var(--maroon);
    color: var(--maroon);
  }
  .admin-table-wrapper {
    overflow-x: auto;
    overflow-y: auto;
    max-height: calc(100vh - 380px);
    scrollbar-width: thin;
    scrollbar-color: #CFCFCB transparent;
  }
  .admin-table-wrapper::-webkit-scrollbar { width: 5px; height: 5px; }
  .admin-table-wrapper::-webkit-scrollbar-thumb { background: #CFCFCB; border-radius: 999px; }
  .admin-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .admin-table thead tr {
    background: #F9FAFB;
    border-bottom: 1px solid var(--border);
  }
  .admin-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #F9FAFB;
    padding: 10px 20px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: var(--maroon);
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .admin-table td {
    padding: 14px 20px;
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
    font-size: 13px;
    font-weight: 400;
  }
  .admin-table tbody tr:last-child td { border-bottom: none; }
  .admin-table tbody tr { transition: background 0.12s; }
  .admin-table tbody tr:hover td { background: #FAFAFA; }
  .admin-table-row-clickable {
    cursor: pointer;
  }
  .admin-table-row-clickable:hover td,
  .admin-table-row-clickable:focus-visible td {
    background: #F3F4F6;
  }
  .admin-table-row-clickable:focus-visible {
    outline: none;
  }
  .admin-table-row-clickable:focus-visible td:first-child {
    box-shadow: inset 3px 0 0 var(--maroon);
  }
  .admin-list-item-clickable {
    cursor: pointer;
    transition: background 0.12s;
  }
  .admin-list-item-clickable:hover,
  .admin-list-item-clickable:focus-visible {
    background: #F3F4F6;
  }
  .admin-list-item-clickable:focus-visible {
    outline: none;
    box-shadow: inset 3px 0 0 var(--maroon);
  }
  .admin-card-clickable {
    cursor: pointer;
    transition: box-shadow 0.12s, border-color 0.12s, transform 0.12s;
  }
  .admin-card-clickable:hover,
  .admin-card-clickable:focus-visible {
    border-color: #D1D5DB;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  }
  .admin-card-clickable:focus-visible {
    outline: 2px solid var(--maroon);
    outline-offset: 2px;
  }
  .admin-table-empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--muted);
    font-size: 13px;
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
