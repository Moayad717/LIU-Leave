import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getCurrentAcademicYear } from "@/lib/academic-year"
import { format } from "date-fns"
import { parseDate } from "@/lib/utils"
import { isAdmin as checkIsAdmin } from "@/types/enums"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { DateMultiPickerClient } from "@/components/date-multi-picker-client"
import { AdminRolePicker } from "@/components/admin-role-picker"
import { SubmittedCalendar } from "@/components/submitted-calendar"
import { PrintButton } from "@/components/print-button"
import Link from "next/link"
import { CalendarDays, CheckCircle2, Clock, XCircle, MessageSquare, Info, Lock, LayoutDashboard } from "lucide-react"

interface Props {
  searchParams: { as?: string }
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const isAdmin = checkIsAdmin(session.user.role)
  const viewingAsProfessor = searchParams.as === "professor"

  if (isAdmin && !viewingAsProfessor) {
    return (
      <AdminRolePicker name={session.user.name?.split(" ")[0] ?? "Admin"} />
    )
  }

  const { start, end, label } = getCurrentAcademicYear()

  const [leaveRequest, user, appSettings, holidays] = await Promise.all([
    db.leaveRequest.findFirst({
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

  const sortedDates = leaveRequest
    ? [...leaveRequest.dates].sort((a, b) => a.getTime() - b.getTime())
    : []

  return (
    <div className="space-y-6 max-w-3xl">
      {isAdmin && (
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

      {leaveRequest ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Your Leave Request</CardTitle>
                  <CardDescription>
                    Submitted {format(leaveRequest.submittedAt, "MMMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={leaveRequest.status} />
                  {leaveRequest.status === "APPROVED" && <PrintButton />}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>
                  {sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""} requested
                </span>
              </div>

              {leaveRequest.adminComment && (
                <Alert variant={leaveRequest.status === "REJECTED" ? "destructive" : "success"}>
                  <MessageSquare className="h-4 w-4" />
                  <AlertTitle>Admin Comment</AlertTitle>
                  <AlertDescription className="whitespace-pre-line">
                    {leaveRequest.adminComment}
                  </AlertDescription>
                </Alert>
              )}

              {leaveRequest.status === "PENDING" && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Pending Review</AlertTitle>
                  <AlertDescription>
                    Your request is awaiting admin review.
                  </AlertDescription>
                </Alert>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium mb-3">Selected dates</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {sortedDates.map((date) => (
                    <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                      {format(parseDate(date), "EEE, MMM d, yyyy")}
                    </Badge>
                  ))}
                </div>
                <Separator className="mb-6" />
                <SubmittedCalendar dates={sortedDates.map((d) => d.toISOString())} />
              </div>
            </CardContent>
          </Card>

          {leaveRequest.status === "REJECTED" && (
            <Card>
              <CardHeader>
                <CardTitle>Submit a New Request</CardTitle>
                <CardDescription>
                  Your previous request was rejected. Select new dates and resubmit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsOpen ? (
                  <DateMultiPickerClient
                    startISO={start.toISOString()}
                    endISO={end.toISOString()}
                    holidays={holidayISOs}
                    maxDays={maxLeaveDays}
                  />
                ) : (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertTitle>Submissions Closed</AlertTitle>
                    <AlertDescription>
                      The admin has closed submissions. Please check back later.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
            <CardDescription>
              Select up to 22 days for the {label} academic year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submissionsOpen ? (
              <>
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can only submit one leave request per academic year. Choose your dates carefully.
                  </AlertDescription>
                </Alert>
                <DateMultiPickerClient
                  startISO={start.toISOString()}
                  endISO={end.toISOString()}
                  holidays={holidayISOs}
                />
              </>
            ) : (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Submissions Closed</AlertTitle>
                <AlertDescription>
                  The admin has closed submissions. Please check back later.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="w-3 h-3" /> Approved
      </Badge>
    )
  }
  if (status === "REJECTED") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> Rejected
      </Badge>
    )
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  )
}
