/**
 * Admin UI typography — aligned with the adviser (facilitator) dashboard.
 *
 * Base body: Montserrat 14px (matches .db-root)
 * Page title: Montserrat 34px / 800 maroon (matches .header-greeting)
 * Card title: 14px / 700 (matches .card-title)
 * Caption: 12px (matches .qr-sub, .completion-sub)
 * Section label: 11px caps (matches .overview-label)
 */

export const FONT_BODY =
  "var(--font-content, 'Montserrat', 'Helvetica Neue', Arial, sans-serif)"
export const FONT_TITLE = "var(--font-title, 'Goblin One', Georgia, serif)"
export const FONT_SUB = "var(--font-sub, 'Cormorant', Georgia, serif)"

/** @deprecated Use FONT_BODY — kept so existing button imports compile unchanged. */
export const FONT_HEADING = FONT_BODY

/** Large page titles — matches adviser dashboard .header-greeting */
export const PAGE_TITLE = {
  fontFamily: FONT_BODY,
  fontSize: "34px",
  fontWeight: 800,
  lineHeight: 1.25,
} as const

export const TYPE = {
  h1: {
    fontFamily: FONT_BODY,
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  h2: {
    fontFamily: FONT_BODY,
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  body: {
    fontFamily: FONT_BODY,
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: 1.45,
  },
  bodyBold: {
    fontFamily: FONT_BODY,
    fontSize: "14px",
    fontWeight: 700,
    lineHeight: 1.45,
  },
  caption: {
    fontFamily: FONT_BODY,
    fontSize: "12px",
    fontWeight: 400,
    fontStyle: "normal" as const,
    lineHeight: 1.4,
  },
  sectionLabel: {
    fontFamily: FONT_BODY,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    textTransform: "uppercase" as const,
    lineHeight: 1.3,
  },
} as const

/** Profile pill sizing — matches adviser dashboard .profile-pill */
export const PROFILE_PILL = {
  borderRadius: 24,
  padding: "7px 16px 7px 8px",
  gap: 10,
  avatarSize: 32,
  name: { fontSize: "13px", fontWeight: 700 as const },
  role: { fontSize: "11px", opacity: 0.75 },
} as const
