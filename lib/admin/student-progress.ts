export type StudentProgressStatus = "on_track" | "in_progress" | "at_risk"

export function completionPct(hoursCompleted: number, hoursRequired: number): number {
  if (hoursRequired <= 0) return 0
  return Math.min(100, Math.round((hoursCompleted / hoursRequired) * 100))
}

export function progressStatusFromPct(pct: number): StudentProgressStatus {
  if (pct >= 60) return "on_track"
  if (pct >= 45) return "in_progress"
  return "at_risk"
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
