import { createSupabaseServiceClient } from "@/lib/supabase/service-client"
import { sendPushToUser } from "@/lib/push/sendPush"

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

  await sendPushToUser(adviserId, {
    title: "New request submitted",
    body: `${studentName} requested for ${typeName}`,
    url: `/facilitator/my-students?tab=pending`,
  })
}

export async function notifyStudentOnResolutionPush(
  appealId: string,
  decision: ResolutionDecision
) {
  const service = createSupabaseServiceClient()

  const { data, error } = await service
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

  if (error || !data) {
    console.error("notifyStudentOnResolutionPush: lookup failed", error)
    return
  }

  const typeName = (data as any).appeal_type?.name ?? "request"

  const messages: Record<ResolutionDecision, { title: string; body: string }> = {
    approved: {
      title: "Request approved",
      body: `Your request ${typeName}: ${data.title} was approved.`,
    },
    rejected: {
      title: "Request rejected",
      body: `Your request ${typeName}: ${data.title} was rejected.${
        data.resolution_note ? ` Reason: ${data.resolution_note}` : ""
      }`,
    },
    under_review: {
      title: "Request under review",
      body: `Your request ${typeName}: ${data.title} is now being reviewed by your facilitator.`,
    },
  }

  const { title, body } = messages[decision]

  await sendPushToUser(data.requester_user_id, {
    title,
    body,
    url: `/student/request`,
  })
}