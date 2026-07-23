import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  canAccessAdmin,
  canApproveStep1,
  canApproveStep2,
  canBypassApproval,
  canBulkApprove,
  LeaveStatus,
} from "@/types/enums"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SubmissionsFilter } from "@/components/submissions-filter"
import { BulkSubmissionsTable } from "@/components/bulk-submissions-table"
import { ClipboardList, Clock, CheckCircle2, XCircle, Download } from "lucide-react"
import { getCurrentAcademicYear, getAcademicYearFromStartYear } from "@/lib/academic-year"

interface Props {
  searchParams: { campus?: string; status?: string; search?: string; year?: string }
}

export default async function SubmissionsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const role = session.user.role
  const currentYear = getCurrentAcademicYear()
  const selectedStartYear = searchParams.year
    ? parseInt(searchParams.year)
    : currentYear.start.getFullYear()
  const { start, end } = getAcademicYearFromStartYear(selectedStartYear)

  // Scope filter based on role
  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }

  const professorWhere: Record<string, unknown> = { ...scopeFilter }
  if (searchParams.campus && canBypassApproval(role)) {
    professorWhere.campusId = searchParams.campus
  }
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
        ...(searchParams.status ? { status: searchParams.status as never } : {}),
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
        earliest.submittedAt.getMonth() >= 9
          ? earliest.submittedAt.getFullYear()
          : earliest.submittedAt.getFullYear() - 1
      ).start.getFullYear()
    : currentYear.start.getFullYear()

  const availableYears: number[] = []
  for (let y = earliestYear; y <= currentYear.start.getFullYear(); y++) {
    availableYears.push(y)
  }

  const rejectedStatuses = [LeaveStatus.REJECTED, LeaveStatus.STEP1_REJECTED, LeaveStatus.STEP2_REJECTED]

  const counts = {
    total: requests.length,
    inProgress: requests.filter((r) =>
      [LeaveStatus.PENDING, LeaveStatus.STEP1_APPROVED, LeaveStatus.STEP2_APPROVED].includes(r.status as never)
    ).length,
    approved: requests.filter((r) => r.status === LeaveStatus.APPROVED).length,
    rejected: requests.filter((r) => rejectedStatuses.includes(r.status as never)).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        {canBypassApproval(role) && (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/admin/export" download>
              <Download className="w-4 h-4" />
              Export by Professor
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total, valueColor: "text-foreground", iconBg: "bg-muted", icon: ClipboardList, iconColor: "text-muted-foreground" },
          { label: "In Progress", value: counts.inProgress, valueColor: "text-amber-600", iconBg: "bg-amber-100", icon: Clock, iconColor: "text-amber-600" },
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
          campuses={canBypassApproval(role) ? campuses : []}
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
          <BulkSubmissionsTable
            requests={requests}
            canBulkApprove={canBulkApprove(role)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
