export type ScanStatus = "On Time" | "Late"

export type ScanRecord = {
  id: string
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  status: ScanStatus
}

export const LATE_CUTOFF_MINUTES = 8 * 60 + 15

const manilaDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const manilaClockFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
})

const manilaPartsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
})

function safeParse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? d : null
}

export function manilaDateKey(iso: string | null | undefined): string {
  const d = safeParse(iso)
  if (!d) return "—"
  return manilaDateFmt.format(d)
}

export function manilaClock(iso: string | null | undefined): string {
  const d = safeParse(iso)
  if (!d) return "—"
  return manilaClockFmt.format(d)
}

export function manilaMinutesPastMidnight(
  iso: string | null | undefined
): number {
  const d = safeParse(iso)
  if (!d) return -1
  const parts = manilaPartsFmt.formatToParts(d)
  const hour = Number(parts.find((p) => p.type === "hour")?.value)
  const minute = Number(parts.find((p) => p.type === "minute")?.value)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1
  return hour * 60 + minute
}

export function todayManilaKey(): string {
  return manilaDateFmt.format(new Date())
}

export function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return "Today"
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr)
  const today = new Date()
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export function getCurrentWeekNumber(): number {
  const today = new Date()
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

export function filterByWeek(
  scans: ScanRecord[],
  weekOption: string
): ScanRecord[] {
  if (weekOption === "all") return scans

  const currentWeek = getCurrentWeekNumber()
  let targetWeek: number

  if (weekOption === "this-week") {
    targetWeek = currentWeek
  } else if (weekOption === "last-week") {
    targetWeek = currentWeek - 1
  } else {
    const weekNum = parseInt(weekOption.split("-")[1])
    targetWeek = currentWeek - weekNum
  }

  return scans.filter((scan) => getWeekNumber(scan.date) === targetWeek)
}

export function groupByMonth(
  scans: ScanRecord[]
): Record<string, ScanRecord[]> {
  return scans.reduce(
    (acc, scan) => {
      const monthKey = new Date(scan.date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      if (!acc[monthKey]) acc[monthKey] = []
      acc[monthKey].push(scan)
      return acc
    },
    {} as Record<string, ScanRecord[]>
  )
}

export function groupByDate(
  scans: ScanRecord[]
): Record<string, ScanRecord[]> {
  return scans.reduce(
    (acc, scan) => {
      if (!acc[scan.date]) acc[scan.date] = []
      acc[scan.date].push(scan)
      return acc
    },
    {} as Record<string, ScanRecord[]>
  )
}
