import "server-only"

import { lookupId } from "@/lib/lookups"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

// Accepts either the RLS server client or the service client.
type DbClient = Pick<ReturnType<typeof createSupabaseServiceClient>, "from">

/** Role codes that may own a class. */
export function isFacilitatorEligible(roleCode: string | null | undefined): boolean {
  return roleCode === "adviser" || roleCode === "admin"
}

export interface FacilitatorPoolMember {
  userId: string
  fullName: string
  isActive: boolean
  roleCode: "adviser" | "admin"
  /** The member's class in the requested term (null for a class-less adviser). */
  sectionId: string | null
  courseCode: string | null
}

/**
 * Who IS a facilitator for a term: every adviser-role account (any is_active)
 * UNION everyone who owns a section in the term (covers admins).
 * termId omitted = the active term.
 */
export async function getFacilitatorPool(
  client: DbClient,
  termId?: string
): Promise<FacilitatorPoolMember[]> {
  const adviserRoleId = await lookupId("role", "adviser")
  const sectionSelect =
    "section_id, course_code, adviser_user_id, adviser:adviser_user_id(full_name, is_active, role:role_id(code))"

  const [advisersRes, sectionsRes] = await Promise.all([
    client
      .from("app_user")
      .select("app_user_id, full_name, is_active")
      .eq("role_id", adviserRoleId),
    termId
      ? client.from("section").select(sectionSelect).eq("term_id", termId)
      : client
          .from("section")
          .select(`${sectionSelect}, term:term_id!inner(is_active)`)
          .eq("term.is_active", true),
  ])

  const pool = new Map<string, FacilitatorPoolMember>()
  for (const a of (advisersRes.data as Array<{ app_user_id: string; full_name: string | null; is_active: boolean }>) ?? []) {
    pool.set(a.app_user_id, {
      userId: a.app_user_id,
      fullName: a.full_name ?? "",
      isActive: a.is_active === true,
      roleCode: "adviser",
      sectionId: null,
      courseCode: null,
    })
  }
  for (const s of (sectionsRes.data as Array<{
    section_id: string
    course_code: string
    adviser_user_id: string
    adviser: { full_name?: string; is_active?: boolean; role?: { code?: string } | null } | null
  }>) ?? []) {
    const owner = s.adviser
    const existing = pool.get(s.adviser_user_id)
    pool.set(s.adviser_user_id, {
      userId: s.adviser_user_id,
      fullName: existing?.fullName || (owner?.full_name ?? ""),
      isActive: existing?.isActive ?? owner?.is_active === true,
      roleCode: existing?.roleCode ?? (owner?.role?.code === "admin" ? "admin" : "adviser"),
      sectionId: s.section_id,
      courseCode: s.course_code,
    })
  }
  return [...pool.values()]
}

export interface AssignableFacilitator {
  userId: string
  fullName: string
  isAdmin: boolean
}

/** Who CAN receive a class: every ACTIVE account with role adviser or admin. */
export async function getAssignableFacilitators(
  client: DbClient
): Promise<AssignableFacilitator[]> {
  const [adviserRoleId, adminRoleId] = await Promise.all([
    lookupId("role", "adviser"),
    lookupId("role", "admin"),
  ])
  const { data } = await client
    .from("app_user")
    .select("app_user_id, full_name, role_id")
    .in("role_id", [adviserRoleId, adminRoleId])
    .eq("is_active", true)
    .order("full_name")
  return ((data as Array<{ app_user_id: string; full_name: string | null; role_id: string }>) ?? []).map((r) => ({
    userId: r.app_user_id,
    fullName: r.full_name ?? "",
    isAdmin: r.role_id === adminRoleId,
  }))
}

/** Does this user own a section in the active term? (= "is currently a facilitator") */
export async function userOwnsActiveTermSection(
  client: DbClient,
  userId: string
): Promise<boolean> {
  const { count } = await client
    .from("section")
    .select("section_id, term:term_id!inner(is_active)", { count: "exact", head: true })
    .eq("adviser_user_id", userId)
    .eq("term.is_active", true)
  return (count ?? 0) > 0
}
