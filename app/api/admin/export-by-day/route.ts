import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/types/enums"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const requests = await db.leaveRequest.findMany({
    where: { status: "APPROVED" },
    include: {
      professor: { include: { campus: true, department: true } },
    },
    orderBy: { submittedAt: "asc" },
  })

  // Group rows by date
  const byDate = new Map<string, { professor: string; email: string; campus: string; department: string }[]>()

  for (const req of requests) {
    const profName = req.professor.name ?? req.professor.email
    for (const date of req.dates) {
      const key = format(date, "yyyy-MM-dd")
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push({
        professor: profName,
        email: req.professor.email,
        campus: req.professor.campus?.name ?? "—",
        department: req.professor.department?.name ?? "—",
      })
    }
  }

  // Sort dates, then professors within each date
  const sortedDates = Array.from(byDate.keys()).sort()
  for (const rows of Array.from(byDate.values())) {
    rows.sort((a, b) => a.professor.localeCompare(b.professor))
  }

  const wb = XLSX.utils.book_new()
  const COL_WIDTHS = [{ wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 28 }]

  for (const date of sortedDates) {
    const rows = byDate.get(date)!
    const sheetRows = rows.map((r) => ({
      "Professor": r.professor,
      "Email": r.email,
      "Campus": r.campus,
      "Department": r.department,
    }))
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    ws["!cols"] = COL_WIDTHS
    // Sheet name: "Mon Jun 05" (Excel limit: 31 chars)
    const sheetName = format(new Date(date + "T00:00:00"), "EEE MMM dd")
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-leave-by-day-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
