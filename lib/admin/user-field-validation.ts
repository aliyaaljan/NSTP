export const EMAIL_MAX_LENGTH = 64
export const FULL_NAME_MAX_LENGTH = 64
export const STUDENT_NUMBER_LENGTH = 9
export const SAIS_ID_MAX_LENGTH = 8

export const STUDENT_NUMBER_PATTERN = /^\d{9}$/
export const SAIS_ID_PATTERN = /^\d{1,8}$/

export type UserFieldKey = "fullName" | "email" | "studentNumber" | "saisId"
export type UserFieldErrors = Partial<Record<UserFieldKey, string>>

/** Strip non-digits and cap length — for Student ID / SAIS ID inputs. */
export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength)
}

export function validateFullName(fullName: string): string | null {
  const value = fullName.trim()
  if (!value) return "Please enter the full name."
  if (value.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must not exceed ${FULL_NAME_MAX_LENGTH} characters.`
  }
  return null
}

export function validateUpEmail(email: string): string | null {
  const value = email.trim().toLowerCase()
  if (!value) return "Please enter the email."
  if (value.length > EMAIL_MAX_LENGTH) {
    return `Email must not exceed ${EMAIL_MAX_LENGTH} characters.`
  }
  if (!/^[^@\s]+@up\.edu\.ph$/.test(value)) {
    return "Please enter a valid UP email (@up.edu.ph)."
  }
  return null
}

export function validateStudentNumber(studentNumber: string | null): string | null {
  const value = studentNumber?.trim() ?? ""
  if (!value) return null
  if (!/^\d+$/.test(value)) return "Student ID must contain numbers only."
  if (!STUDENT_NUMBER_PATTERN.test(value)) {
    return `Please enter the ${STUDENT_NUMBER_LENGTH} digits of the Student ID.`
  }
  return null
}

export function validateSaisId(saisId: string | null): string | null {
  const value = saisId?.trim() ?? ""
  if (!value) return null
  if (!/^\d+$/.test(value)) return "SAIS ID must contain numbers only."
  if (!SAIS_ID_PATTERN.test(value)) {
    return `Please enter up to ${SAIS_ID_MAX_LENGTH} digits for the SAIS ID.`
  }
  return null
}

/** Collect per-field errors for inline form display. */
export function collectUserFieldErrors(input: {
  fullName?: string
  email?: string
  studentNumber?: string | null
  saisId?: string | null
}): UserFieldErrors {
  const errors: UserFieldErrors = {}
  if (input.fullName !== undefined) {
    const error = validateFullName(input.fullName)
    if (error) errors.fullName = error
  }
  if (input.email !== undefined) {
    const error = validateUpEmail(input.email)
    if (error) errors.email = error
  }
  if (input.studentNumber !== undefined) {
    const error = validateStudentNumber(input.studentNumber)
    if (error) errors.studentNumber = error
  }
  if (input.saisId !== undefined) {
    const error = validateSaisId(input.saisId)
    if (error) errors.saisId = error
  }
  return errors
}

export function firstUserFieldError(errors: UserFieldErrors): string | null {
  return (
    errors.fullName ??
    errors.email ??
    errors.studentNumber ??
    errors.saisId ??
    null
  )
}
