"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import {
  SEMESTER_LABELS,
  buildSampleHolidays,
  formatSchoolYearOption,
  mapTermToAcademicConfig,
  type AdminCurrentUser,
  type HolidayRow,
  type SettingsMeta,
  type SettingsPageData,
  type TermDbRow,
} from "@/lib/admin/settings"
import {
  validateAcademicConfigPayload,
  validateHolidayCreatePayload,
  validateHolidayDelete,
  type AcademicConfigPayload,
  type HolidayCreatePayload,
  type SettingsMutationResult,
} from "@/lib/admin/settings-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"

/**
 * Fetches everything the admin settings page needs.
 *
 * Backend checklist:
 * 1. Keep returning `SettingsPageData` — no UI changes required.
 * 2. Wire `holiday` table when migration is added (see settings.ts contract).
 * 3. Persist `requiredNstpHours` in `system_settings` when available.
 * 4. Remove sample fallbacks once production data exists.
 *
 * GPS sites are managed on the Site List page (`lib/admin/site-list-actions.ts`).
 */
export async function getSettingsData(): Promise<SettingsPageData> {
  const supabase = await createSupabaseServerClient()

  const [termsRes, { data: authData }] = await Promise.all([
    supabase
      .from("term")
      .select("term_id, name, school_year, semester, start_date, end_date, is_active")
      .order("school_year", { ascending: false })
      .order("semester", { ascending: true }),
    supabase.auth.getUser(),
  ])

  if (termsRes.error) {
    console.error("[getSettingsData] term query failed", termsRes.error)
  }

  const terms = (termsRes.data as TermDbRow[] | null) ?? []
  const activeTerm = terms.find((t) => t.is_active) ?? terms[0]

  const schoolYearOptions = terms.map(formatSchoolYearOption)

  const academic = activeTerm
    ? mapTermToAcademicConfig(activeTerm, 60)
    : {
        termId: "",
        schoolYear: "2025-2026",
        semester: "first" as const,
        schoolYearStartDate: "2025-08-11",
        schoolYearEndDate: "2025-12-19",
        requiredNstpHours: 60,
      }

  // TODO(backend): SELECT from `holiday` WHERE term_id = activeTerm.term_id ORDER BY holiday_date
  const holidays: HolidayRow[] = buildSampleHolidays(academic.termId || "sample-term")

  const semesterLabel = SEMESTER_LABELS[academic.semester] ?? academic.semester

  const meta: SettingsMeta = {
    academicYear: academic.schoolYear,
    semester: semesterLabel,
  }

  const currentUser = await resolveCurrentUser(supabase, authData.user?.id)

  return {
    academic,
    schoolYearOptions,
    semesterOptions: [
      { value: "first", label: "1st Semester" },
      { value: "second", label: "2nd Semester" },
      { value: "midyear", label: "Midyear" },
    ],
    holidays,
    meta,
    currentUser,
  }
}

export async function updateAcademicConfig(
  payload: AcademicConfigPayload
): Promise<SettingsMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateAcademicConfigPayload(payload)
  if (validationError) return { ok: false, error: validationError }

  const supabase = await createSupabaseServerClient()

  const { error: deactivateError } = await supabase
    .from("term")
    .update({ is_active: false })
    .neq("term_id", payload.termId)

  if (deactivateError) {
    console.error("[updateAcademicConfig] deactivate failed", deactivateError)
    return { ok: false, error: "Failed to update active term." }
  }

  const { error } = await supabase
    .from("term")
    .update({
      school_year: payload.schoolYear.trim(),
      semester: payload.semester,
      start_date: payload.schoolYearStartDate,
      end_date: payload.schoolYearEndDate,
      is_active: true,
      name: `${SEMESTER_LABELS[payload.semester]} AY ${payload.schoolYear}`,
    })
    .eq("term_id", payload.termId)

  if (error) {
    console.error("[updateAcademicConfig] update failed", error)
    return { ok: false, error: "Failed to save academic configuration." }
  }

  // TODO(backend): upsert system_settings key 'default_nstp_hours' = payload.requiredNstpHours

  return { ok: true }
}

export async function createHoliday(
  payload: HolidayCreatePayload
): Promise<SettingsMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateHolidayCreatePayload(payload)
  if (validationError) return { ok: false, error: validationError }

  // TODO(backend): INSERT INTO holiday (term_id, name, holiday_date, description)
  console.info("[createHoliday] pending holiday table — payload:", payload)

  return {
    ok: false,
    error:
      "Holiday table not connected yet. Add the `holiday` migration, then implement INSERT in settings-actions.ts.",
  }
}

export async function deleteHoliday(holidayId: string): Promise<SettingsMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  if (holidayId.startsWith("sample-")) {
    return {
      ok: false,
      error: "Sample holidays cannot be deleted until the holiday table is connected.",
    }
  }

  // TODO(backend): DELETE FROM holiday WHERE holiday_id = holidayId
  console.info("[deleteHoliday] pending holiday table — id:", holidayId)

  return {
    ok: false,
    error: "Holiday table not connected yet. Implement DELETE in settings-actions.ts.",
  }
}

async function resolveCurrentUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId?: string
): Promise<AdminCurrentUser> {
  if (!userId) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const { data: appUser } = await supabase
    .from("app_user")
    .select("full_name, role:role_id(code)")
    .eq("app_user_id", userId)
    .maybeSingle()

  if (!appUser?.full_name) {
    return { name: "Admin Test Account", role: "NSTP Admin" }
  }

  const isAdmin = (appUser.role as { code?: string } | null)?.code === "admin"

  return {
    name: isAdmin ? "Admin Test Account" : appUser.full_name,
    role: isAdmin ? "NSTP Admin" : "Admin",
  }
}
