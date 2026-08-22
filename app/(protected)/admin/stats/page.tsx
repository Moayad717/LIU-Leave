import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canAccessAdmin, canApproveStep1, canApproveStep2 } from "@/types/enums"
import { getCurrentAcademicYear, getAcademicYearFromStartYear } from "@/lib/academic-year"
import { format, getMonth, eachDayOfInterval } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarHeatmap } from "@/components/calendar-heatmap"
import { AvailabilityHeatmap } from "@/components/availability-heatmap"
import { CampusBreakdown } from "@/components/campus-breakdown"
import type { CampusEntry } from "@/components/campus-breakdown"
import { ProfsTable } from "@/components/profs-table"
import { YearFilter } from "@/components/year-filter"
import { AlertTriangle, CalendarDays, Building, User, CheckCircle2, CalendarRange, UserCheck } from "lucide-react"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

interface Props {
  searchParams: { year?: string }
}

export default async function StatsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const role = session.user.role
  const currentYear = getCurrentAcademicYear()
  const selectedStartYear = searchParams.year ? parseInt(searchParams.year) : currentYear.start.getFullYear()
  const { start, end, label } = getAcademicYearFromStartYear(selectedStartYear)

  // Role-based scope (same pattern as submissions page)
  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }
  const professorWhere = Object.keys(scopeFilter).length > 0 ? { professor: scopeFilter } : {}

  const [approvedRequests, professors, appSettings, earliest] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: "APPROVED", submittedAt: { gte: start, lte: end }, ...professorWhere },
      include: { professor: { include: { campus: true, department: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    db.user.findMany({
      where: { ...scopeFilter },
      select: { id: true, name: true, email: true, campus: { select: { name: true } } },
    }),
    db.appSettings.findUnique({ where: { id: "global" } }),
    db.leaveRequest.findFirst({ orderBy: { submittedAt: "asc" }, select: { submittedAt: true } }),
  ])

  const earliestYear = earliest
    ? getAcademicYearFromStartYear(
        earliest.submittedAt.getMonth() >= 9
          ? earliest.submittedAt.getFullYear()
          : earliest.submittedAt.getFullYear() - 1
      ).start.getFullYear()
    : currentYear.start.getFullYear()

  const availableYears: number[] = []
  for (let y = earliestYear; y <= currentYear.start.getFullYear(); y++) {
    availableYears.push(y)
  }

  const campusThreshold = appSettings?.campusOverlapThreshold ?? 3
  const deptThreshold = appSettings?.deptOverlapThreshold ?? 2

  const heatmapData: Record<string, number> = {}
  const heatmapDetails: Record<string, { name: string; campus: string }[]> = {}
  for (const req of approvedRequests) {
    const profName = req.professor.name ?? req.professor.email ?? "Unknown"
    const campusName = req.professor.campus?.name ?? "—"
    for (const date of req.dates) {
      const key = format(date, "yyyy-MM-dd")
      heatmapData[key] = (heatmapData[key] ?? 0) + 1
      if (!heatmapDetails[key]) heatmapDetails[key] = []
      if (!heatmapDetails[key].find((p) => p.name === profName)) {
        heatmapDetails[key].push({ name: profName, campus: campusName })
      }
    }
  }

  // Availability heatmap data
  const totalProfessors = professors.length
  const allProfessors = professors.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
    campus: p.campus?.name ?? "—",
  }))
  const onLeaveByDay: Record<string, Set<string>> = {}
  for (const req of approvedRequests) {
    for (const date of req.dates) {
      const key = format(date, "yyyy-MM-dd")
      if (!onLeaveByDay[key]) onLeaveByDay[key] = new Set()
      onLeaveByDay[key].add(req.professorId)
    }
  }
  const availData: Record<string, number> = {}
  const onLeaveIdsByDay: Record<string, string[]> = {}
  for (const day of eachDayOfInterval({ start, end })) {
    const key = format(day, "yyyy-MM-dd")
    const ids = onLeaveByDay[key]
    availData[key] = totalProfessors - (ids?.size ?? 0)
    if (ids && ids.size > 0) onLeaveIdsByDay[key] = Array.from(ids)
  }

  interface CampusTotals {
    name: string
    totalDays: number
    monthCounts: number[]
    profSet: Set<string>
  }

  const campusTotals = new Map<string, CampusTotals>()
  const dateCampusMap = new Map<string, { professors: string[] }>()
  const dateCampusDeptMap = new Map<string, { deptName: string; professors: string[] }>()

  for (const req of approvedRequests) {
    if (!req.professor.campusId || !req.professor.campus) continue
    const cid = req.professor.campusId
    const profName = req.professor.name ?? req.professor.email ?? "Unknown"

    if (!campusTotals.has(cid)) {
      campusTotals.set(cid, {
        name: req.professor.campus.name,
        totalDays: 0,
        monthCounts: new Array(12).fill(0),
        profSet: new Set(),
      })
    }
    const t = campusTotals.get(cid)!
    t.profSet.add(req.professor.id)
    t.totalDays += req.dates.length

    for (const date of req.dates) {
      t.monthCounts[getMonth(date)]++

      const campusKey = `${format(date, "yyyy-MM-dd")}__${cid}`
      if (!dateCampusMap.has(campusKey)) dateCampusMap.set(campusKey, { professors: [] })
      const ce = dateCampusMap.get(campusKey)!
      if (!ce.professors.includes(profName)) ce.professors.push(profName)

      if (req.professor.departmentId && req.professor.department) {
        const deptKey = `${format(date, "yyyy-MM-dd")}__${cid}__${req.professor.departmentId}`
        if (!dateCampusDeptMap.has(deptKey)) {
          dateCampusDeptMap.set(deptKey, { deptName: req.professor.department.name, professors: [] })
        }
        const de = dateCampusDeptMap.get(deptKey)!
        if (!de.professors.includes(profName)) de.professors.push(profName)
      }
    }
  }

  const campusEntries: CampusEntry[] = []
  campusTotals.forEach((totals, cid) => {
    const busiestIdx = totals.monthCounts.indexOf(Math.max(...totals.monthCounts))

    const allOverlaps: { date: string; professors: string[] }[] = []
    dateCampusMap.forEach((val, key) => {
      const [date, campusId] = key.split("__")
      if (campusId === cid && val.professors.length >= campusThreshold) {
        allOverlaps.push({ date, professors: [...val.professors] })
      }
    })
    allOverlaps.sort((a, b) => a.date.localeCompare(b.date))

    const deptOverlaps: { date: string; deptName: string; professors: string[] }[] = []
    dateCampusDeptMap.forEach((val, key) => {
      const parts = key.split("__")
      if (parts[1] === cid && val.professors.length >= deptThreshold) {
        deptOverlaps.push({ date: parts[0], deptName: val.deptName, professors: [...val.professors] })
      }
    })
    deptOverlaps.sort((a, b) => a.date.localeCompare(b.date) || a.deptName.localeCompare(b.deptName))

    campusEntries.push({
      id: cid,
      name: totals.name,
      totalProfessors: totals.profSet.size,
      totalDays: totals.totalDays,
      busiestMonth: MONTH_NAMES[busiestIdx],
      allOverlaps,
      deptOverlaps,
    })
  })
  campusEntries.sort((a, b) => b.totalDays - a.totalDays)

  // Group approved requests by professor (one entry per professor, dates merged)
  function groupByProfessor(reqs: typeof approvedRequests) {
    const map = new Map<string, {
      professorId: string
      name: string | null
      email: string
      campus: { name: string } | null
      department: { name: string } | null
      totalDays: number
      allDates: Date[]
      requestCount: number
    }>()
    for (const req of reqs) {
      const pid = req.professorId
      if (!map.has(pid)) {
        map.set(pid, {
          professorId: pid,
          name: req.professor.name,
          email: req.professor.email,
          campus: req.professor.campus,
          department: req.professor.department,
          totalDays: 0,
          allDates: [],
          requestCount: 0,
        })
      }
      const e = map.get(pid)!
      e.totalDays += req.dates.length
      e.allDates.push(...req.dates)
      e.requestCount++
    }
    return Array.from(map.values()).sort((a, b) => b.totalDays - a.totalDays)
  }

  const totalApprovedDays = approvedRequests.reduce((sum, r) => sum + r.dates.length, 0)
  const totalApprovedProfessors = new Set(approvedRequests.map((r) => r.professor.id)).size
  const totalCampusOverlapDays = campusEntries.reduce((sum, c) => sum + c.allOverlaps.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-muted-foreground">Academic year {label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={`/admin/stats/calendar-export?year=${selectedStartYear}`}>
              <CalendarRange className="w-4 h-4" />
              Export Calendar
            </a>
          </Button>
          <YearFilter
            availableYears={availableYears}
            currentStartYear={currentYear.start.getFullYear()}
            basePath="/admin/stats"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 shrink-0">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-blue-600">{totalApprovedDays}</p>
            <p className="text-xs text-muted-foreground mt-1">Approved Days</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-green-600">{totalApprovedProfessors}</p>
            <p className="text-xs text-muted-foreground mt-1">Faculty with Leave</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className={`text-2xl font-bold leading-none ${totalCampusOverlapDays > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {totalCampusOverlapDays}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Campus Overlap Days</p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heatmap" className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Available
          </TabsTrigger>
          <TabsTrigger value="campus" className="gap-1.5">
            <Building className="w-3.5 h-3.5" />
            By Campus
          </TabsTrigger>
          <TabsTrigger value="professors" className="gap-1.5">
            <User className="w-3.5 h-3.5" />
            By Person
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Heatmap — {label}</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarHeatmap data={heatmapData} details={heatmapDetails} startDate={start} endDate={end} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Availability Heatmap — {label}</CardTitle>
              <CardDescription>
                Shows how many professors are present each day. Green = full attendance, red = many on leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityHeatmap
                availData={availData}
                onLeaveIds={onLeaveIdsByDay}
                allProfessors={allProfessors}
                totalProfessors={totalProfessors}
                startDate={start}
                endDate={end}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campus">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Campus Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              <CampusBreakdown
                campuses={campusEntries}
                campusThreshold={campusThreshold}
                deptThreshold={deptThreshold}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professors">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By Person</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {approvedRequests.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">No approved leave yet.</p>
              ) : (
                <ProfsTable professors={groupByProfessor(approvedRequests)} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
