export type ScanStatus = "On Time" | "Late" | "Not Scanned"

export type ScanRecord = {
  id: string
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  status: ScanStatus
  timeOut: string | null
  hours: number
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
  if (dateStr === "—") return "—"

  const todayKey = todayManilaKey()
  if (dateStr === todayKey) return "Today"

  const todayManila = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
  )
  todayManila.setDate(todayManila.getDate() - 1)
  const yesterdayKey = manilaDateFmt.format(todayManila)

  if (dateStr === yesterdayKey) return "Yesterday"

  const [y, m, d] = dateStr.split("-").map(Number)
  const dateObj = new Date(y, m - 1, d)

  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function groupByMonth(
  scans: ScanRecord[]
): Record<string, ScanRecord[]> {
  return scans.reduce((acc, scan) => {
    if (scan.date === "—") return acc
    const [y, m, d] = scan.date.split("-").map(Number)
    const dateObj = new Date(y, m - 1, d)

    const monthKey = dateObj.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })

    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(scan)
    return acc
  }, {} as Record<string, ScanRecord[]>)
}

export function groupByDate(scans: ScanRecord[]): Record<string, ScanRecord[]> {
  return scans.reduce((acc, scan) => {
    if (!acc[scan.date]) acc[scan.date] = []
    acc[scan.date].push(scan)
    return acc
  }, {} as Record<string, ScanRecord[]>)
}

export function filterScansByMonthAndWeek(
  scans: ScanRecord[],
  monthString: string,
  weekOption: string
): ScanRecord[] {
  if (!scans || scans.length === 0) return []

  // if "all" is selected, return everything so the dashboard can group by month
  if (weekOption === "all") return scans

  // parse Month Year
  const targetDate = new Date(`${monthString} 1`)
  if (isNaN(targetDate.getTime())) return scans

  const targetMonth = targetDate.getMonth()
  const targetYear = targetDate.getFullYear()

  return scans.filter((scan) => {
    const [yearStr, monthStr, dayStr] = scan.date.split("-")
    const scanYear = parseInt(yearStr, 10)
    const scanMonth = parseInt(monthStr, 10) - 1
    const scanDay = parseInt(dayStr, 10)

    // check if scan matches the month and year in dropdown
    if (scanYear !== targetYear || scanMonth !== targetMonth) return false

    // If "All" weeks is selected, return all days in T
    if (weekOption === "all") return true

    // Calculate Week of the Month (Days 1-7 = Week 1, 8-14 = Week 2, etc.)
    // Otherwise, filter by the specific week
    const targetWeek = parseInt(weekOption.replace("week-", ""), 10)
    const weekOfMonth = Math.ceil(scanDay / 7)

    return weekOfMonth === targetWeek
  })
}
