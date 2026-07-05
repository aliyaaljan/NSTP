"use client"

import { useState } from "react"
import AdminCalendar from "@/components/admin/AdminCalendar"
import AdminAttendanceStrip, {
  type TodayAttendance,
} from "@/components/admin/AdminAttendanceStrip"
import { hasNoClasses } from "@/lib/class-days"

export default function AdminCalendarPanel({
  attendance,
  holidayDates = [],
}: {
  attendance: TodayAttendance
  holidayDates?: string[]
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const noClasses = hasNoClasses(selectedDate, holidayDates)

  return (
    <>
      <AdminCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <AdminAttendanceStrip data={attendance} noClasses={noClasses} />
    </>
  )
}
