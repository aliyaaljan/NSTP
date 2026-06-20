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
    //recentActivityRes,
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

  // for storing metrics
  const rawEnrollments = sectionsProgressRes.data || []

  const sectionMap: Record<
    string,
    {
      name: string
      totalHoursCompleted: number
      totalHoursRequired: number
      studentCount: number
    }
  > = {}

  // counters for each donut/pie chart group or category
  let onTrackCount = 0
  let inProgressCount = 0
  let atRiskCount = 0

  // loop through rawEnrollments

  rawEnrollments.forEach((en: any) => {
    const sectId = en.section?.section_id
    if (!sectId) return
    // calculate hours and progress percentages
    const target = en.section?.required_hour_total || 60
    const minutesSum =
      en.attendance_session?.reduce(
        (sum: number, s: any) => sum + (s.duration_minute || 0),
        0
      ) || 0
    const hoursCompleted = minutesSum / 60
    const progressPercent = (hoursCompleted / target) * 100

    // classify studnet groups for donut/pie chart legend
    if (progressPercent >= 60) onTrackCount++
    else if (progressPercent >= 45) inProgressCount++
    else atRiskCount++

    // tracking data for section progress bars
    if (!sectionMap[sectId]) {
      sectionMap[sectId] = {
        name: en.section.name,
        totalHoursCompleted: 0,
        totalHoursRequired: 0,
        studentCount: 0,
      }
    }
    sectionMap[sectId].totalHoursCompleted += hoursCompleted
    sectionMap[sectId].totalHoursRequired += target
    sectionMap[sectId].studentCount++
  })

  // hours completion by section list
  const sectionCompletionList = Object.values(sectionMap)
    .map((sect: any) => ({
      name: sect.name,
      progress:
        sect.studentCount > 0
          ? Math.min(
              100,
              Math.round(
                (sect.totalHoursCompleted / sect.totalHoursRequired) * 100
              )
            )
          : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // cohort percentages for completion status on donut / pie
  const totalCohort = rawEnrollments.length || 1
  const donutLegend = {
    onTrack: Math.round((onTrackCount / totalCohort) * 100),
    inProgress: Math.round((inProgressCount / totalCohort) * 100),
    atRisk: Math.round((atRiskCount / totalCohort) * 100),
  }

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

  // calculate adviser workload list
  const rawAdvisers = adviserWorkloadRes.data || []
  const adviserWorkloadList = rawAdvisers
    .map((adv: any) => {
      const totalStudentsManaged =
        adv.section?.reduce((sum: number, sect: any) => {
          return sum + (sect.enrollment?.length || 0)
        }, 0) || 0
      const mainSectionName = adv.section?.[0]?.name || "Unassigned"

      return {
        name: adv.full_name,
        section: mainSectionName,
        studentCount: totalStudentsManaged,
      }
    })
    .sort((a, b) => b.studentCount - a.studentCount)

  // dashboard data objects
  const metricsData = [
    {
      label: "Total Students",
      value: studentsRes.count || 0,
      icon: "ti-user",
      color: "#2D6A4F",
    },
    {
      label: "Total Facilitators/Advisers",
      value: advisersRes.count || 0,
      icon: "ti-users",
      color: "#7B1113",
      subtext: `avg ${(activeStudentsCount / (advisersRes.count || 1)).toFixed(
        0
      )} students each`,
    },
    {
      label: "Average Hours Rendered",
      value: `${averageHoursRendered} hrs`,
      icon: "ti-clock",
      color: "#5C0B18",
    },
    {
      label: "Average attendance rate",
      value: `${attendanceRateThisWeek}%`,
      icon: "ti-calendar",
      color: "#B5451B",
      subtext: `this current week`,
    },
    {
      label: "At-risk Students",
      value: atRiskStudentsList.length,
      icon: "ti-alert-triangle",
      color: "#7B1113",
      subtext: `${donutLegend.atRisk}% of total active students`,
    },
    {
      label: "Submitted Files",
      value: filesRes.count || 0,
      icon: "ti-file-description",
      color: "2C2C2A",
      subtext: `throughout the semester`,
    },
    {
      label: "Pending Approvals",
      value: appealsRes.count || 0,
      icon: "ti-alert-circle",
      color: "#7B1113",
      subtext: `pending approvals`,
    },
  ]

  return (
    <div
      style={{
        backgroundColor: "#F7F6F3",
        minHeight: "100vh",
        padding: "12px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Cormorant', Georgia, serif",
              fontSize: "32px",
              fontWeight: 700,
              color: "#2C2C2A",
              marginBottom: "4px",
            }}
          >
            Dashboard
          </h1>
          <p style={{ color: "#888", fontSize: "15px" }}>
            Academic Year 2025-2026 | 2nd Semester
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {metricsData.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              border: "1px solid #EDE8E0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <i
                className={`ti ${card.icon}`}
                style={{ fontSize: "18px", color: card.color, opacity: 0.8 }}
              />
              <div style={{ fontSize: "13px", color: "#888", fontWeight: 500 }}>
                {card.label}
              </div>
            </div>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                color: "#2C2C2A",
                margin: "4px 0",
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: "12px", color: "#AAA" }}>
              {card.subtext}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid #EDE8E0",
          }}
        >
          <h3
            style={{
              fontFamily: "'Cormorant', Georgia, serif",
              fontSize: "18px",
              fontWeight: 600,
              color: "#2C2C2A",
              marginBottom: "20px",
            }}
          >
            Hours completion by section
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {sectionCompletionList.map((sect) => (
              <div
                key={sect.name}
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <div
                  style={{
                    width: "80px",
                    fontWeight: 600,
                    color: "#555",
                    fontSize: "14px",
                  }}
                >
                  Section {sect.name}
                </div>
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#F0EFEA",
                    borderRadius: "99px",
                    height: "10px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${sect.progress}%`,
                      backgroundColor:
                        sect.progress > 60
                          ? "#2D6A4F"
                          : sect.progress > 40
                          ? "#B5451B"
                          : "#7B1113",
                      height: "100%",
                      borderRadius: "99px",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "40px",
                    textAlign: "right",
                    fontSize: "13px",
                    color: "#666",
                    fontWeight: 600,
                  }}
                >
                  {sect.progress}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid #EDE8E0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontFamily: "'Cormorant', Georgia, serif",
              fontSize: "18px",
              fontWeight: 600,
              color: "#2C2C2A",
              marginBottom: "20px",
            }}
          >
            Completion Status
          </h3>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: `conic-gradient(#2D6A4F 0% ${
                  donutLegend.onTrack
                }%, #B5451B ${donutLegend.onTrack}% ${
                  donutLegend.onTrack + donutLegend.inProgress
                }%, #7B1113 ${
                  donutLegend.onTrack + donutLegend.inProgress
                }% 100%)`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  backgroundColor: "#fff",
                  borderRadius: "50%",
                }}
              />
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#2D6A4F",
                    }}
                  />
                  <span style={{ color: "#666" }}>On track</span>
                </div>
                <span style={{ fontWeight: 700, color: "#2C2C2A" }}>
                  {donutLegend.onTrack}%
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#B5451B",
                    }}
                  />
                  <span style={{ color: "#666" }}>In progress</span>
                </div>
                <span style={{ fontWeight: 700, color: "#2C2C2A" }}>
                  {donutLegend.inProgress}%
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#7B1113",
                    }}
                  />
                  <span style={{ color: "#666" }}>At risk</span>
                </div>
                <span style={{ fontWeight: 700, color: "#2C2C2A" }}>
                  {donutLegend.atRisk}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid #EDE8E0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h3
              style={{
                fontFamily: "'Cormorant', Georgia, serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#2C2C2A",
              }}
            >
              At risk students
            </h3>
            <span
              style={{
                fontSize: "12px",
                color: "#888",
                backgroundColor: "#F5F5F5",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Below 45% Hours
            </span>
          </div>

          <div
            style={{
              maxHeight: "320px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {atRiskStudentsList.length === 0 ? (
              <p
                style={{
                  color: "#888",
                  fontSize: "14px",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                🎉 No active students fall below the metrics threshold.
              </p>
            ) : (
              atRiskStudentsList.map((st: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    border: "1px solid #F0EFEA",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#2C2C2A",
                      }}
                    >
                      {st.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#888" }}>
                      Section {st.section} | {st.studentNumber}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "#FCE8E6",
                      color: "#A8241A",
                      fontWeight: 700,
                      fontSize: "13px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {st.progress}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid #EDE8E0",
          }}
        >
          <h3
            style={{
              fontFamily: "'Cormorant', Georgia, serif",
              fontSize: "18px",
              fontWeight: 600,
              color: "#2C2C2A",
              marginBottom: "20px",
            }}
          >
            Adviser Workload
          </h3>

          <div
            style={{
              maxHeight: "320px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {adviserWorkloadList.map((adv: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px",
                  border: "1px solid #F0EFEA",
                  borderRadius: "10px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "#2C2C2A",
                    }}
                  >
                    {adv.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    Primary Section: {adv.section}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "#E8F5E9",
                    color: "#2D6A4F",
                    fontWeight: 600,
                    fontSize: "13px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                  }}
                >
                  {adv.studentCount} students
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
