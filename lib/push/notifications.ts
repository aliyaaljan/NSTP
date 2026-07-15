import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { sendPushToUser } from "@/lib/push/sendPush"
import { checkNotificationPreference } from "../settings/NotificationPreferences"

export type ResolutionDecision = "approved" | "rejected" | "under_review"

export async function notifyAdviserOnAppealPush(appealId: string) {
  const service = createSupabaseServiceClient()

  const { data, error } = await service
    .from("appeal")
    .select(
      `
        appeal_id,
        title,
        appeal_type:appeal_type_id ( name ),
        enrollment:enrollment_id (
          section:section_id ( adviser_user_id ),
          student:student_user_id ( full_name )
        )
      `
    )
    .eq("appeal_id", appealId)
    .single()

  if (error || !data) {
    console.error("notifyAdviserOnAppealPush: lookup failed", error)
    return
  }

  const adviserId = (data as any).enrollment?.section?.adviser_user_id
  const studentName = (data as any).enrollment?.student?.full_name ?? "A student"
  const typeName = (data as any).appeal_type?.name ?? "request"

  if (!adviserId) return

  const pushEnabled = await checkNotificationPreference(adviserId, "push")
  if (!pushEnabled) return

  await sendPushToUser(adviserId, {
    title: "New Request Submitted",
    body: `${studentName} requested for ${typeName}`,
    url: `/facilitator/my-students?tab=pending`,
  })
}

export async function notifyStudentOnResolutionPush(
  appealId: string,
  decision: ResolutionDecision
) {
  const service = createSupabaseServiceClient()

  const { data: appeal, error } = await service
    .from("appeal")
    .select(
      `
        appeal_id,
        title,
        requester_user_id,
        resolution_note,
        appeal_type:appeal_type_id ( name )
      `
    )
    .eq("appeal_id", appealId)
    .single()

  if (error || !appeal) {
    console.error("notifyStudentOnResolutionPush: lookup failed", error)
    return
  }

  const pushEnabled = await checkNotificationPreference(appeal.requester_user_id, "push")
  if (!pushEnabled) return

  const typeName = (appeal as any).appeal_type?.name ?? "request"

  const messages: Record<ResolutionDecision, { title: string; body: string }> = {
    approved: {
      title: "Request Approved",
      body: `Your request for ${typeName}: ${appeal.title} was approved.${
        appeal.resolution_note ? ` Reason: ${appeal.resolution_note}` : ""
      }`,
    },
    rejected: {
      title: "Request Rejected",
      body: `Your request for ${typeName}: ${appeal.title} was rejected.${
        appeal.resolution_note ? ` Reason: ${appeal.resolution_note}` : ""
      }`,
    },
    under_review: {
      title: "Request Under Review",
      body: `Your request for ${typeName}: ${appeal.title} is now being reviewed by your facilitator.`,
    },
  }

  const { title, body } = messages[decision]

  await sendPushToUser(appeal.requester_user_id, {
    title,
    body,
    url: `/student/request`,
  })
}

export async function notifyAdviserOnAppealCanceledPush(appealId: string) {
  const service = createSupabaseServiceClient()

  const { data: appeal, error } = await service
      .from("appeal")
      .select(
        `
        title,
        enrollment!inner (
          app_user!inner (full_name),
          section!inner (adviser_user_id)
        )
        `
      )
      .eq("appeal_id", appealId)
      .single()

  if (error || !appeal) return
  const studentName = (appeal.enrollment as any).app_user.full_name
  const adviserId = (appeal.enrollment as any).section.adviser_user_id
  if (!adviserId) return

  const pushEnabled = await checkNotificationPreference(adviserId, "push")
  if (!pushEnabled) return

  await sendPushToUser(adviserId, {
    title: `Request has been Withdrawn`,
    body: `${studentName} canceled their Request ${appeal.title}`,
    url: `/facilitator/my-students?tab=pending`,
  })

}

export async function notifyAdviserOnSubmissionPush(submissionId: string) {
  const service = createSupabaseServiceClient()

  const { data: sub } = await service
    .from("form_submission")
    .select(
      `
      form_requirement!inner (title),
      enrollment!inner (
        app_user!inner (full_name),
        section!inner (adviser_user_id)
      )
    `
    )
    .eq("form_submission_id", submissionId)
    .single()

  if (!sub) return

  const formTitle = (sub.form_requirement as any).title
  const studentName = (sub.enrollment as any).app_user.full_name
  const adviserId = (sub.enrollment as any).section.adviser_user_id

  if (!adviserId) return

  const pushEnabled = await checkNotificationPreference(adviserId, "push")
  if (!pushEnabled) return

  await sendPushToUser(adviserId, {
    title: `New Form Submission`,
    body: `${studentName} submitted ${formTitle}`,
    url: `/facilitator/forms`,
  })
}

export async function notifyStudentOnSubmissionReviewedPush(submissionId: string, status: string) {
  const service = createSupabaseServiceClient()
  
  const { data: sub } = await service
    .from("form_submission")
    .select(  `
      form_requirement!inner (title),
      enrollment!inner (student_user_id)
    `)
    .eq("form_submission_id", submissionId)
    .single()
  
    if (!sub) return
  
    const formTitle = (sub.form_requirement as any).title
    const studentId = (sub.enrollment as any).student_user_id
  
  const pushEnabled = await checkNotificationPreference(studentId, "push")
  if (!pushEnabled) return

  await sendPushToUser(studentId, {
    title: `Form Reviewed`,
    body: `Your submission for ${formTitle} has been marked as ${status}`,
    url: `/student/forms`,
  })
}

export async function notifyStudentOnNewFormPush(requirementId: string) {
  const service = createSupabaseServiceClient()

  const { data: requirement, error } = await service
    .from("form_requirement")
    .select("form_requirement_id, title, section_id")
    .eq("form_requirement_id", requirementId)
    .single()

  if (error || !requirement) {
    console.error("notifyStudentOnNewFormPush: lookup failed", error)
    return
  }

  let studentQuery = service.from("enrollment").select("student_user_id, section_id")

  if (requirement.section_id) {
    studentQuery = studentQuery.eq("section_id", requirement.section_id)
  }

  const { data: enrollments, error: enrollError } = await studentQuery

  if (enrollError || !enrollments?.length) {
    console.error("notifyStudentOnNewFormPush: enrollments failed", enrollError)
    return
  }

  let targetEnrollments = enrollments

  if (!requirement.section_id) {
    const { data: exclusions } = await service
      .from("form_requirement_exclusion")
      .select("section_id")
      .eq("form_requirement_id", requirementId)

    const excludedSectionIds = new Set(
      (exclusions ?? []).map((e: { section_id: string }) => e.section_id)
    )

    targetEnrollments = enrollments.filter(
      (e: { section_id: string }) => !excludedSectionIds.has(e.section_id)
    )
  }

  const studentIds = [
    ...new Set(targetEnrollments.map((e: { student_user_id: string }) => e.student_user_id)),
  ]

  await Promise.allSettled(
    studentIds.map(async (studentId) => {
      const pushEnabled = await checkNotificationPreference(studentId, "push")
      if (!pushEnabled) return

      await sendPushToUser(studentId, {
        title: "New Form Requirement",
        body: `A new form "${requirement.title}" has been added`,
        url: `/student/forms`,
      })
    })
  )
}