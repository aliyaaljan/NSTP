import "server-only"

import { SEMESTER_LABELS } from "@/lib/admin/settings"
import type { createSupabaseServerClient } from "@/lib/supabase/server-client"

/** The academic-year / semester labels shown in admin page sub-headers. */
export interface ActiveTermMeta {
  academicYear: string
  semester: string
}

/**
 * Resolves the current active `term` into the `{ academicYear, semester }`
 * labels the admin page headers render. Centralizes the query that several
 * admin list actions had copy-pasted (and that Access Control / Forms had
 * hardcoded). Falls back to sensible literals only when no active term exists.
 *
 * NOTE: the `term` column is `school_year` (not `academic_year`) and `semester`
 * is a code (`first`/`second`/`midyear`) that must be mapped through
 * `SEMESTER_LABELS` — two mistakes that previously lived in the inline copies.
 */
export async function getActiveTermMeta(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<ActiveTermMeta> {
  const { data: activeTerm } = await supabase
    .from("term")
    .select("school_year, semester")
    .eq("is_active", true)
    .maybeSingle()

  const semesterCode = (activeTerm?.semester ??
    "second") as keyof typeof SEMESTER_LABELS

  return {
    academicYear: activeTerm?.school_year ?? "2025-2026",
    semester: SEMESTER_LABELS[semesterCode] ?? "2nd Semester",
  }
}
