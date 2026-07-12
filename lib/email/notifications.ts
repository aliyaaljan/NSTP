import nodemailer from "nodemailer"
import { createSupabaseServiceClient } from "@/lib/supabase/service-client"

// SMTP congiguration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
})

const senderString = `"NSTP System" <${process.env.EMAIL_USER}>`

/**
 * email fetcher with error logging
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const service = createSupabaseServiceClient()
    const { data, error } = await service.auth.admin.getUserById(userId)

    if (error) {
      console.error(
        `[Email Service] Failed to fetch auth for ${userId}. Missing Service Role Key?`,
        error.message
      )
      return null
    }
    if (!data.user?.email) {
      console.error(`[Email Service] User ${userId} has no email on file.`)
      return null
    }
    return data.user.email
  } catch (err: any) {
    console.error(`[Email Service] Exception fetching email:`, err.message)
    return null
  }
}

/**
 *
 */
function isDeliverable(email: string): boolean {
  const normalized = email.toLowerCase()

  if (normalized.includes("dummy") || normalized.includes("test")) {
    console.log(
      `[Email Service] Skipped sending to known dummy account: ${email}`
    )
    return false
  }
  return true
}

/**
 * 4. Centralized mail sender
 */
async function sendMailSafe(to: string, subject: string, html: string) {
  if (!isDeliverable(to)) return

  try {
    const info = await transporter.sendMail({
      from: senderString,
      to,
      subject,
      html,
    })
    console.log(
      `[Email Service] Sent "${subject}" to ${to} (MessageID: ${info.messageId})`
    )
  } catch (error: any) {
    console.error(
      `[Email Service] Nodemailer failed to send to ${to}:`,
      error.message
    )
  }
}

// ---------------------------------------------------------------------------
// Notification Triggers
// ---------------------------------------------------------------------------

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

  await sendMailSafe(
    adviserEmail,
    `New Attendance Appeal from ${studentName}`,
    `
      <h3>New Attendance Request</h3>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Request:</strong> ${appeal.title}</p>
      <p>Please log in to the NSTP portal to review and resolve this request.</p>
    `
  )
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

  await sendMailSafe(
    studentEmail,
    `Update on your request: ${appeal.title}`,
    `
      <h3>Request Status Updated</h3>
      <p>Your request titled "<strong>${
        appeal.title
      }</strong>" has been <strong>${status.toUpperCase()}</strong> by your facilitator.</p>
      <p>Please check your NSTP dashboard for any additional notes.</p>
    `
  )
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

  await sendMailSafe(
    adviserEmail,
    `New Document Submission: ${formTitle}`,
    `
      <h3>New Form Submission</h3>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Document:</strong> ${formTitle}</p>
      <p>Log in to your facilitator dashboard to review this submission.</p>
    `
  )
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

  await sendMailSafe(
    studentEmail,
    `Document Review: ${formTitle}`,
    `
      <h3>Document Reviewed</h3>
      <p>Your submission for "<strong>${formTitle}</strong>" has been marked as <strong>${status.toUpperCase()}</strong>.</p>
      <p>Please check your student dashboard for any comments from your facilitator.</p>
    `
  )
}
