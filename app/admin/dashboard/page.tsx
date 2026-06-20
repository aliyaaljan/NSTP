import { createSupabaseServerClient } from "@/lib/supabase/server-client"

// reset data fetch for every reset
export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient()

  const today = new Date()
  const dayOfWeek = today.getDay()
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const mondayThisWeek = new Date(
    today.setDate(today.getDate() + distanceToMonday)
  )
  mondayThisWeek.setHours(0, 0, 0, 0)
  const mondayISO = mondayThisWeek.toISOString()

  // fetch all staus and role IDs first
  const [
    roleStudentRes,
    roleAdviserRes,
    statusActiveRes,
    statusOpenRes,
    statusReviewRes,
    typeTimeInRes,
  ] = await Promise.all([
    supabase.from("role").select("role_id").eq("code", "student").maybeSingle(),
    supabase.from("role").select("role_id").eq("code", "adviser").maybeSingle(),
    supabase
      .from("enrollment_status")
      .select("enrollment_status_id")
      .eq("code", "active")
      .maybeSingle(),
    supabase
      .from("appeal_status")
      .select("appeal_status_id")
      .eq("code", "open")
      .maybeSingle(),
    supabase
      .from("appeal_status")
      .select("appeal_status_id")
      .eq("code", "under_review")
      .maybeSingle(),
    supabase
      .from("attendance_event_type")
      .select("attendance_event_type_id")
      .eq("code", "time_in")
      .maybeSingle(),
  ])

  // reusable variables
  const studentRoleId = roleStudentRes.data?.role_id
  const adviserRoleId = roleAdviserRes.data?.role_id
  const activeStatusId = statusActiveRes.data?.enrollment_status_id
  const openStatusId = statusOpenRes.data?.appeal_status_id
  const underReviewStatusId = statusReviewRes.data?.appeal_status_id
  const timeInTypeId = typeTimeInRes.data?.attendance_event_type_id

  const [
    studentsRes,
    advisersRes,
    sessionsRes,
    filesRes,
    appealsRes,
    attendanceRateRes,
    atRiskRes,
    sectionsProgressRes,
    adviserWorkloadRes,
    recentActivityRes,
  ] = await Promise.all([
    // fetching total students count
    supabase
      .from("app_user")
      .select("app_user_id", { count: "exact", head: true })
      .eq("role_id", studentRoleId),

    // fetching total advisers / facilitators count
    supabase
      .from("app_user")
      .select("app_user_id", { count: "exact", head: true })
      .eq("role_id", adviserRoleId),

    // fetching data for average hours rendered
    supabase
      .from("attendance_session")
      .select(
        `
        duration_minute,
        enrollment!inner(enrollment_status_id)
        `
      )
      .eq("enrollment!inner.enrollment_status_id", activeStatusId),

    // fetching total number of files during semester

    supabase
      .from("form")
      .select("form_id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("section_id", "is", null),

    // fetching total pending requests / appeals
    supabase
      .from("appeal")
      .select("appeal_id", { count: "exact", head: true })
      .in("appeal_status_id", [openStatusId, underReviewStatusId]),

    // fetching array for weekly logs
    Promise.all([
      supabase
        .from("enrollment")
        .select("student_user_id", { count: "exact", head: true })
        .eq("enrollment_status_id", activeStatusId),

      supabase
        .from("attendance_event")
        .select("enrollment_id")
        .eq("attendance_event_type_id", timeInTypeId)
        .gte("effective_at", mondayISO),
    ]),

    // fetching data for at-risk students
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
      .eq("enrollment_status_id", activeStatusId),

    // fetching hours completion by section
    supabase
      .from("enrollment")
      .select(
        `
        enrollment_id,
        section(section_id, name, required_hour_total),
        attendance_session(duration_minute)
  `
      )
      .eq("enrollment_status_id", activeStatusId),

    // fetching data for adviser workload
    supabase
      .from("app_user")
      .select(
        `
        app_user_id,
        full_name,
        role!inner(code),
        section!section_adviser_user_id_fkey(
          section_id,
          name,
          enrollment(enrollment_id)
        )
        `
      )
      .eq("role.code", "adviser"),

    /* fetching recent activity log TBD 
    supabase
      .from("audit_log")
      .select(
        `
      audit_log_id,
      activity_type,
      description,
      created_at,
      executor:app_user!executor_id(full_name)
    `
      )
      .order("created_at", { ascending: false })
      .limit(5),
      */
  ])

  // server-side calculations

  // calculate average hours rendered per active student
  const logs = sessionsRes.data || []
  const activeStudentsCount = studentsRes.count || 1
  const sumMinutes = logs.reduce(
    (total, item) => total + (item.duration_minute || 0),
    0
  )
  const averageHoursRendered = (sumMinutes / 60 / activeStudentsCount).toFixed(
    1
  )

  // calculate attendance rate in current week
  const totalActiveEnrollments = attendanceRateRes[0].count || 0
  const uniqueScansThisWeek = new Set(
    attendanceRateRes[1].data?.map((e: any) => e.enrollment_id)
  ).size
  const attendanceRateThisWeek =
    totalActiveEnrollments > 0
      ? ((uniqueScansThisWeek / totalActiveEnrollments) * 100).toFixed(1)
      : "0.0"

  // calculating at risk students
  const enrollmentsData = atRiskRes.data || []
  const atRiskStudentsList = enrollmentsData
    .map((enrollment: any) => {
      const name = enrollment.app_user?.full_name || "Unkwown identity"
      const studentNum = enrollment.app_user?.student_number || "N/A"
      const sectionName = enrollment.section?.name || "Unassigned"
      const targetHoursGoal = enrollment.section?.required_hour_total || 60

      const studentMinutesSum =
        enrollment.attendance_session?.reduce(
          (sum: number, s: any) => sum + (s.duration_minute || 0),
          0
        ) || 0

      const hoursCompleted = studentMinutesSum / 60
      const progressPercentage = (hoursCompleted / targetHoursGoal) * 100

      return {
        name,
        studentNumber: studentNum,
        section: sectionName,
        hoursCompleted: hoursCompleted.toFixed(1),
        targetHours: targetHoursGoal,
        progress: progressPercentage.toFixed(1),
      }
    })
    .filter((st: any) => parseFloat(st.progress) < 45.0)

  // dashboard data objects
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
    {
      label: "Avg. Hours Rendered",
      value: `${averageHoursRendered} hrs`,
      icon: "ti-clock",
      color: "#5C0B18",
    },
    {
      label: "Weekly Attendance",
      value: `${attendanceRateThisWeek}%`,
      icon: "ti-calendar",
      color: "#B5451B",
    },
    {
      label: "Submitted Files",
      value: filesRes.count || 0,
      icon: "ti-file-description",
      color: "2C2C2A",
    },
    {
      label: "Pending Approvals",
      value: appealsRes.count || 0,
      icon: "ti-alert-circle",
      color: "#7B1113",
    },
  ]

  return (
    <div>
      <h1
        style={{
          fontFamily: "'Cormorant', Georgia, serif",
          fontSize: "28px",
          fontWeight: 700,
          color: "#2C2C2A",
          marginBottom: "8px",
        }}
      >
        Admin Dashboard
      </h1>

      <p style={{ color: "#888", marginBottom: "32px", fontSize: "15px" }}>
        System overview — manage users, review reports, and configure settings.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {metricsData.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <i
              className={`ti ${card.icon}`}
              style={{ fontSize: "24px", color: card.color }}
            />
            <div
              style={{ fontSize: "28px", fontWeight: 700, color: "#2C2C2A" }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: "13px", color: "#888" }}>{card.label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            fontFamily: "'Cormorant', Georgia, serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "#2C2C2A",
            marginBottom: "16px",
          }}
        >
          At-Risk Students (Below 45% Attendance & Hours Progress)
        </h2>
        {atRiskStudentsList.length === 0 ? (
          <p style={{ color: "#888", fontSize: "15px" }}></p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "15px",
              }}
            >
              <thead>
                <tr
                  style={{ borderBottom: "2px solid #EDE8E0", color: "#888" }}
                >
                  <th style={{ padding: "12px 8px" }}>Name</th>
                  <th style={{ padding: "12px 8px" }}>Student Number</th>
                  <th style={{ padding: "12px 8px" }}>Section</th>
                  <th style={{ padding: "12px 8px" }}>Hours Completed</th>
                  <th style={{ padding: "12px 8px" }}>Target</th>
                  <th style={{ padding: "12px 8px" }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudentsList.map((st: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #EDE8E0" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>
                      {st.name}
                    </td>
                    <td style={{ padding: "12px 8px" }}>{st.studentNumber}</td>
                    <td style={{ padding: "12px 8px" }}>{st.section}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {st.hoursCompleted} hrs
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {st.targetHours} hrs
                    </td>
                    <td
                      style={{
                        padding: "12px 8px",
                        color: "#7B1113",
                        fontWeight: 700,
                      }}
                    >
                      {st.progress}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
