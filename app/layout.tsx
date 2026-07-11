import type { Metadata, Viewport } from "next"
import { Goblin_One, Cormorant, Montserrat } from "next/font/google"
import "./globals.css"
import { StudentProvider } from "@/app/student/StudentContext"

const goblinOne = Goblin_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-goblin",
  display: "swap",
})

const cormorant = Cormorant({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
})

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "UP Community Extension | Login",
  description: "University of the Philippines — Community Extension Program",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${goblinOne.variable} ${cormorant.variable} ${montserrat.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body
        style={{
          ["--font-title" as string]:   "var(--font-goblin, Georgia, serif)",
          ["--font-sub" as string]:     "var(--font-cormorant, Georgia, serif)",
          ["--font-content" as string]: "var(--font-montserrat, 'Helvetica Neue', Arial, sans-serif)",
        }}
      >
        <StudentProvider>
          {children}
        </StudentProvider>
      </body>
    </html>
  )
}