import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { isAdmin } from "@/types/enums"
import { getCurrentAcademicYear } from "@/lib/academic-year"
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  CalendarDays,
  Users,
} from "lucide-react"
import { QuickApproveButton } from "@/components/quick-approve-button"

export default async function AdminPage() {
  const session = await auth()
  if (!session || !isAdmin(session.user.role)) redirect("/dashboard")

  const { start, end, label } = getCurrentAcademicYear()

  const [allRequests, approvedRequests, appSettings] = await Promise.all([
    db.leaveRequest.findMany({
      where: { submittedAt: { gte: start, lte: end } },
      include: { professor: { include: { campus: true, department: true } } },
      orderBy: { submittedAt: "desc" },
    }),
    db.leaveRequest.findMany({
      where: { status: "APPROVED" },
      include: { professor: { include: { campus: true } } },
    }),
    db.appSettings.findUnique({ where: { id: "global" } }),
  ])

  const campusOverlapThreshold = appSettings?.campusOverlapThreshold ?? 3

  const counts = {
    total: allRequests.length,
    pending: allRequests.filter((r) => r.status === "PENDING").length,
    approved: allRequests.filter((r) => r.status === "APPROVED").length,
    rejected: allRequests.filter((r) => r.status === "REJECTED").length,
  }

  const pendingRequests = allRequests.filter((r) => r.status === "PENDING")

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const thisWeekAbsences: { name: string; campus: string; dates: Date[] }[] = []
  for (const req of approvedRequests) {
    const datesThisWeek = req.dates.filter((d) =>
      isWithinInterval(d, { start: weekStart, end: weekEnd })
    )
    if (datesThisWeek.length > 0) {
      thisWeekAbsences.push({
        name: req.professor.name ?? req.professor.email,
        campus: req.professor.campus?.name ?? "—",
        dates: datesThisWeek.sort((a, b) => a.getTime() - b.getTime()),
      })
    }
  }
  thisWeekAbsences.sort((a, b) => a.dates[0].getTime() - b.dates[0].getTime())

  const dateCampusProfMap = new Map<string, { campusName: string; professors: string[] }>()
  for (const req of approvedRequests) {
    if (!req.professor.campusId || !req.professor.campus) continue
    for (const date of req.dates) {
      const key = `${format(date, "yyyy-MM-dd")}__${req.professor.campusId}`
      if (!dateCampusProfMap.has(key)) {
        dateCampusProfMap.set(key, { campusName: req.professor.campus.name, professors: [] })
      }
      const entry = dateCampusProfMap.get(key)!
      if (!entry.professors.includes(req.professor.name ?? req.professor.email ?? "")) {
        entry.professors.push(req.professor.name ?? req.professor.email ?? "Unknown")
      }
    }
  }

  let overlapCount = 0
  dateCampusProfMap.forEach((val) => {
    if (val.professors.length >= campusOverlapThreshold) overlapCount++
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Academic year {label} overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, color: "text-foreground", iconBg: "bg-muted", icon: ClipboardList, iconColor: "text-muted-foreground" },
          { label: "Pending", value: counts.pending, color: "text-amber-600", iconBg: "bg-amber-100", icon: Clock, iconColor: "text-amber-600" },
          { label: "Approved", value: counts.approved, color: "text-green-600", iconBg: "bg-green-100", icon: CheckCircle2, iconColor: "text-green-600" },
          { label: "Rejected", value: counts.rejected, color: "text-red-600", iconBg: "bg-red-100", icon: XCircle, iconColor: "text-red-600" },
        ].map(({ label: lbl, value, color, iconBg, icon: Icon, iconColor }) => (
          <Card key={lbl} className="p-5 flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{lbl}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Reviews
                </CardTitle>
                <CardDescription>
                  {counts.pending === 0 ? "All caught up." : `${counts.pending} request${counts.pending !== 1 ? "s" : ""} waiting`}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/submissions?status=PENDING">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.slice(0, 8).map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="font-medium text-sm leading-none">
                          {req.professor.name ?? req.professor.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {req.professor.campus?.name ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{req.dates.length}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <QuickApproveButton requestId={req.id} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/admin/submissions/${req.id}`}>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                This Week&apos;s Absences
              </CardTitle>
              <CardDescription>
                {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {thisWeekAbsences.length === 0 ? (
                <p className="text-sm text-center py-4 text-muted-foreground">
                  No approved absences this week.
                </p>
              ) : (
                <div className="space-y-2">
                  {thisWeekAbsences.map((a, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium leading-none">{a.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.campus}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {a.dates.map((d) => (
                          <Badge key={d.toISOString()} variant="secondary" className="text-xs font-normal">
                            {format(d, "EEE d")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Overlap Alerts
              </CardTitle>
              <CardDescription>
                Campus overlap threshold: {campusOverlapThreshold}+ professors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`text-3xl font-bold ${overlapCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {overlapCount}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    {overlapCount === 0
                      ? "No critical overlap days detected."
                      : `${overlapCount} day${overlapCount !== 1 ? "s" : ""} with high absenteeism.`}
                  </p>
                  <Button variant="link" size="sm" className="px-0 h-auto mt-1 text-xs" asChild>
                    <Link href="/admin/stats">View full analysis →</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "All Submissions", href: "/admin/submissions" },
                { label: "Statistics", href: "/admin/stats" },
                { label: "Users", href: "/admin/users" },
                { label: "Settings", href: "/admin/settings" },
              ].map(({ label: lbl, href }) => (
                <Button key={href} variant="outline" size="sm" className="justify-start gap-2" asChild>
                  <Link href={href}>{lbl}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
