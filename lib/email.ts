import { Resend } from "resend"
import { db } from "./db"
import { format } from "date-fns"
import { Role } from "@/types/enums"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "LIU Leave System <onboarding@resend.dev>"

function getBaseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

function datesText(dates: Date[]): string {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
  const n = sorted.length
  if (n === 0) return "—"
  if (n === 1) return format(sorted[0], "MMMM d, yyyy")
  return `${format(sorted[0], "MMM d")} – ${format(sorted[n - 1], "MMM d, yyyy")} (${n} days)`
}

function buildHtml(heading: string, rows: [string, string][], link: string, linkLabel: string): string {
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr>` +
        `<td style="padding:5px 16px 5px 0;color:#6b7280;font-size:14px;vertical-align:top;white-space:nowrap">${k}</td>` +
        `<td style="padding:5px 0;font-size:14px;font-weight:500">${v}</td>` +
        `</tr>`,
    )
    .join("")
  return (
    `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;max-width:580px;margin:0 auto;padding:32px 24px">` +
    `<div style="margin-bottom:8px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">LIU Leave System</div>` +
    `<h2 style="color:#1e40af;margin:0 0 20px;font-size:20px">${heading}</h2>` +
    `<table style="border-collapse:collapse;margin-bottom:24px">${rowsHtml}</table>` +
    `<a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">${linkLabel}</a>` +
    `<hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb" />` +
    `<p style="font-size:12px;color:#9ca3af;margin:12px 0 0">Automated notification — do not reply to this email.</p>` +
    `</body></html>`
  )
}

async function sendSafely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`[Email] ${label} → sent successfully`)
  } catch (error) {
    console.error(`[Email] ${label} → FAILED:`, error)
  }
}

// Professor submits → notify all Assistant Deans on that campus
export async function notifyNewSubmission({
  requestId,
  professorName,
  professorEmail,
  campusId,
  campusName,
  departmentName,
  dates,
}: {
  requestId: string
  professorName: string | null
  professorEmail: string
  campusId: string | null
  campusName: string | null
  departmentName: string | null
  dates: Date[]
}): Promise<void> {
  if (!campusId) return
  const recipients = await db.user.findMany({
    where: { role: Role.ASSISTANT_DEAN as never, campusId },
    select: { email: true },
  })
  const to = recipients.map((r) => r.email)
  console.log("[Email] notifyNewSubmission → assistant deans:", to)
  if (to.length === 0) return
  const name = professorName ?? professorEmail
  const subject = `New leave request from ${name} — ${dates.length} day${dates.length !== 1 ? "s" : ""}`
  const html = buildHtml(
    `New leave request from ${name}`,
    [
      ["Professor", name],
      ["Campus", campusName ?? "—"],
      ["Department", departmentName ?? "—"],
      ["Dates", datesText(dates)],
    ],
    `${getBaseUrl()}/admin/submissions/${requestId}`,
    "Review Request",
  )
  await sendSafely("new submission → assistant deans", async () => {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw error
  })
}

// Assistant Dean approves → notify all Chairmen of that department
export async function notifyChairmen({
  requestId,
  professorName,
  professorEmail,
  departmentId,
  campusName,
  departmentName,
  dates,
}: {
  requestId: string
  professorName: string | null
  professorEmail: string
  departmentId: string | null
  campusName: string | null
  departmentName: string | null
  dates: Date[]
}): Promise<void> {
  if (!departmentId) return
  const recipients = await db.user.findMany({
    where: { role: Role.CHAIRMAN as never, departmentId },
    select: { email: true },
  })
  const to = recipients.map((r) => r.email)
  console.log("[Email] notifyChairmen → chairmen:", to)
  if (to.length === 0) return
  const name = professorName ?? professorEmail
  const subject = `Leave request from ${name} is awaiting your review`
  const html = buildHtml(
    `Leave request from ${name} — awaiting your review`,
    [
      ["Professor", name],
      ["Campus", campusName ?? "—"],
      ["Department", departmentName ?? "—"],
      ["Dates", datesText(dates)],
      ["Step", "Approved by Assistant Dean — awaiting Chairman review"],
    ],
    `${getBaseUrl()}/admin/submissions/${requestId}`,
    "Review Request",
  )
  await sendSafely("step1 approved → chairmen", async () => {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw error
  })
}

// Chairman approves → notify all Deans and Coordinators
export async function notifyDeans({
  requestId,
  professorName,
  professorEmail,
  campusName,
  departmentName,
  dates,
}: {
  requestId: string
  professorName: string | null
  professorEmail: string
  campusName: string | null
  departmentName: string | null
  dates: Date[]
}): Promise<void> {
  const recipients = await db.user.findMany({
    where: { role: { in: [Role.DEAN, Role.COORDINATOR] as never[] } },
    select: { email: true },
  })
  const to = recipients.map((r) => r.email)
  console.log("[Email] notifyDeans → deans/coordinators:", to)
  if (to.length === 0) return
  const name = professorName ?? professorEmail
  const subject = `Leave request from ${name} is awaiting final approval`
  const html = buildHtml(
    `Leave request from ${name} — awaiting final approval`,
    [
      ["Professor", name],
      ["Campus", campusName ?? "—"],
      ["Department", departmentName ?? "—"],
      ["Dates", datesText(dates)],
      ["Step", "Approved by Chairman — awaiting final approval"],
    ],
    `${getBaseUrl()}/admin/submissions/${requestId}`,
    "Review Request",
  )
  await sendSafely("step2 approved → deans", async () => {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw error
  })
}

// Dean/Coordinator approves → notify the professor (final approval)
export async function notifyProfessorApproved({
  professorEmail,
  dates,
}: {
  professorEmail: string
  dates: Date[]
}): Promise<void> {
  console.log("[Email] notifyProfessorApproved →", professorEmail)
  const to = [professorEmail]
  const subject = "Your leave request has been approved"
  const html = buildHtml(
    "Your leave request has been approved",
    [
      ["Dates", datesText(dates)],
      ["Status", "Fully approved"],
    ],
    `${getBaseUrl()}/dashboard`,
    "View Dashboard",
  )
  await sendSafely("final approved → professor", async () => {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw error
  })
}

// Any rejection → notify the professor
export async function notifyProfessorRejected({
  professorEmail,
  rejectedBy,
  comment,
  dates,
}: {
  professorEmail: string
  rejectedBy: string
  comment?: string | null
  dates: Date[]
}): Promise<void> {
  const rows: [string, string][] = [
    ["Dates", datesText(dates)],
    ["Rejected by", rejectedBy],
  ]
  if (comment?.trim()) rows.push(["Comment", comment.trim()])
  console.log("[Email] notifyProfessorRejected →", professorEmail, "| rejectedBy:", rejectedBy)
  const to = [professorEmail]
  const subject = "Your leave request has been rejected"
  const html = buildHtml(
    "Your leave request has been rejected",
    rows,
    `${getBaseUrl()}/dashboard`,
    "View Dashboard",
  )
  await sendSafely("rejected → professor", async () => {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw error
  })
}
