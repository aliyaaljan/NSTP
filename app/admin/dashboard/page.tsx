import { createClient } from "@/lib/client"

// reset data fetch for every reset
export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createClient()

  const today = new Date()
  const dayOfWeek = today.getDay()
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayThisWeek = new Date(
    today.setDate(today.getDate() + distanceToMonday)
  )
  mondayThisWeek.setHours(0, 0, 0, 0)
  const mondayISO = mondayThisWeek.toISOString()

  // multiple queries get all database metrics concurrently for faster fetch

  const [
    studentsRes,
    advisersRes,
    sessionRes,
    filesRes,
    appealsRes,
    attendanceRateRes,
    atRiskRes,
  ] = await Promise.all([
    // total students
    // selecting number only for faster load
    supabase
      .from("app_user")
      .select("app_user_id", { count: "exact", head: true })
      .eq(
        "role_id",
        (
          await supabase
            .from("role")
            .select("role_id")
            .eq("code", "student")
            .maybeSingle()
        ).data?.role_id
      ),
    // total advisers
    supabase
      .from("app_user")
      .select("app_user_id", { count: "exact", head: true })
      .eq(
        "role_id",
        (
          await supabase
            .from("role")
            .select("role_id")
            .eq("code", "adviser")
            .maybeSingle()
        ).data?.role_id
      ),

    //average hours rendered
    supabase
      .from("attendance_session")
      .select(
        `
        duration_minute,
        enrollment!inner(enrollment_status_id)
        `
      )
      .eq(
        "enrollment.enrollment_status_id",
        (
          await supabase
            .from("enrollment_status")
            .select("enrollment_status_id")
            .eq("code", "active")
            .maybeSingle()
        ).data?.enrollment_status_id
      ),

    // total files during semester
    supabase
      .from("form")
      .select("form_id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("section_id", "is", null),

    // total pending requests/appeals
    supabase
      .from("appeal")
      .select("appeal_id", { count: "exact", head: true })
      .in("appeal_status_id", [
        (
          await supabase
            .from("appeal_status")
            .select("appeal_status_id")
            .eq("code", "open")
            .maybeSingle()
        ).data?.appeal_status_id,
        (
          await supabase
            .from("appeal_status")
            .select("appeal_status_id")
            .eq("code", "under_review")
            .maybeSingle()
        ).data?.appeal_status_id,
      ]),
    // weekly logs
    Promise.all([
      supabase
        .from("enrollment")
        .select("student_user_id", { count: "exact", head: true })
        .eq(
          "enrollment_status_id",
          (
            await supabase
              .from("enrollment_status")
              .select("enrollment_status_id")
              .eq("code", "active")
              .maybeSingle()
          ).data?.enrollment_status_id
        ),

      supabase
        .from("attendance_event")
        .select("enrollment_id")
        .eq(
          "attendance_event_type_id",
          (
            await supabase
              .from("attendance_event_type")
              .select("attendance_event_type_id")
              .eq("code", "time_in")
              .maybeSingle()
          ).data?.attendance_event_type_id
        )
        .gte("effective_at", mondayISO),
    ]),

    // fetching data for at-risk students (less than 45% of hours)
    supabase
      .from("enrollment")
      .select(
        `
      student_user_id,
      app_user(full_name, student_number),
      section(name, required_hour_total),
      attendance_session(duration_minute)
      `
      )
      .eq(
        "enrollment-status_id",
        (
          await supabase
            .from("enrollment_status")
            .select("enrollment_status_id")
            .eq("code", "active")
            .maybeSingle()
        ).data?.enrollment_status_id
      ),
  ])

  const metricsData = [
    {
      label: "Total Students",
      value: studentsRes.count || 0,
      icon: "ti-user",
      color: "#2D6A4F",
    },
    {
      label: "Facilitators",
      value: advisersRes.count || 0,
      icon: "ti-users",
      color: "#7B1113",
    },
  ]
}
