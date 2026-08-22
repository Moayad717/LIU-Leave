import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canBypassApproval, getStatusLabel } from "@/types/enums"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session || !canBypassApproval(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requests = await db.leaveRequest.findMany({
    include: {
      professor: { include: { campus: true, department: true } },
      reviewedBy:      { select: { name: true, email: true } },
      step1ReviewedBy: { select: { name: true, email: true } },
      step2ReviewedBy: { select: { name: true, email: true } },
    },
    orderBy: [{ professor: { name: "asc" } }, { submittedAt: "asc" }],
  })

  const rows = requests.map((r) => ({
    "Professor":       r.professor.name ?? r.professor.email,
    "Email":           r.professor.email,
    "Campus":          r.professor.campus?.name ?? "—",
    "Department":      r.professor.department?.name ?? "—",
    "Status":          getStatusLabel(r.status),
    "Days":            r.dates.length,
    "Submitted":       format(r.submittedAt, "yyyy-MM-dd"),
    "Dates":           [...r.dates].sort((a, b) => a.getTime() - b.getTime()).map((d) => format(d, "yyyy-MM-dd")).join(", "),
    "Step 1 Reviewer": r.step1ReviewedBy ? (r.step1ReviewedBy.name ?? r.step1ReviewedBy.email) : "—",
    "Step 1 Date":     r.step1ReviewedAt ? format(r.step1ReviewedAt, "yyyy-MM-dd") : "—",
    "Step 1 Comment":  r.step1Comment ?? "—",
    "Step 2 Reviewer": r.step2ReviewedBy ? (r.step2ReviewedBy.name ?? r.step2ReviewedBy.email) : "—",
    "Step 2 Date":     r.step2ReviewedAt ? format(r.step2ReviewedAt, "yyyy-MM-dd") : "—",
    "Step 2 Comment":  r.step2Comment ?? "—",
    "Final Reviewer":  r.reviewedBy ? (r.reviewedBy.name ?? r.reviewedBy.email) : "—",
    "Final Date":      r.reviewedAt ? format(r.reviewedAt, "yyyy-MM-dd") : "—",
    "Final Comment":   r.adminComment ?? "—",
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws["!cols"] = [
    { wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 5 },
    { wch: 12 }, { wch: 60 },
    { wch: 20 }, { wch: 12 }, { wch: 30 },
    { wch: 20 }, { wch: 12 }, { wch: 30 },
    { wch: 20 }, { wch: 12 }, { wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Submissions")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-submissions-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
