import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getCurrentAcademicYear } from "@/lib/academic-year"
import { format, getMonth } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { CalendarHeatmap } from "@/components/calendar-heatmap"
import { ProfsTable } from "@/components/profs-table"
import { AlertTriangle, CalendarDays, Building, User, TrendingUp, CheckCircle2 } from "lucide-react"

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export default async function StatsPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const { start, end, label } = getCurrentAcademicYear()

  const [approvedRequests, allRequests] = await Promise.all([
    db.leaveRequest.findMany({
      where: { status: "APPROVED" },
      include: {
        professor: { include: { campus: true } },
      },
    }),
    db.leaveRequest.findMany({
      where: { submittedAt: { gte: start, lte: end } },
      include: {
        professor: { include: { campus: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ])

  // ── Heatmap data ──────────────────────────────────────────────────────────
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

  // ── Per campus breakdown ──────────────────────────────────────────────────
  interface CampusStats {
    id: string
    name: string
    totalProfessors: number
    totalDays: number
    monthCounts: number[]
    overlapDays: number
  }

  const campusMap = new Map<string, CampusStats>()

  for (const req of approvedRequests) {
    if (!req.professor.campusId || !req.professor.campus) continue
    const cid = req.professor.campusId

    if (!campusMap.has(cid)) {
      campusMap.set(cid, {
        id: cid,
        name: req.professor.campus.name,
        totalProfessors: 0,
        totalDays: 0,
        monthCounts: new Array(12).fill(0),
        overlapDays: 0,
      })
    }

    const stats = campusMap.get(cid)!
    stats.totalDays += req.dates.length
    for (const d of req.dates) stats.monthCounts[getMonth(d)]++
  }

  // Count unique professors per campus from approved requests
  const campusProfSet = new Map<string, Set<string>>()
  for (const req of approvedRequests) {
    if (!req.professor.campusId) continue
    if (!campusProfSet.has(req.professor.campusId)) {
      campusProfSet.set(req.professor.campusId, new Set())
    }
    campusProfSet.get(req.professor.campusId)!.add(req.professor.id)
  }
  campusMap.forEach((stats, cid) => {
    stats.totalProfessors = campusProfSet.get(cid)?.size ?? 0
  })

  // ── Overlap calculation ────────────────────────────────────────────────────
  interface OverlapEntry {
    date: string
    campusId: string
    campusName: string
    professors: string[]
  }

  const dateCampusProfMap = new Map<string, { campusName: string; professors: string[] }>()

  for (const req of approvedRequests) {
    if (!req.professor.campusId || !req.professor.campus) continue
    for (const date of req.dates) {
      const key = `${format(date, "yyyy-MM-dd")}__${req.professor.campusId}`
      if (!dateCampusProfMap.has(key)) {
        dateCampusProfMap.set(key, {
          campusName: req.professor.campus.name,
          professors: [],
        })
      }
      const entry = dateCampusProfMap.get(key)!
      if (!entry.professors.includes(req.professor.name ?? req.professor.email ?? "")) {
        entry.professors.push(req.professor.name ?? req.professor.email ?? "Unknown")
      }
    }
  }

  const overlapAlerts: OverlapEntry[] = []
  dateCampusProfMap.forEach((val, key) => {
    if (val.professors.length >= 3) {
      const [date, campusId] = key.split("__")
      overlapAlerts.push({
        date,
        campusId,
        campusName: val.campusName,
        professors: val.professors,
      })
    }
  })
  overlapAlerts.sort((a, b) => a.date.localeCompare(b.date))

  // Add overlap count to campus stats
  overlapAlerts.forEach((o) => {
    const stats = campusMap.get(o.campusId)
    if (stats) stats.overlapDays++
  })

  const campusStats = Array.from(campusMap.values()).sort((a, b) => b.totalDays - a.totalDays)

  const totalApprovedDays = approvedRequests.reduce((sum, r) => sum + r.dates.length, 0)
  const totalApprovedProfessors = new Set(approvedRequests.map((r) => r.professor.id)).size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
        <p className="text-muted-foreground">Academic year {label} · Approved leave analysis</p>
      </div>

      {/* Summary metrics */}
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
            <p className="text-xs text-muted-foreground mt-1">Professors</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className={`text-2xl font-bold leading-none ${overlapAlerts.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {overlapAlerts.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Overlap Alerts</p>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="heatmap">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heatmap" className="gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Heatmap
          </TabsTrigger>
          <TabsTrigger value="campus" className="gap-1.5">
            <Building className="w-3.5 h-3.5" />
            By Campus
          </TabsTrigger>
          <TabsTrigger value="professors" className="gap-1.5">
            <User className="w-3.5 h-3.5" />
            By Professor
          </TabsTrigger>
          <TabsTrigger value="overlaps" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overlaps
            {overlapAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 px-1 py-0 text-xs">
                {overlapAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. Heatmap */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Heatmap — {label}</CardTitle>
              <CardDescription>
                Color intensity shows how many professors are on approved leave per day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarHeatmap data={heatmapData} details={heatmapDetails} startDate={start} endDate={end} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. By campus */}
        <TabsContent value="campus">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campus Breakdown</CardTitle>
              <CardDescription>Approved leave days per campus with overlap analysis.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {campusStats.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">No approved leave data.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campus</TableHead>
                      <TableHead>Professors</TableHead>
                      <TableHead>Total Days</TableHead>
                      <TableHead>Busiest Month</TableHead>
                      <TableHead>Overlap Days (3+)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campusStats.map((cs) => {
                      const busiestIdx = cs.monthCounts.indexOf(Math.max(...cs.monthCounts))
                      return (
                        <TableRow key={cs.id}>
                          <TableCell className="font-medium">{cs.name}</TableCell>
                          <TableCell>{cs.totalProfessors}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{cs.totalDays}</span>
                          </TableCell>
                          <TableCell>
                            {cs.totalDays > 0 ? MONTH_NAMES[busiestIdx] : "—"}
                          </TableCell>
                          <TableCell>
                            {cs.overlapDays > 0 ? (
                              <Badge variant="destructive">{cs.overlapDays}</Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. By professor */}
        <TabsContent value="professors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Professor Overview</CardTitle>
              <CardDescription>All leave requests for {label}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {allRequests.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">No submissions yet.</p>
              ) : (
                <ProfsTable requests={allRequests} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Overlaps */}
        <TabsContent value="overlaps">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Overlap Alerts
              </CardTitle>
              <CardDescription>
                Dates where 3 or more professors from the same campus have approved leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overlapAlerts.length === 0 ? (
                <Alert variant="success">
                  <TrendingUp className="h-4 w-4" />
                  <AlertTitle>No Critical Overlaps</AlertTitle>
                  <AlertDescription>
                    No dates have 3 or more professors from the same campus on leave simultaneously.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {overlapAlerts.map((o) => (
                    <div
                      key={`${o.date}-${o.campusId}`}
                      className="flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">
                            {format(new Date(o.date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <Badge variant="outline" className="text-xs">{o.campusName}</Badge>
                          <Badge variant="destructive" className="text-xs">
                            {o.professors.length} professors
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {o.professors.join(", ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

