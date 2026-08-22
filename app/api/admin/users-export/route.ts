import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageUsers, getRoleLabel } from "@/types/enums"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await db.user.findMany({
    include: { campus: true, department: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  const rows = users.map((u) => ({
    "Name":       u.name ?? "—",
    "Email":      u.email,
    "Campus":     u.campus?.name ?? "—",
    "Department": u.department?.name ?? "—",
    "Role":       getRoleLabel(u.role),
    "Joined":     format(u.createdAt, "yyyy-MM-dd"),
    "Blocked":    u.blocked ? "Yes" : "No",
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  ws["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 8 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Users")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `liu-users-${format(new Date(), "yyyy-MM-dd")}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
