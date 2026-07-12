import nodemailer from "nodemailer"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

// Configure the SMTP transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

// Standardized sender name
const senderString = `"NSTP System" <${process.env.EMAIL_USER}>`

/**
 * Helper to securely fetch a user's email from Supabase Auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const service = createSupabaseServiceClient()
  const { data, error } = await service.auth.admin.getUserById(userId)
  if (error || !data.user) return null
  return data.user.email ?? null
}

export async function notifyAdviserOnAppeal(appealId: string) {
  const service = createSupabaseServiceClient()

  const { data: appeal } = await service
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

  if (!appeal) return

  const studentName = (appeal.enrollment as any).app_user.full_name
  const adviserId = (appeal.enrollment as any).section.adviser_user_id
  const adviserEmail = await getUserEmail(adviserId)

  if (!adviserEmail) return

  await transporter.sendMail({
    from: senderString,
    to: adviserEmail,
    subject: `New Attendance Appeal from ${studentName}`,
    html: `
      <h3>New Attendance Request</h3>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Request:</strong> ${appeal.title}</p>
      <p>Please log in to the NSTP portal to review and resolve this request.</p>
    `,
  })
}

export async function notifyStudentOnAppealResolved(
  appealId: string,
  status: string
) {
  const service = createSupabaseServiceClient()

  const { data: appeal } = await service
    .from("appeal")
    .select("title, requester_user_id")
    .eq("appeal_id", appealId)
    .single()

  if (!appeal) return

  const studentEmail = await getUserEmail(appeal.requester_user_id)
  if (!studentEmail) return

  await transporter.sendMail({
    from: senderString,
    to: studentEmail,
    subject: `Update on your request: ${appeal.title}`,
    html: `
      <h3>Request Status Updated</h3>
      <p>Your request titled "<strong>${
        appeal.title
      }</strong>" has been <strong>${status.toUpperCase()}</strong> by your facilitator.</p>
      <p>Please check your NSTP dashboard for any additional notes.</p>
    `,
  })
}

export async function notifyAdviserOnSubmission(submissionId: string) {
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
  const adviserEmail = await getUserEmail(adviserId)

  if (!adviserEmail) return

  await transporter.sendMail({
    from: senderString,
    to: adviserEmail,
    subject: `New Document Submission: ${formTitle}`,
    html: `
      <h3>New Form Submission</h3>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Document:</strong> ${formTitle}</p>
      <p>Log in to your facilitator dashboard to review this submission.</p>
    `,
  })
}

export async function notifyStudentOnSubmissionReviewed(
  submissionId: string,
  status: string
) {
  const service = createSupabaseServiceClient()

  const { data: sub } = await service
    .from("form_submission")
    .select(
      `
      form_requirement!inner (title),
      enrollment!inner (student_user_id)
    `
    )
    .eq("form_submission_id", submissionId)
    .single()

  if (!sub) return

  const formTitle = (sub.form_requirement as any).title
  const studentId = (sub.enrollment as any).student_user_id
  const studentEmail = await getUserEmail(studentId)

  if (!studentEmail) return

  await transporter.sendMail({
    from: senderString,
    to: studentEmail,
    subject: `Document Review: ${formTitle}`,
    html: `
      <h3>Document Reviewed</h3>
      <p>Your submission for "<strong>${formTitle}</strong>" has been marked as <strong>${status.toUpperCase()}</strong>.</p>
      <p>Please check your student dashboard for any comments from your facilitator.</p>
    `,
  })
}
