import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getCurrentAcademicYear } from "@/lib/academic-year"
import { format } from "date-fns"
import { parseDate } from "@/lib/utils"
import { canAccessAdmin } from "@/types/enums"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { DateMultiPickerClient } from "@/components/date-multi-picker-client"
import { AdminRolePicker } from "@/components/admin-role-picker"
import { SubmittedCalendar } from "@/components/submitted-calendar"
import { PrintButton } from "@/components/print-button"
import { DeleteRequestButton } from "@/components/delete-request-button"
import { StatusBadge } from "@/components/status-badge"
import Link from "next/link"
import {
  CalendarDays,
  Info,
  Lock,
  LayoutDashboard,
  Plus,
  Clock2,
} from "lucide-react"

interface Props {
  searchParams: { as?: string }
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const isAdminRole = canAccessAdmin(session.user.role)
  const viewingAsProfessor = searchParams.as === "professor"

  if (isAdminRole && !viewingAsProfessor) {
    return (
      <AdminRolePicker name={session.user.name?.split(" ")[0] ?? "Admin"} />
    )
  }

  const { start, end, label } = getCurrentAcademicYear()

  const [leaveRequests, user, appSettings, holidays] = await Promise.all([
    db.leaveRequest.findMany({
      where: {
        professorId: session.user.id,
        submittedAt: { gte: start, lte: end },
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      include: { campus: true, department: true },
    }),
    db.appSettings.findUnique({ where: { id: "global" } }),
    db.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }),
  ])

  const submissionsOpen = appSettings?.submissionsOpen ?? true
  const maxLeaveDays = appSettings?.maxLeaveDays ?? 22
  const holidayISOs = holidays.map((h) => ({ iso: h.date.toISOString(), label: h.label }))

  // Compute used days across non-rejected requests
  const rejectedStatuses = ["STEP1_REJECTED", "STEP2_REJECTED", "REJECTED"]
  const activeRequests = leaveRequests.filter((r) => !rejectedStatuses.includes(r.status))
  const usedDays = activeRequests.reduce((sum, r) => sum + r.dates.length, 0)
  const remainingDays = Math.max(0, maxLeaveDays - usedDays)

  // Dates to mark in the picker (disabled + coloured)
  const approvedDateISOs = leaveRequests
    .filter((r) => r.status === "APPROVED")
    .flatMap((r) => r.dates.map((d) => d.toISOString()))
  const pendingDateISOs = leaveRequests
    .filter((r) => ["PENDING", "STEP1_APPROVED", "STEP2_APPROVED"].includes(r.status))
    .flatMap((r) => r.dates.map((d) => d.toISOString()))

  const canSubmitMore = submissionsOpen && remainingDays > 0

  return (
    <div className="space-y-6 max-w-3xl">
      {isAdminRole && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm text-amber-700 font-medium">Viewing as professor</p>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Back to Admin Panel
          </Link>
        </div>
      )}

      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 px-6 py-5">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(" ")[0] ?? "Professor"}
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Academic year {label} · {user?.campus?.name ?? "No campus"} · {user?.department?.name ?? "No department"}
        </p>
      </div>

      {/* Days summary card */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col items-center text-center">
          <p className="text-2xl font-bold">{maxLeaveDays}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total days allowed</p>
        </Card>
        <Card className="p-4 flex flex-col items-center text-center">
          <p className={`text-2xl font-bold ${usedDays > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{usedDays}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Days used</p>
        </Card>
        <Card className="p-4 flex flex-col items-center text-center">
          <p className={`text-2xl font-bold ${remainingDays === 0 ? "text-red-600" : "text-green-600"}`}>{remainingDays}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Days remaining</p>
        </Card>
      </div>

      {/* Existing requests list */}
      {leaveRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Your Requests This Year</h2>
          {leaveRequests.map((req) => {
            const sortedDates = [...req.dates].sort((a, b) => a.getTime() - b.getTime())
            const isApproved = req.status === "APPROVED"

            return (
              <Card key={req.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock2 className="w-4 h-4 text-muted-foreground" />
                        {req.dates.length} day{req.dates.length !== 1 ? "s" : ""} requested
                      </CardTitle>
                      <CardDescription>
                        Submitted {format(req.submittedAt, "MMMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      {isApproved && <PrintButton />}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {req.adminComment && (
                    <Alert variant={["REJECTED", "STEP1_REJECTED", "STEP2_REJECTED"].includes(req.status) ? "destructive" : "default"}>
                      <AlertTitle>Comment</AlertTitle>
                      <AlertDescription className="whitespace-pre-line">
                        {req.adminComment}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-3">Selected dates</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {sortedDates.map((date) => (
                        <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                          {format(parseDate(date), "EEE, MMM d, yyyy")}
                        </Badge>
                      ))}
                    </div>
                    <SubmittedCalendar dates={sortedDates.map((d) => d.toISOString())} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New submission form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {leaveRequests.length === 0 ? "Submit Leave Request" : "Submit Another Request"}
          </CardTitle>
          <CardDescription>
            {remainingDays > 0
              ? `You have ${remainingDays} day${remainingDays !== 1 ? "s" : ""} remaining for the ${label} academic year.`
              : `You have used all ${maxLeaveDays} leave days for this academic year.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submissionsOpen ? (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Submissions Closed</AlertTitle>
              <AlertDescription>
                The admin has closed submissions. Please check back later.
              </AlertDescription>
            </Alert>
          ) : remainingDays === 0 ? (
            <Alert>
              <CalendarDays className="h-4 w-4" />
              <AlertTitle>Day Cap Reached</AlertTitle>
              <AlertDescription>
                You have used all {maxLeaveDays} allowed days for this academic year.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You can submit multiple requests up to the {maxLeaveDays}-day annual cap. Currently {usedDays} day{usedDays !== 1 ? "s" : ""} used, {remainingDays} remaining.
                </AlertDescription>
              </Alert>
              <DateMultiPickerClient
                startISO={start.toISOString()}
                endISO={end.toISOString()}
                holidays={holidayISOs}
                maxDays={remainingDays}
                approvedDateISOs={approvedDateISOs}
                pendingDateISOs={pendingDateISOs}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
