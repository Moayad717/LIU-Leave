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

  const professors = await db.user.findMany({
    where: { role: "PROFESSOR" },
    include: {
      campus: true,
      department: true,
      leaveRequests: {
        orderBy: { submittedAt: "asc" },
      },
    },
    orderBy: [{ campus: { name: "asc" } }, { name: "asc" }],
  })

  const rows = professors.map((p) => {
    const reqs = p.leaveRequests
    const totalDays   = reqs.reduce((s, r) => s + r.dates.length, 0)
    const approvedDays = reqs.filter(r => r.status === "APPROVED").reduce((s, r) => s + r.dates.length, 0)
    const pendingDays  = reqs.filter(r => ["PENDING","STEP1_APPROVED","STEP2_APPROVED"].includes(r.status)).reduce((s, r) => s + r.dates.length, 0)
    const rejectedDays = reqs.filter(r => ["REJECTED","STEP1_REJECTED","STEP2_REJECTED"].includes(r.status)).reduce((s, r) => s + r.dates.length, 0)

    const requestSummary = reqs.map((r, i) =>
      `#${i + 1}: ${getStatusLabel(r.status)} — ${r.dates.length} day(s) submitted ${format(r.submittedAt, "yyyy-MM-dd")}`
    ).join(" | ")

    return {
      "Name":            p.name ?? "—",
      "Email":           p.email,
      "Campus":          p.campus?.name ?? "—",
      "Department":      p.department?.name ?? "—",
      "Total Requests":  reqs.length,
      "Total Days":      totalDays,
      "Approved Days":   approvedDays,
      "Pending Days":    pendingDays,
      "Rejected Days":   rejectedDays,
      "Request Details": requestSummary || "No submissions",
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  ws["!cols"] = [
    { wch: 28 }, { wch: 34 }, { wch: 16 }, { wch: 28 },
    { wch: 14 }, { wch: 10 }, { wch: 13 }, { wch: 12 }, { wch: 13 },
    { wch: 80 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Professors")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-professors-submissions-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
