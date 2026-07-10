import type { StudentFormView } from "@/lib/forms/submission-actions"
import type { FormItem } from "@/components/student/Forms"
import type { CalendarEvent } from "@/components/student/Calendar"

export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function formsToDocuments(views: StudentFormView[]): FormItem[] {
  return views.map((v, i) => ({
    id: v.form_requirement_id ?? String(i),
    name: v.title,
    status:
      v.status === "submitted" || v.status === "approved"
        ? ("submitted" as const)
        : ("pending" as const),
    note: v.due_date
      ? `Due ${new Date(v.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : undefined,
  }))
}

export function formsToCalendarEvents(
  views: StudentFormView[]
): CalendarEvent[] {
  return views
    .filter((v) => v.due_date)
    .map((v) => {
      const d = new Date(v.due_date + "T00:00:00")
      const isSubmitted =
        v.status === "submitted" || v.status === "approved"
      const event: CalendarEvent = {
        day: d.getDate(),
        month: d.getMonth(),
        title: v.title,
        type: isSubmitted ? "submitted" : "deadline",
        status: isSubmitted ? "submitted" : "pending",
        note: `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      }
      return event
    })
}
