"use server"

import { getAppUserRole } from "@/lib/auth-actions"
import type {
  ExportAnalyticsRequest,
  ExportAnalyticsResult,
} from "@/lib/admin/export-analytics"

/**
 * Generates and returns a dashboard analytics export.
 *
 * Backend implementation checklist:
 * 1. Validate `request` (fileType, content, sectionId).
 * 2. Query Supabase using `sectionId` (null = all sections).
 * 3. Build the dataset for `request.content` (stats, sections, at_risk, etc.).
 * 4. Render to PDF / CSV / XLSX.
 * 5. Upload to storage (or stream) and return `{ ok: true, downloadUrl, fileName }`.
 */
export async function exportDashboardAnalytics(
  request: ExportAnalyticsRequest
): Promise<ExportAnalyticsResult> {
  const role = await getAppUserRole()
  if (role !== "admin") {
    return { ok: false, error: "Unauthorized" }
  }

  // TODO(backend): replace with real export generation.
  // Example query entry point:
  //   const supabase = await createSupabaseServerClient()
  //   let query = supabase.from("enrollment").select("...")
  //   if (request.sectionId) query = query.eq("section_id", request.sectionId)

  console.info("[exportDashboardAnalytics] pending implementation", request)

  return {
    ok: false,
    error: "Export is not available yet. Backend export handler still needs to be implemented.",
  }
}
