import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canAccessAdmin, canApproveStep1, canApproveStep2 } from "@/types/enums"
import { format, startOfDay, endOfDay, isToday, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, MapPin, Users } from "lucide-react"

interface Props {
  searchParams: { date?: string }
}

export default async function DailySummaryPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const role = session.user.role
  const targetDate = searchParams.date ? parseISO(searchParams.date) : new Date()
  const dayStart = startOfDay(targetDate)
  const dayEnd = endOfDay(targetDate)

  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }

  const [professors, onLeaveRequests] = await Promise.all([
    db.user.findMany({
      where: { role: "PROFESSOR", ...scopeFilter },
      include: { campus: true, department: true },
      orderBy: [{ campus: { name: "asc" } }, { department: { name: "asc" } }, { name: "asc" }],
    }),
    db.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        dates: { hasSome: [targetDate] },
        professor: Object.keys(scopeFilter).length > 0 ? scopeFilter : undefined,
      },
      select: { professorId: true },
    }),
  ])

  const onLeaveIds = new Set(onLeaveRequests.map((r) => r.professorId))

  // Group professors by campus → department
  type ProfEntry = {
    id: string
    name: string | null
    email: string
    onLeave: boolean
  }
  type DeptGroup = { id: string; name: string; profs: ProfEntry[] }
  type CampusGroup = { id: string; name: string; depts: Map<string, DeptGroup>; noDept: ProfEntry[] }

  const campusMap = new Map<string, CampusGroup>()
  const noCampus: ProfEntry[] = []

  for (const prof of professors) {
    const entry: ProfEntry = {
      id: prof.id,
      name: prof.name,
      email: prof.email,
      onLeave: onLeaveIds.has(prof.id),
    }

    if (!prof.campusId || !prof.campus) {
      noCampus.push(entry)
      continue
    }

    if (!campusMap.has(prof.campusId)) {
      campusMap.set(prof.campusId, {
        id: prof.campusId,
        name: prof.campus.name,
        depts: new Map(),
        noDept: [],
      })
    }
    const campus = campusMap.get(prof.campusId)!

    if (!prof.departmentId || !prof.department) {
      campus.noDept.push(entry)
    } else {
      if (!campus.depts.has(prof.departmentId)) {
        campus.depts.set(prof.departmentId, { id: prof.departmentId, name: prof.department.name, profs: [] })
      }
      campus.depts.get(prof.departmentId)!.profs.push(entry)
    }
  }

  const campuses = Array.from(campusMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  const totalOnLeave = onLeaveIds.size
  const totalAvailable = professors.length - totalOnLeave

  const dateLabel = isToday(targetDate)
    ? `Today — ${format(targetDate, "EEEE, MMMM d, yyyy")}`
    : format(targetDate, "EEEE, MMMM d, yyyy")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Daily Summary</h1>
        <p className="text-muted-foreground">{dateLabel}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{professors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Professors</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-green-600">{totalAvailable}</p>
            <p className="text-xs text-muted-foreground mt-1">Available</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 shrink-0">
            <XCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className={`text-2xl font-bold leading-none ${totalOnLeave > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {totalOnLeave}
            </p>
            <p className="text-xs text-muted-foreground mt-1">On Leave</p>
          </div>
        </Card>
      </div>

      {professors.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No professors found in your scope.</Card>
      ) : (
        <div className="space-y-6">
          {campuses.map((campus) => {
            const depts = Array.from(campus.depts.values()).sort((a, b) => a.name.localeCompare(b.name))
            const campusOnLeave = [...depts.flatMap(d => d.profs), ...campus.noDept].filter(p => p.onLeave).length
            const campusTotal = depts.reduce((s, d) => s + d.profs.length, 0) + campus.noDept.length

            return (
              <Card key={campus.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {campus.name}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {campusTotal - campusOnLeave} available · {campusOnLeave} on leave
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {depts.map((dept) => (
                    <div key={dept.id} className="border-t">
                      <div className="px-6 py-2 bg-muted/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {dept.name}
                        </p>
                      </div>
                      <div className="divide-y">
                        {dept.profs.map((prof) => (
                          <ProfRow key={prof.id} prof={prof} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {campus.noDept.length > 0 && (
                    <div className="border-t">
                      <div className="px-6 py-2 bg-muted/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          No Department
                        </p>
                      </div>
                      <div className="divide-y">
                        {campus.noDept.map((prof) => (
                          <ProfRow key={prof.id} prof={prof} />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {noCampus.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  No Campus Assigned
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y border-t">
                  {noCampus.map((prof) => (
                    <ProfRow key={prof.id} prof={prof} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function ProfRow({ prof }: { prof: { id: string; name: string | null; email: string; onLeave: boolean } }) {
  return (
    <div className="px-6 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{prof.name ?? prof.email}</p>
        {prof.name && <p className="text-xs text-muted-foreground">{prof.email}</p>}
      </div>
      {prof.onLeave ? (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1 shrink-0">
          <XCircle className="w-3 h-3" />
          On Leave
        </Badge>
      ) : (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          Available
        </Badge>
      )}
    </div>
  )
}
