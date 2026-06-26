// FOR EXPORTING ANALYTICS
import { NextResponse } from "next/server"
import { getAppUserRole } from "@/lib/auth-actions"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { lookupId } from "@/lib/lookups"
import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export async function GET(request: Request) {
  try {
    // ensure role bounds
    const role = await getAppUserRole()
    if (role !== "admin") {
      return new NextResponse("Unauthorized user", { status: 403 })
    }

    // parse active filter options
    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get("sectionId")
    const content = searchParams.get("content") || "all"
    const fileType = (searchParams.get("fileType") || "csv") as
      | "csv"
      | "xlsx"
      | "pdf"

    const service = createSupabaseServiceClient()
    const activeStatusId = await lookupId("enrollment_status", "active")

    // query the records matching current layout parameters
    let enrollmentQuery = service
      .from("enrollment")
      .select(
        `
        enrollment_id,
        app_user(full_name, email, student_number),
        section!inner(name, required_hour_total, app_user(full_name)),
        attendance_session(duration_minute)
      `
      )
      .eq("enrollment_status_id", activeStatusId)

    if (sectionId && sectionId !== "all") {
      enrollmentQuery = enrollmentQuery.eq("section_id", sectionId)
    }

    const { data: rawEnrollments, error: dbError } = await enrollmentQuery
    if (dbError || !rawEnrollments) {
      return new NextResponse("Failed to compile database records.", {
        status: 500,
      })
    }

    // filter data rows and build table array
    const headers = [
      "Student Name",
      "Email",
      "Student Number",
      "Section",
      "Hours Rendered",
      "Completion %",
    ]
    const rows: any[] = []

    rawEnrollments.forEach((en: any) => {
      const targetHours = en.section?.required_hour_total || 60
      const totalMinutes =
        en.attendance_session?.reduce(
          (sum: number, s: any) => sum + (s.duration_minute || 0),
          0
        ) || 0
      const hoursRendered = Math.round(totalMinutes / 60)
      const pct = Math.min(100, Math.round((hoursRendered / targetHours) * 100))

      // for "at-risk" logic consistency
      if (content === "at_risk" && pct >= 45) return
      rows.push([
        en.app_user?.full_name || "Unkown Identity",
        en.app_user?.email || "",
        en.app_user?.student_number || "",
        `Section ${en.section?.name || ""}`,
        hoursRendered,
        `${pct}`,
      ])
    })
  } catch {}
}
