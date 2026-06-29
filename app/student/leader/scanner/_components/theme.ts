import { Montserrat } from "next/font/google"

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
})

export const C = {
  green: "#14492E",
  greenLight: "#1A5C3A",
  greenBg: "#E8F5EF",
  maroon: "#7B1113",
  maroonLight: "#9E1A1C",
  gold: "#C8A84B",
  pageBg: "#F0F0F0",
  cardBg: "#FFFFFF",
  cardShadow: "0 2px 12px rgba(0,0,0,0.06)",
  cardShadowHover: "0 4px 20px rgba(0,0,0,0.1)",
  border: "#E8E8E8",
  borderLight: "#F0F0F0",
  textDark: "#1A1A1A",
  textGray: "#8A8A8A",
  textMuted: "#B8B8B8",
  textLight: "#6B6B6B",
  success: "#0B6E4F",
  successBg: "#E6F4ED",
  warning: "#8B5E00",
  warningBg: "#FFF3E0",
}

export const COLLAPSED_W = 88
export const RAIL_MARGIN = 16
