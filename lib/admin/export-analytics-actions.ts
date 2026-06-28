/**
INACTIVE
export architecture has been migrated away from cloud-bucket Server Actions over to an optimized, in-memory local file stream.
 * migrated to `/app/api/export/route.ts`
 * frontend component `@/components/admin/DashboardExportButton.tsx`
 */
/*
"use server"

import { getAppUserRole } from "../auth-actions"
import { createSupabaseServiceClient } from "../supabase/service-client"
import { lookupId } from "@/lib/lookups"
import {
  type ExportAnalyticsRequest,
  type ExportAnalyticsResult,
} from "./export-analytics" // for definitions
import { lookup } from "dns"
import { link } from "fs"

export async function exportDashboardAnalytics(
  request: ExportAnalyticsRequest
): Promise<ExportAnalyticsResult> {
  try {
    // for admin only
    const role = await getAppUserRole()
    if (role != "admin") {
      return { ok: false, error: "Unauthorized user." }
    }
    const service = createSupabaseServiceClient() // for safely building aggregate tables
    const activeStatusId = await lookupId("enrollment_status", "active")

    // fetching data based on filter
    let enrollmentQuery = service
      .from("enrollment")
      .select(
        `
    enrollment_id,
    app_user(full_name, email, student_number),
    section(name, required_hour_total, app_user(full_name)),
    attendance_session(duration_minute)
    `
      )
      .eq("enrollment_status_id", activeStatusId)

    if (request.sectionId) {
      enrollmentQuery = enrollmentQuery.eq("section_id", request.sectionId)
    }

    const { data: rawEnrollments, error: dbError } = await enrollmentQuery
    if (dbError || !rawEnrollments) {
      return { ok: false, error: "Failed to fetch analytical records." }
    }
    // compile structure of document based on selection constraints
    let documentOutputString = ""
    if (request.fileType === "csv" || request.fileType === "xlsx") {
      // create standardized spreadsheet row elements
      documentOutputString =
        "Student Name, Email, Student Number, Section, Hours Rendered, Completion %\n"

      rawEnrollments.forEach((en: any) => {
        const studentName = en.app_user?.full_name || "Unkown Identity"
        const email = en.app_user?.email || ""
        const studentNum = en.app_user?.student_number || ""
        const sectionName = en.section?.name || ""
        const targetHours = en.section?.required_hour_total || 60

        const totalMinutes =
          en.attendance_session?.reduce(
            (sum: number, s: any) => sum + (s.duration_minute || 0),
            0
          ) || 0
        const hoursRendered = Math.round(totalMinutes / 60)
        const pct = Math.min(
          100,
          Math.round((hoursRendered / targetHours) * 100)
        )

        // escape content cell markers to preserve structure of columns
        documentOutputString += `"${studentName}","${email}","${studentNum}","Section ${sectionName}",${hoursRendered},${pct}%\n`
      })
    } else if (request.fileType === "pdf") {
      // format of output file TBD
      documentOutputString = `=== NSTP ADMINISTRATIVE STATUS REPORT ===\nExport Mode: ${request.content.toUpperCase()}\nTimestamp: ${
        new Date().toLocaleString
      }\nScope: ${
        request.sectionId
          ? "Section Parameter Id " + request.sectionId
          : "All Managed Roster Channels"
      }\nActive Registrations Logged: ${rawEnrollments.length}\n`
    }

    // transform string text metrics into file chunks then direct to system
    const fileBuffer = Buffer.from(documentOutputString, "utf-8")
    const fileName = `NSTP_Analytics_Report_${Date.now()}.${request.fileType}`
    const objectStorageKey = `exports/${fileName}`

    const { error: uploadError } = await service.storage
      .from("forms")
      .upload(objectStorageKey, fileBuffer, {
        contentType: request.fileType === "csv" ? "text/csv" : "text/plain",
        upsert: true,
      })
    if (uploadError) {
      return {
        ok: false,
        error: "Failed to save file payload to system object storage",
      }
    }

    // expiring presigned download reference token available for 60 seconds
    const { data: linkData, error: linkError } = await service.storage
      .from("forms")
      .createSignedUrl(objectStorageKey, 60)

    if (linkError || !linkData?.signedUrl) {
      return {
        ok: false,
        error: "Failed to generate dynamic download validation keys",
      }
    }

    // return the payload matching ExportAnalyticsResult signature contract
    return {
      ok: true,
      downloadUrl: linkData.signedUrl,
      fileName,
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
*/
export async function exportDashboardAnalytics() {
  return {
    ok: false,
    error: "Export pipeline has been moved to the /api/export stream route.",
  }
}
