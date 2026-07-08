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
  schoolYear?: string | null | undefined
}

export function formatClassLabel({ courseCode, facilitatorName, schoolYear }: ClassLabelParts): string {
  const course = (courseCode ?? "").trim()
  const surname = extractSurname(facilitatorName ?? "")
  const year = (schoolYear ?? "").trim()
  const yearSuffix = year ? ` · A.Y. ${year}` : ""
  if (course && surname) return `${course} — ${surname}${yearSuffix}`
  if (course) return `${course}${yearSuffix}`
  return surname || "Unassigned class"
}
