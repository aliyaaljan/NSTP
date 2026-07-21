export type ScanStatus = "Present" | "Not Scanned"

export type ScanRecord = {
  id: string
  name: string
  date: string
  generatedTime: string
  scannedTime: string
  timeOut?: string
  hours?: number
  status: ScanStatus
}

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

export function todayManilaKey(): string {
  return manilaDateFmt.format(new Date())
}

export function formatDate(dateStr: string) {
  if (!dateStr || dateStr.trim() === "") return "—"

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
    if (!scan.date || scan.date.trim() === "") return acc
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
  if (!scans || scans.length === 0 || !monthString) return []

  const targetDate = new Date(`${monthString} 1`)
  if (isNaN(targetDate.getTime())) return scans

  const targetMonth = targetDate.getMonth()
  const targetYear = targetDate.getFullYear()

  return scans.filter((scan) => {
    // Handle "Not Scanned" entries cleanly (they usually don't have a valid date string)
    if (!scan.date || scan.date.trim() === "") return weekOption === "all"

    const [yearStr, monthStr, dayStr] = scan.date.split("-")
    const scanYear = parseInt(yearStr, 10)
    const scanMonth = parseInt(monthStr, 10) - 1
    const scanDay = parseInt(dayStr, 10)

    // Filter by the selected Month & Year first
    if (scanYear !== targetYear || scanMonth !== targetMonth) return false

    // If "All" weeks is selected, return all days in this specific month
    if (weekOption === "all") return true

    // Otherwise, filter by the specific week of the month
    const targetWeek = parseInt(weekOption.replace("week-", ""), 10)
    const weekOfMonth = Math.ceil(scanDay / 7)

    return weekOfMonth === targetWeek
  })
}
