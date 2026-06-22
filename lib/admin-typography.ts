/**
 * Admin UI typography scale (pt-based per design guide).
 *
 * Page Heading (H1)     — 16pt Bold   — page titles
 * Section Heading (H2)  — 14pt Bold   — card titles, dialog headings
 * Body Text             — 12pt Regular — main content, descriptions, table cells
 * Caption / Helper      — 11pt Regular italic — hints, timestamps, metadata
 * Section Label         — 10pt Bold caps — sidebar section headers
 */

export const FONT_HEADING = "'Futura', 'Futura PT', 'Century Gothic', sans-serif"
export const FONT_BODY = "var(--font-montserrat), 'Montserrat', 'Helvetica Neue', Arial, sans-serif"

/**
 * Large page titles — matches the Student Dashboard greeting headline
 * (Montserrat 800, responsive clamp).
 */
export const PAGE_TITLE = {
  fontFamily: FONT_BODY,
  fontSize: "clamp(22px, 4.5vw, 30px)",
  fontWeight: 800,
  lineHeight: 1.25,
} as const

export const TYPE = {
  h1: {
    fontFamily: FONT_HEADING,
    fontSize: "16pt",
    fontWeight: 700,
    lineHeight: 1.25,
  },
  h2: {
    fontFamily: FONT_HEADING,
    fontSize: "14pt",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  body: {
    fontFamily: FONT_BODY,
    fontSize: "12pt",
    fontWeight: 400,
    lineHeight: 1.45,
  },
  bodyBold: {
    fontFamily: FONT_BODY,
    fontSize: "12pt",
    fontWeight: 700,
    lineHeight: 1.45,
  },
  caption: {
    fontFamily: FONT_BODY,
    fontSize: "11pt",
    fontWeight: 400,
    fontStyle: "italic" as const,
    lineHeight: 1.4,
  },
  sectionLabel: {
    fontFamily: FONT_BODY,
    fontSize: "10pt",
    fontWeight: 700,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    lineHeight: 1.3,
  },
} as const
