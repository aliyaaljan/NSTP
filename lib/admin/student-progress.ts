export type StudentProgressStatus = "on_track" | "in_progress" | "at_risk"

export function completionPct(
  hoursCompleted: number,
  hoursRequired: number
): number {
  if (hoursRequired <= 0) return 0
  return Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
}

export function progressStatusFromPct(
  pct: number,
  daysLeft?: number | null
): StudentProgressStatus {
  if (pct >= 100) return "on_track"

  if (daysLeft === undefined || daysLeft === null) {
    // fallback if end date is unavailable
    if (pct >= 60) return "on_track"
    if (pct >= 45) return "in_progress"
    return "at_risk"
  }

  const weeksLeft = Math.max(0, daysLeft / 7)

  // little time left and significantly behind
  if (weeksLeft <= 2 && pct < 80) return "at_risk"
  if (weeksLeft <= 4 && pct < 50) return "at_risk"
  if (weeksLeft <= 8 && pct < 25) return "at_risk"

  // on track: enough time and decent progress
  if (pct >= 75) return "on_track"
  if (weeksLeft > 4 && pct >= 40) return "on_track"
  if (weeksLeft > 8 && pct >= 20) return "on_track"

  return "in_progress"
}

export const PROGRESS_STATUS_LABELS: Record<StudentProgressStatus, string> = {
  on_track: "On track",
  in_progress: "In progress",
  at_risk: "At risk",
}

export const PROGRESS_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: StudentProgressStatus | "all"
  label: string
}> = [
  { value: "all", label: "All Status" },
  { value: "on_track", label: "On track" },
  { value: "in_progress", label: "In progress" },
  { value: "at_risk", label: "At risk" },
]
