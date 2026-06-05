import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessAdmin } from "@/types/enums"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requests = await db.leaveRequest.findMany({
    where: { status: "APPROVED" },
    include: {
      professor: { include: { campus: true, department: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
    orderBy: { submittedAt: "desc" },
  })

  const rows = requests.map((r) => ({
    "Professor": r.professor.name ?? r.professor.email,
    "Email": r.professor.email,
    "Campus": r.professor.campus?.name ?? "—",
    "Department": r.professor.department?.name ?? "—",
    "Status": r.status,
    "Days": r.dates.length,
    "Dates": [...r.dates]
      .sort((a, b) => a.getTime() - b.getTime())
      .map((d) => format(d, "yyyy-MM-dd"))
      .join(", "),
    "Submitted": format(r.submittedAt, "yyyy-MM-dd"),
    "Reviewed By": r.reviewedBy?.name ?? r.reviewedBy?.email ?? "—",
    "Reviewed At": r.reviewedAt ? format(r.reviewedAt, "yyyy-MM-dd") : "—",
    "Admin Comment": r.adminComment ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const colWidths = [
    { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 28 },
    { wch: 10 }, { wch: 6 }, { wch: 80 }, { wch: 12 },
    { wch: 20 }, { wch: 12 }, { wch: 40 },
  ]
  ws["!cols"] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Leave Requests")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-leave-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
