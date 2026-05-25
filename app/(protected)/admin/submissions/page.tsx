import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { isAdmin } from "@/types/enums"
import Link from "next/link"
import { format } from "date-fns"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SubmissionsFilter } from "@/components/submissions-filter"
import { QuickApproveButton } from "@/components/quick-approve-button"
import { ChevronRight, ClipboardList, Clock, CheckCircle2, XCircle, Download } from "lucide-react"
import { getCurrentAcademicYear, getAcademicYearFromStartYear } from "@/lib/academic-year"
import type { LeaveStatus } from "@/types/enums"

interface SubmissionRow {
  id: string
  dates: Date[]
  status: string
  submittedAt: Date
  professor: {
    name: string | null
    email: string
    campus: { name: string } | null
    department: { name: string } | null
  }
}

interface Props {
  searchParams: { campus?: string; status?: string; search?: string; year?: string }
}

export default async function SubmissionsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || !isAdmin(session.user.role)) redirect("/dashboard")

  const currentYear = getCurrentAcademicYear()
  const selectedStartYear = searchParams.year ? parseInt(searchParams.year) : currentYear.start.getFullYear()
  const { start, end } = getAcademicYearFromStartYear(selectedStartYear)

  const professorWhere: Record<string, unknown> = {}
  if (searchParams.campus) professorWhere.campusId = searchParams.campus
  if (searchParams.search) {
    professorWhere.OR = [
      { name: { contains: searchParams.search, mode: "insensitive" } },
      { email: { contains: searchParams.search, mode: "insensitive" } },
    ]
  }

  const [campuses, requests, earliest] = await Promise.all([
    db.campus.findMany({ orderBy: { name: "asc" } }),
    db.leaveRequest.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        ...(Object.keys(professorWhere).length > 0 ? { professor: professorWhere } : {}),
        ...(searchParams.status ? { status: searchParams.status as LeaveStatus } : {}),
      },
      include: {
        professor: { include: { campus: true, department: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.leaveRequest.findFirst({ orderBy: { submittedAt: "asc" }, select: { submittedAt: true } }),
  ])

  const earliestYear = earliest
    ? getAcademicYearFromStartYear(
        earliest.submittedAt.getMonth() >= 8
          ? earliest.submittedAt.getFullYear()
          : earliest.submittedAt.getFullYear() - 1
      ).start.getFullYear()
    : currentYear.start.getFullYear()

  const availableYears: number[] = []
  for (let y = earliestYear; y <= currentYear.start.getFullYear(); y++) {
    availableYears.push(y)
  }

  const counts = {
    total: requests.length,
    pending: requests.filter((r: { status: string }) => r.status === "PENDING").length,
    approved: requests.filter((r: { status: string }) => r.status === "APPROVED").length,
    rejected: requests.filter((r: { status: string }) => r.status === "REJECTED").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <a href="/api/admin/export" download>
            <Download className="w-4 h-4" />
            Export by Professor
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, valueColor: "text-foreground", iconBg: "bg-muted", icon: ClipboardList, iconColor: "text-muted-foreground" },
          { label: "Pending", value: counts.pending, valueColor: "text-amber-600", iconBg: "bg-amber-100", icon: Clock, iconColor: "text-amber-600" },
          { label: "Approved", value: counts.approved, valueColor: "text-green-600", iconBg: "bg-green-100", icon: CheckCircle2, iconColor: "text-green-600" },
          { label: "Rejected", value: counts.rejected, valueColor: "text-red-600", iconBg: "bg-red-100", icon: XCircle, iconColor: "text-red-600" },
        ].map(({ label, value, valueColor, iconBg, icon: Icon, iconColor }) => (
          <Card key={label} className="p-5 flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${iconBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold leading-none ${valueColor}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Suspense fallback={<div className="flex gap-3"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-52" /><Skeleton className="h-10 w-44" /><Skeleton className="h-10 w-36" /></div>}>
        <SubmissionsFilter
          campuses={campuses}
          availableYears={availableYears}
          currentStartYear={currentYear.start.getFullYear()}
        />
      </Suspense>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Leave Requests
          </CardTitle>
          <CardDescription>{requests.length} results</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
              <p>No requests found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professor</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests as SubmissionRow[]).map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.professor.name ?? req.professor.email}
                    </TableCell>
                    <TableCell>{req.professor.campus?.name ?? "—"}</TableCell>
                    <TableCell>{req.professor.department?.name ?? "—"}</TableCell>
                    <TableCell>{req.dates.length}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(req.submittedAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {req.status === "PENDING" && (
                          <QuickApproveButton requestId={req.id} />
                        )}
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/submissions/${req.id}`}>
                            <ChevronRight className="w-4 h-4" />
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
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="warning">Pending</Badge>
}
