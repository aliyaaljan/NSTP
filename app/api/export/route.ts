// FOR EXPORTING ANALYTICS
import { NextResponse } from "next/server"
import { getAppUserRole } from "@/lib/auth-actions"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { lookupId } from "@/lib/lookups"
import ExcelJS from "exceljs"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

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

    const filename = `NSTP_${content}_Report_${Date.now()}.${fileType}`

    // FOR EXCEL (.xlsx) generation
    if (fileType === "xlsx") {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("NSTP 2 Analytics Summary")

      // sample style for header of xlsx
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
      })

      // data rows
      rows.forEach((row) => worksheet.addRow(row))
      worksheet.columns.forEach((col) => (col.width = 22)) // fallback sizing

      const buffer = await workbook.xlsx.writeBuffer()
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
    // FOR PDF (.pdf) generation
    if (fileType === "pdf") {
      const doc = new jsPDF(headers.length > 5 ? "landscape" : "portrait")
      doc.text(`NSTP 2 Analytics Report: ${content.toUpperCase()}`, 14, 15)
      doc.setFontSize(10)

      // lock to PH Time
      const phtDate = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
      })
      doc.text(`Generated: ${phtDate} (PHT)`, 14, 22)

      autoTable(doc, {
        startY: 28,
        head: [headers],
        body: rows,
        headStyles: { fillColor: [123, 17, 19] },
        theme: "striped",
      })

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      })
    }
    // FOR CSV (.csv) generation -- DEFAULT FALLBACK
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell: any) => `"${cell}"`).join(",")),
    ].join("\n")
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}`,
      },
    })
  } catch (error) {
    return new NextResponse((error as Error).message, { status: 500 })
  }
}
