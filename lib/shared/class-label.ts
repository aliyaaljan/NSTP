export function extractSurname(fullName: string): string {
  const name = fullName.trim()
  if (!name) return ""
  const commaIndex = name.indexOf(",")
  if (commaIndex !== -1) return name.slice(0, commaIndex).trim()
  const tokens = name.split(/\s+/)
  return tokens[tokens.length - 1]
}

export interface ClassLabelParts {
  courseCode: string | null | undefined
  facilitatorName: string | null | undefined
}

export function formatClassLabel({ courseCode, facilitatorName }: ClassLabelParts): string {
  const course = (courseCode ?? "").trim()
  const surname = extractSurname(facilitatorName ?? "")
  if (course && surname) return `${course} — ${surname}`
  return course || surname || "Unassigned class"
}
