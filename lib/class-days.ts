/** Month/day pairs for recurring institutional holidays (UP Baguio calendar). */
const INSTITUTIONAL_HOLIDAYS: { month: number; day: number }[] = [
  { month: 0, day: 1 },
  { month: 1, day: 6 },
  { month: 1, day: 23 },
  { month: 2, day: 25 },
  { month: 2, day: 26 },
  { month: 2, day: 27 },
  { month: 3, day: 9 },
  { month: 4, day: 1 },
  { month: 5, day: 12 },
  { month: 6, day: 15 },
  { month: 7, day: 21 },
  { month: 7, day: 31 },
  { month: 8, day: 1 },
  { month: 8, day: 13 },
  { month: 10, day: 1 },
  { month: 10, day: 2 },
  { month: 10, day: 30 },
  { month: 11, day: 8 },
  { month: 11, day: 24 },
  { month: 11, day: 25 },
  { month: 11, day: 30 },
  { month: 11, day: 31 },
]

function toLocalDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isHoliday(date: Date, extraHolidayDates: string[] = []): boolean {
  const iso = toLocalDateISO(date)
  if (extraHolidayDates.includes(iso)) return true
  return INSTITUTIONAL_HOLIDAYS.some(
    (h) => h.month === date.getMonth() && h.day === date.getDate()
  )
}

export function hasNoClasses(date: Date, extraHolidayDates: string[] = []): boolean {
  return isWeekend(date) || isHoliday(date, extraHolidayDates)
}
