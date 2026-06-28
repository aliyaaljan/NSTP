/**
 * Audit Log Export — shared contract for the admin audit log export modal.
 *
 * Backend devs: implement server export in `/api/export/audit-log` when ready.
 * The UI builds an `AuditLogExportRequest` and downloads CSV client-side today.
 */

import type { AuditLogAction, AuditLogDateRange } from "@/lib/admin/audit-log"
import { AUDIT_LOG_ALL_ACTIONS } from "@/lib/admin/audit-log"
import { EXPORT_FILE_TYPE_OPTIONS, type ExportFileType } from "@/lib/admin/export-analytics"

export { EXPORT_FILE_TYPE_OPTIONS }

export interface AuditLogExportRequest {
  fileType: ExportFileType
  action: AuditLogAction | typeof AUDIT_LOG_ALL_ACTIONS
  dateRange: AuditLogDateRange
}

export function buildAuditLogExportRequest(input: {
  fileType: string
  action: string
  dateRange: string
}): AuditLogExportRequest | null {
  const fileType = EXPORT_FILE_TYPE_OPTIONS.find((o) => o.value === input.fileType)?.value
  if (!fileType) return null

  const action =
    input.action === "INSERT" ||
    input.action === "UPDATE" ||
    input.action === "DELETE"
      ? input.action
      : AUDIT_LOG_ALL_ACTIONS

  const dateRange =
    input.dateRange === "7d" ||
    input.dateRange === "30d" ||
    input.dateRange === "90d" ||
    input.dateRange === "all"
      ? input.dateRange
      : "7d"

  return { fileType, action, dateRange }
}
