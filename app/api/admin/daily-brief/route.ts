import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessAdmin, canApproveStep1, canApproveStep2 } from "@/types/enums"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(req: Request) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get("date")
  const target    = dateParam ? parseISO(dateParam) : new Date()
  const dayStart  = startOfDay(target)
  const dayEnd    = endOfDay(target)

  const role = session.user.role
  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }

  const [totalProfessors, onLeaveRequests] = await Promise.all([
    db.user.count({ where: { role: "PROFESSOR", ...scopeFilter } }),
    db.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        dates: { hasSome: [target] },
        professor: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
      },
      include: { professor: { include: { campus: true, department: true } } },
    }),
  ])

  const onLeaveMap = new Map<string, { name: string; campus: string; department: string }>()
  for (const req of onLeaveRequests) {
    if (!onLeaveMap.has(req.professorId)) {
      onLeaveMap.set(req.professorId, {
        name:       req.professor.name ?? req.professor.email,
        campus:     req.professor.campus?.name ?? "—",
        department: req.professor.department?.name ?? "—",
      })
    }
  }

  const onLeaveList = Array.from(onLeaveMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    total:       totalProfessors,
    onLeave:     onLeaveList.length,
    available:   totalProfessors - onLeaveList.length,
    onLeaveList,
  })
}
