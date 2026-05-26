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

  // Group professor names by date
  const byDate = new Map<string, string[]>()

  for (const req of requests) {
    const profName = req.professor.name ?? req.professor.email
    for (const date of req.dates) {
      const key = format(date, "yyyy-MM-dd")
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push(profName)
    }
  }

  const sortedDates = Array.from(byDate.keys()).sort()
  for (const names of Array.from(byDate.values())) {
    names.sort((a, b) => a.localeCompare(b))
  }

  // Build array-of-arrays: [date, name1, name2, ...]
  const aoa: (string)[][] = sortedDates.map((key) => {
    const label = format(new Date(key + "T00:00:00"), "MMM d, yyyy")
    return [label, ...byDate.get(key)!]
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Date column fixed width, professor columns uniform
  const maxProfs = Math.max(...sortedDates.map((k) => byDate.get(k)!.length))
  ws["!cols"] = [{ wch: 16 }, ...Array(maxProfs).fill({ wch: 24 })]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Leave by Day")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-leave-by-day-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
