/**
 * Student edit contract for the admin student list page.
 *
 * Backend devs: implement `updateStudent()` in `lib/admin/student-list-actions.ts`.
 * The UI submits `StudentEditPayload` only — no other shape is required.
 *
 * Database mapping:
 *   enrollmentId   → `enrollment.enrollment_id` (lookup key)
 *   studentUserId  → `enrollment.student_user_id` / `app_user.app_user_id`
 *   fullName       → `app_user.full_name`
 *   email          → `app_user.email` (must satisfy @up.edu.ph check constraint)
 *   studentNumber  → `app_user.student_number`
 *   sectionId      → `enrollment.section_id` → `section.section_id`
 *   saisId                  → `app_user.sais_id`
 *   programId               → `enrollment.program_id`
 *   studentClassificationId → `enrollment.student_classification_id`
 *   enlistmentStatusId      → `enrollment.enlistment_status_id`
 */

import type { StudentListRow } from "@/lib/admin/student-list"
import {
  STUDENT_NUMBER_LENGTH,
  STUDENT_NUMBER_PATTERN,
  validateFullName,
  validateSaisId,
  validateStudentNumber,
  validateUpEmail,
} from "@/lib/admin/user-field-validation"

export { STUDENT_NUMBER_PATTERN }

/**
 * Normalize a roster-format student name ("SURNAME, First Middle") to the
 * stored "SURNAME First Middle" form: commas become spaces, whitespace is
 * collapsed. Surname-first order is preserved (the export puts the surname
 * before the comma). Casing, periods, and hyphens are untouched.
 */
export function normalizeStudentFullName(raw: string): string {
  return raw.replace(/,/g, " ").replace(/\s+/g, " ").trim()
}

export interface StudentEditPayload {
  /** `enrollment.enrollment_id` */
  enrollmentId: string
  /** `enrollment.student_user_id` → `app_user.app_user_id` */
  studentUserId: string
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.student_number` */
  studentNumber: string | null
  /** `app_user.sais_id` — optional */
  saisId: string | null
  /** `enrollment.program_id` — optional */
  programId: string | null
  /** `enrollment.student_classification_id` — optional */
  studentClassificationId: string | null
  /** `enrollment.enlistment_status_id` — optional */
  enlistmentStatusId: string | null
  /** `enrollment.section_id` → `section.section_id` */
  sectionId: string
}

export type UpdateStudentResult =
  | { ok: true }
  | { ok: false; error: string }

export interface StudentCreatePayload {
  /** `app_user.full_name` */
  fullName: string
  /** `app_user.email` */
  email: string
  /** `app_user.student_number` */
  studentNumber: string | null
  /** `app_user.sais_id` — optional */
  saisId: string | null
  /** `enrollment.program_id` — optional */
  programId: string | null
  /** `enrollment.student_classification_id` — optional */
  studentClassificationId: string | null
  /** `enrollment.enlistment_status_id` — optional */
  enlistmentStatusId: string | null
  /** `enrollment.section_id` → `section.section_id` */
  sectionId: string
}

export type CreateStudentResult = UpdateStudentResult

export function emptyStudentCreatePayload(): StudentCreatePayload {
  return {
    fullName: "",
    email: "",
    studentNumber: null,
    saisId: null,
    programId: null,
    studentClassificationId: null,
    enlistmentStatusId: null,
    sectionId: "",
  }
}

/** Build the edit form payload from a list row. */
export function studentRowToEditPayload(row: StudentListRow): StudentEditPayload {
  return {
    enrollmentId: row.enrollmentId,
    studentUserId: row.studentUserId,
    fullName: row.fullName,
    email: row.email,
    studentNumber: row.studentNumber,
    saisId: row.saisId,
    programId: row.programId,
    studentClassificationId: row.studentClassificationId,
    enlistmentStatusId: row.enlistmentStatusId,
    sectionId: row.sectionId,
  }
}

/** Shared client/server validation before calling `updateStudent()`. */
export function validateStudentEditPayload(
  payload: StudentEditPayload
): string | null {
  if (!payload.enrollmentId.trim()) {
    return "Enrollment ID is required."
  }
  if (!payload.studentUserId.trim()) {
    return "Student user ID is required."
  }
  const fieldError =
    validateFullName(payload.fullName) ??
    validateUpEmail(payload.email) ??
    validateStudentNumber(payload.studentNumber) ??
    validateSaisId(payload.saisId)
  if (fieldError) return fieldError
  if (!payload.sectionId.trim()) {
    return "Section is required."
  }
  return null
}

/** Shared client/server validation before calling `createStudent()`. */
export function validateStudentCreatePayload(
  payload: StudentCreatePayload
): string | null {
  if (!payload.studentNumber?.trim()) {
    return `Please enter the ${STUDENT_NUMBER_LENGTH} digits of the Student ID.`
  }
  const fieldError =
    validateFullName(payload.fullName) ??
    validateUpEmail(payload.email) ??
    validateStudentNumber(payload.studentNumber) ??
    validateSaisId(payload.saisId)
  if (fieldError) return fieldError
  if (!payload.sectionId.trim()) {
    return "Section is required."
  }
  return null
}
