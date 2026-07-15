/**
 * Form create/edit contract for the admin forms page.
 *
 * Backend devs: implement `createForm()` and `updateForm()` in
 * `lib/admin/form-list-actions.ts`. The UI submits these payloads only.
 *
 * Database mapping:
 *   formRequirementId → `form_requirement.form_requirement_id` (edit only)
 *   title             → `form_requirement.title`
 *   description       → `form_requirement.description`
 *   dueDate           → `form_requirement.due_date` (YYYY-MM-DD or null)
 *   sectionId         → `form_requirement.section_id` (null = global default)
 */

import type { FormListRow } from "@/lib/admin/form-list"

export interface FormCreatePayload {
  /** `form_requirement.title` */
  title: string
  /** `form_requirement.description` */
  description: string | null
  /** `form_requirement.due_date` */
  dueDate: string | null
  /**
   * `form_requirement.section_id`
   * Empty string or "global" → null (global default for all sections).
   */
  sectionId: string | null
}

export interface FormEditPayload extends FormCreatePayload {
  /** `form_requirement.form_requirement_id` */
  formRequirementId: string
  /** Resolved section for the list row being edited */
  listSectionId: string
  /** Whether the source requirement is global */
  isGlobal: boolean
}

export type CreateFormResult = { ok: true } | { ok: false; error: string }
export type UpdateFormResult = CreateFormResult
export type DeleteFormResult = CreateFormResult

export const FORM_GLOBAL_SECTION = "global"

export function emptyFormCreatePayload(): FormCreatePayload {
  return {
    title: "",
    description: null,
    dueDate: null,
    sectionId: FORM_GLOBAL_SECTION,
  }
}

export function formRowToEditPayload(row: FormListRow): FormEditPayload {
  return {
    formRequirementId: row.formRequirementId,
    listSectionId: row.sectionId,
    isGlobal: row.isGlobal,
    title: row.formName,
    description: null,
    dueDate: row.dueDate,
    sectionId: row.requirementSectionId ?? FORM_GLOBAL_SECTION,
  }
}

export type FormFieldKey = "title" | "dueDate"

export type FormFieldErrors = Partial<Record<FormFieldKey, string>>

export function collectFormFieldErrors(payload: FormCreatePayload): FormFieldErrors {
  const errors: FormFieldErrors = {}
  if (!payload.title.trim()) {
    errors.title = "Form name is required."
  }
  if (payload.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.dueDate)) {
    errors.dueDate = "Due date must use YYYY-MM-DD format."
  }
  return errors
}

export function validateFormCreatePayload(payload: FormCreatePayload): string | null {
  const errors = collectFormFieldErrors(payload)
  return errors.title ?? errors.dueDate ?? null
}

export function validateFormEditPayload(payload: FormEditPayload): string | null {
  if (!payload.formRequirementId.trim()) {
    return "Form requirement ID is required."
  }
  return validateFormCreatePayload(payload)
}

export function normalizeFormSectionId(sectionId: string | null): string | null {
  if (!sectionId || sectionId === FORM_GLOBAL_SECTION) return null
  return sectionId
}
