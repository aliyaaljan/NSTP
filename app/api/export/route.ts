import { NextResponse } from "next/server"
import { getAppUserRole } from "@/lib/auth-actions"
import { createSupabaseServerClient } from "@/lib/supabase/server-client"
import { lookupId } from "@/lib/lookups"
import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { ExportContentType } from "@/lib/admin/export-analytics"
import {
  AUDIT_LOG_SELECT,
  formatAuditLogTimestamp,
  mapAuditLogDbRow,
} from "@/lib/admin/audit-log"
import { formatClassLabel } from "@/lib/shared/class-label"

export async function GET(request: Request) {
  try {
    const role = await getAppUserRole()
    if (role !== "admin") {
      return new NextResponse("Unauthorized access", { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sectionId = searchParams.get("sectionId")
    const content = (searchParams.get("content") || "all") as ExportContentType
    const fileType = (searchParams.get("fileType") || "csv") as
      | "csv"
      | "xlsx"
      | "pdf"

    // Audit Log Filters
    const filterAction = searchParams.get("action")
    const filterDateRange = searchParams.get("dateRange")
    const filterQ = searchParams.get("q")

    // Use Server Client so RLS and security contexts are maintained
    const supabase = await createSupabaseServerClient()
    const activeStatusId = await lookupId("enrollment_status", "active")
    const adviserRoleId = await lookupId("role", "adviser")

    let headers: string[] = []
    let rows: any[] = []

    // DYNAMIC DATA FETCHING AND FILTERING
    switch (content) {
      case "activity": {
        let auditQuery = supabase
          .from("audit_log_readable")
          .select(AUDIT_LOG_SELECT)
          .order("created_at", { ascending: false })
          .limit(1000)

        if (filterAction && filterAction !== "all") {
          auditQuery = auditQuery.eq("action", filterAction)
        }

        if (filterDateRange && filterDateRange !== "all") {
          const days = parseInt(filterDateRange.replace("d", ""), 10)
          if (!isNaN(days)) {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            auditQuery = auditQuery.gte("created_at", startDate.toISOString())
          }
        }

        if (filterQ) {
          auditQuery = auditQuery.or(
            `actor_name.ilike.%${filterQ}%,summary.ilike.%${filterQ}%,table_label.ilike.%${filterQ}%`
          )
        }

        // fetch translation dictionaries
        const [
          { data: auditData, error: auditError },
          { data: appealStatus },
          { data: enrollmentStatus },
          { data: sessionStatus },
        ] = await Promise.all([
          auditQuery,
          supabase.from("appeal_status").select("appeal_status_id, name"),
          supabase
            .from("enrollment_status")
            .select("enrollment_status_id, name"),
          supabase
            .from("attendance_session_status")
            .select("attendance_session_status_id, name"),
        ])

        if (auditError)
          throw new Error(`Failed to fetch audit log: ${auditError.message}`)
        if (!auditData) throw new Error("Failed to fetch audit log")

        // compile the fetched dictionary
        const dynamicUuidMap: Record<string, string> = {}
        appealStatus?.forEach(
          (s) =>
            (dynamicUuidMap[s.appeal_status_id] = s.name.replace(/_/g, " "))
        )
        enrollmentStatus?.forEach(
          (s) => (dynamicUuidMap[s.enrollment_status_id] = s.name)
        )
        sessionStatus?.forEach(
          (s) =>
            (dynamicUuidMap[s.attendance_session_status_id] = s.name.replace(
              /_/g,
              " "
            ))
        )

        headers = ["Date", "Actor", "Action", "Table", "Summary"]

        const mappedLogs = auditData
          .map((row) => mapAuditLogDbRow(row as any, dynamicUuidMap))
          .filter(
            (mapped): mapped is NonNullable<typeof mapped> => mapped !== null
          )

        rows = mappedLogs.map((log) => [
          formatAuditLogTimestamp(log.createdAt),
          log.actorName,
          log.action,
          log.tableLabel,
          log.summary,
        ])
        break
      }

      case "advisers": {
        let advQuery = supabase
          .from("app_user")
          .select(
            `
            full_name,
            email,
            section!section_adviser_user_id_fkey(section_id, course_code, term:term_id(school_year))
          `
          )
          .eq("role_id", adviserRoleId)
          .order("full_name")

        const { data: advData, error: advError } = await advQuery
        if (advError) throw new Error("Failed to fetch advisers")

        headers = ["Adviser Name", "Email", "Class"]

        advData.forEach((adv: any) => {
          const sections = adv.section || []
          // scope of filtered section
          if (sectionId && sectionId !== "all") {
            const handlesSection = sections.some(
              (s: any) => s.section_id === sectionId
            )
            if (!handlesSection) return // skip the adviser if they dont teach the filtered section
          }

          rows.push([
            adv.full_name,
            adv.email,
            sections.length > 0
              ? sections
                  .map((s: any) =>
                    formatClassLabel({
                      courseCode: s.course_code,
                      facilitatorName: adv.full_name,
                      schoolYear: s.term?.school_year,
                    })
                  )
                  .join(", ")
              : "Unassigned",
          ])
        })
        break
      }

      default: {
        let enrollmentQUery = supabase
          .from("enrollment")
          .select(
            `
            enrollment_id,
            app_user(full_name, email, student_number),
            section!inner(course_code, required_hour_total, term:term_id(school_year), app_user(full_name)),
            attendance_session(duration_minute, attendance_session_status(code))
          `
          )
          .eq("enrollment_status_id", activeStatusId)

        if (sectionId && sectionId !== "all") {
          enrollmentQUery = enrollmentQUery.eq("section_id", sectionId)
        }

        const { data: rawEnrollments, error: dbError } = await enrollmentQUery
        if (dbError) throw new Error("Failed to fetch enrollment records")

        headers = [
          "Student Name",
          "Email",
          "Student Number",
          "Section",
          "Adviser",
          "Hours Rendered",
          "Completion %",
        ]

        rawEnrollments.forEach((en: any) => {
          const targetHours = en.section?.required_hour_total || 60
          // Count completed sessions only: 'closed' (normal/manual) + 'corrected' (edited).
          const totalMinutes =
            en.attendance_session?.reduce((sum: number, s: any) => {
              const st = Array.isArray(s.attendance_session_status)
                ? s.attendance_session_status[0]
                : s.attendance_session_status
              return st?.code === "closed" || st?.code === "corrected"
                ? sum + (s.duration_minute || 0)
                : sum
            }, 0) || 0
          const hoursRendered = parseFloat((totalMinutes / 60).toFixed(1))
          const pct = Math.min(
            100,
            Math.round((hoursRendered / targetHours) * 100)
          )

          // filter at-risk
          if (content === "at_risk" && pct >= 45) return

          rows.push([
            en.app_user?.full_name || "Unkown",
            en.app_user?.email || "N/A",
            en.app_user?.student_number || "N/A",
            formatClassLabel({
              courseCode: en.section?.course_code,
              facilitatorName: en.section?.app_user?.full_name,
              schoolYear: en.section?.term?.school_year,
            }),
            en.section?.app_user?.full_name || "Unassigned",
            hoursRendered,
            `${pct}%`,
          ])
        })
        break
      }
    }

    if (rows.length === 0) {
      return new NextResponse("No Data found for the selected filters.", {
        status: 404,
      })
    }

    // formatting of generated files
    const phtDateStr = new Date()
      .toLocaleString("en-US", { timeZone: "Asia/Manila" })
      .replace(/[,:\s\/]/g, "_")
    const filename = `NSTP_${content}_Report_${phtDateStr}.${fileType}`

    // XLSX GENERATION
    if (fileType === "xlsx") {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(`Analytics - ${content}`)

      // SAMPLE STYLING
      const headerRow = worksheet.addRow(headers)
      headerRow.font = {
        name: "Arial",
        size: 11,
        bold: true,
        color: { argb: "FFFFFF" },
      }
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "7B1113" },
        }
        cell.alignment = { vertical: "middle", horizontal: "center" }
      })

      rows.forEach((row) => worksheet.addRow(row))
      worksheet.columns.forEach((col) => (col.width = 28))

      const buffer = await workbook.xlsx.writeBuffer()
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }

    // PDF GENERATION
    if (fileType === "pdf") {
      // Force Landscape orientation for dense reports like audit logs (activity) to provide breathing room
      const isLandscape = headers.length > 5 || content === "activity"
      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      })

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text(`NSTP 2 Analytics Report: ${content.toUpperCase()}`, 14, 15)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const printDate = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
      })
      doc.text(`Generated: ${printDate} (PHT)`, 14, 21)

      autoTable(doc, {
        startY: 26,
        head: [headers],
        body: rows,
        headStyles: { fillColor: [123, 17, 19], fontStyle: "bold" },
        theme: "striped",
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          overflow: "linebreak",
          cellPadding: 4,
          valign: "middle",
        },
        columnStyles:
          content === "activity"
            ? {
                0: { cellWidth: 38 }, // Date column
                1: { cellWidth: 35 }, // Actor column
                2: { cellWidth: 22 }, // Action column
                3: { cellWidth: 25 }, // Table column
                4: { cellWidth: "auto" }, // Summary column takes up all remaining landscape space cleanly
              }
            : {},
      })

      // Standardize binary output stream without string character corruption
      const uint8Array = new Uint8Array(doc.output("arraybuffer"))
      return new NextResponse(uint8Array, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
    // CSV GENERATION (default)
    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export Error:", error)
    return new NextResponse((error as Error).message, { status: 500 })
  }
}
