"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import {
  SEMESTER_LABELS,
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
  type AcademicConfigPayload,
  type HolidayCreatePayload,
  type SettingsMutationResult,
} from "@/lib/admin/settings-edit"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

const DEFAULT_NSTP_HOURS = 60
const DEFAULT_NSTP_HOURS_KEY = "default_nstp_hours"

/** Coerce a `system_settings.setting_value` jsonb into a positive hour count. */
function coerceNstpHours(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_NSTP_HOURS
}

/**
 * Fetches everything the admin settings page needs, all from real tables:
 * academic config + school-year options from `term`, holidays from `holiday`
 * (active term), and the default NSTP hours from `system_settings`.
 *
 * GPS sites are managed on the Site List page (`lib/admin/site-list-actions.ts`).
 */
export async function getSettingsData(): Promise<SettingsPageData> {
  const supabase = await createSupabaseServerClient()

  const [termsRes, { data: authData }, settingsRes] = await Promise.all([
    supabase
      .from("term")
      .select("term_id, name, school_year, semester, start_date, end_date, is_active")
      .order("school_year", { ascending: false })
      .order("semester", { ascending: true }),
    supabase.auth.getUser(),
    supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", DEFAULT_NSTP_HOURS_KEY)
      .maybeSingle(),
  ])

  if (termsRes.error) {
    console.error("[getSettingsData] term query failed", termsRes.error)
  }

  const terms = (termsRes.data as TermDbRow[] | null) ?? []
  const activeTerm = terms.find((t) => t.is_active) ?? terms[0]

  const schoolYearOptions = terms.map(formatSchoolYearOption)

  const requiredNstpHours = coerceNstpHours(settingsRes.data?.setting_value)

  const academic = activeTerm
    ? mapTermToAcademicConfig(activeTerm, requiredNstpHours)
    : {
        termId: "",
        schoolYear: "2025-2026",
        semester: "first" as const,
        schoolYearStartDate: "2025-08-11",
        schoolYearEndDate: "2025-12-19",
        requiredNstpHours,
      }

  const holidays: HolidayRow[] = activeTerm
    ? await fetchHolidays(supabase, activeTerm.term_id)
    : []

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

  // Writes bypass RLS via the service role (the `term` / `system_settings`
  // tables expose no write policy — only the admin-guarded server action here).
  const service = createSupabaseServiceClient()

  const { error: deactivateError } = await service
    .from("term")
    .update({ is_active: false })
    .neq("term_id", payload.termId)

  if (deactivateError) {
    console.error("[updateAcademicConfig] deactivate failed", deactivateError)
    return { ok: false, error: "Failed to update active term." }
  }

  const { error } = await service
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

  const { error: settingsError } = await service
    .from("system_settings")
    .upsert(
      { setting_key: DEFAULT_NSTP_HOURS_KEY, setting_value: payload.requiredNstpHours },
      { onConflict: "setting_key" }
    )

  if (settingsError) {
    console.error("[updateAcademicConfig] system_settings upsert failed", settingsError)
    return { ok: false, error: "Failed to save required NSTP hours." }
  }

  return { ok: true }
}

export async function createHoliday(
  payload: HolidayCreatePayload
): Promise<SettingsMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const validationError = validateHolidayCreatePayload(payload)
  if (validationError) return { ok: false, error: validationError }

  const service = createSupabaseServiceClient()
  const { error } = await service.from("holiday").insert({
    term_id: payload.termId,
    name: payload.name.trim(),
    holiday_date: payload.date,
    description: payload.description?.trim() || null,
  })

  if (error) {
    console.error("[createHoliday] insert failed", error)
    // unique (term_id, holiday_date) — one holiday entry per date per term
    if (error.code === "23505") {
      return { ok: false, error: "A holiday already exists on that date." }
    }
    return { ok: false, error: "Failed to create holiday." }
  }

  return { ok: true }
}

export async function deleteHoliday(holidayId: string): Promise<SettingsMutationResult> {
  const role = await getAppUserRole()
  if (role !== "admin") return { ok: false, error: "Unauthorized." }

  const service = createSupabaseServiceClient()
  const { error } = await service.from("holiday").delete().eq("holiday_id", holidayId)

  if (error) {
    console.error("[deleteHoliday] delete failed", error)
    return { ok: false, error: "Failed to delete holiday." }
  }

  return { ok: true }
}

async function fetchHolidays(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  termId: string
): Promise<HolidayRow[]> {
  const { data, error } = await supabase
    .from("holiday")
    .select("holiday_id, term_id, name, holiday_date, description")
    .eq("term_id", termId)
    .order("holiday_date", { ascending: true })

  if (error) {
    console.error("[getSettingsData] holiday query failed", error)
    return []
  }

  return (data ?? []).map((row) => ({
    holidayId: row.holiday_id,
    termId: row.term_id,
    name: row.name,
    date: row.holiday_date,
    description: row.description,
  }))
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
