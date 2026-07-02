export const DELIMITER = "|||"

export function packReason(
  typeName: string,
  title: string,
  body: string
): string {
  // cleans inputs to prevent delimiter injection
  const safeType = typeName.replace(/\|/g, "")
  const safeTitle = title.replace(/\|/g, "")

  return `${safeType}${DELIMITER}${safeTitle}${DELIMITER}${body}`
}

export function parseReason(reason: string) {
  if (!reason) return { type: "Others", title: "Request", body: "" }

  const parts = reason.split(DELIMITER)
  return {
    type: parts.length >= 3 ? parts[0] : "Others",
    title: parts.length >= 3 ? parts[1] : "Request",
    body: parts.length >= 3 ? parts.slice(2).join(DELIMITER) : reason,
  }
}
