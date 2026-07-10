"use server"

import "server-only"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { resolveActiveStudentEnrollment } from "@/lib/student/enrollment"
import { lookupId } from "@/lib/lookups"

export type ClassmateRow = {
  enrollmentId: string
  fullName: string
  email: string
  program: string | null
  classification: string | null
  siteLocation: string | null
}

type ActionResult =
  | { ok: true; data: ClassmateRow[] }
  | { ok: false; error: string }

export async function getMyClassmates(): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient()
    const service = createSupabaseServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "Not authenticated" }

    const primary = await resolveActiveStudentEnrollment(service, user.id)
    if (!primary) return { ok: true, data: [] }

    const { data, error } = await service
      .from("enrollment")
      .select(
        `
        enrollment_id,
        student:student_user_id ( full_name, email ),
        program:program_id ( name ),
        student_classification:student_classification_id ( name ),
        geofence:assigned_geofence_id ( label )
      `
      )
      .eq("section_id", primary.section.section_id)
      .eq("enrollment_status_id", await lookupId("enrollment_status", "active"))

    if (error) {
      console.error("[getMyClassmates] query failed", error)
      return { ok: false, error: "Failed to load classmates." }
    }

    const rows: ClassmateRow[] = (data ?? []).map((e) => {
      const student = Array.isArray(e.student) ? e.student[0] : e.student
      const program = Array.isArray(e.program) ? e.program[0] : e.program
      const classification = Array.isArray(e.student_classification)
        ? e.student_classification[0]
        : e.student_classification
      const geofence = Array.isArray(e.geofence) ? e.geofence[0] : e.geofence

      return {
        enrollmentId: e.enrollment_id,
        fullName: student?.full_name ?? "",
        email: student?.email ?? "",
        program: program?.name ?? null,
        classification: classification?.name ?? null,
        siteLocation: geofence?.label ?? null,
      }
    })

    return { ok: true, data: rows }
  } catch (err) {
    console.error("[getMyClassmates] failed", err)
    return { ok: false, error: "Failed to load classmates. Please try again." }
  }
}
