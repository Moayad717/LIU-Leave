import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  canAccessAdmin,
  canApproveStep1,
  canApproveStep2,
  canBypassApproval,
  canManageUsers,
  isRejected,
  LeaveStatus,
  type Role,
} from "@/types/enums"
import { format } from "date-fns"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReviewForm } from "@/components/review-form"
import { ConflictPanel } from "@/components/conflict-panel"
import type { DateConflict } from "@/components/conflict-panel"
import { SubmittedCalendar } from "@/components/submitted-calendar"
import { PrintButton } from "@/components/print-button"
import { DeleteRequestButton } from "@/components/delete-request-button"
import { StatusBadge } from "@/components/status-badge"
import {
  ArrowLeft,
  CalendarDays,
  User,
  Building,
  Clock,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
} from "lucide-react"

interface Props {
  params: { id: string }
}

export default async function SubmissionDetailPage({ params }: Props) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const role = session.user.role as Role

  const [req, appSettings] = await Promise.all([
    db.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        professor: { include: { campus: true, department: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    }),
    db.appSettings.findUnique({ where: { id: "global" } }),
  ])

  if (!req) notFound()

  // Scope enforcement: ASSISTANT_DEAN sees only their campus, CHAIRMAN only their dept
  if (canApproveStep1(role) && req.professor.campusId !== session.user.campusId) {
    redirect("/admin/submissions")
  }
  if (canApproveStep2(role) && req.professor.departmentId !== session.user.departmentId) {
    redirect("/admin/submissions")
  }

  const campusThreshold = appSettings?.campusOverlapThreshold ?? 3
  const deptThreshold = appSettings?.deptOverlapThreshold ?? 2
  const deptEnabled = appSettings?.deptOverlapEnabled ?? true

  const conflicts: DateConflict[] = []
  if (req.professor.campusId) {
    const campusApproved = await db.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
        id: { not: req.id },
        professor: { campusId: req.professor.campusId },
      },
      include: {
        professor: { select: { name: true, email: true, departmentId: true } },
      },
    })

    const sortedDates = [...req.dates].sort((a, b) => a.getTime() - b.getTime())

    for (const date of sortedDates) {
      const key = format(date, "yyyy-MM-dd")
      const campusAbsent: string[] = []
      const deptAbsent: string[] = []

      for (const other of campusApproved) {
        const isAbsent = other.dates.some((d) => format(d, "yyyy-MM-dd") === key)
        if (!isAbsent) continue
        const name = other.professor.name ?? other.professor.email
        campusAbsent.push(name)
        if (
          req.professor.departmentId &&
          other.professor.departmentId === req.professor.departmentId
        ) {
          deptAbsent.push(name)
        }
      }

      conflicts.push({
        date: key,
        campusAbsent,
        deptAbsent,
        campusAlert: campusAbsent.length + 1 >= campusThreshold,
        deptAlert: deptAbsent.length + 1 >= deptThreshold,
      })
    }
  }

  const sortedDates = [...req.dates].sort((a, b) => a.getTime() - b.getTime())

  // Terminal states are locked — no further review regardless of role
  const isTerminal = req.status === LeaveStatus.APPROVED || isRejected(req.status)

  // Determine if the current user can review this request
  const canReview =
    !isTerminal && (
      (canApproveStep1(role) && req.status === LeaveStatus.PENDING) ||
      (canApproveStep2(role) && req.status === LeaveStatus.STEP1_APPROVED) ||
      canBypassApproval(role)
    )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/submissions">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Leave Request</h1>
            <p className="text-sm text-muted-foreground">ID: {req.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManageUsers(role) && <DeleteRequestButton requestId={req.id} />}
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">LIU Leave — Leave Request</h1>
        <p className="text-sm text-muted-foreground">ID: {req.id}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">Request Details</CardTitle>
            <StatusBadge status={req.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={User} label="Professor" value={req.professor.name ?? req.professor.email} />
          <InfoRow icon={Building} label="Campus" value={req.professor.campus?.name ?? "—"} />
          <InfoRow icon={Building} label="Department" value={req.professor.department?.name ?? "—"} />
          <InfoRow icon={CalendarDays} label="Days requested" value={String(req.dates.length)} />
          <InfoRow icon={Clock} label="Submitted" value={format(req.submittedAt, "MMMM d, yyyy 'at' h:mm a")} />
          {req.reviewedAt && (
            <InfoRow
              icon={CheckCircle2}
              label="Last reviewed"
              value={`${format(req.reviewedAt, "MMMM d, yyyy")} by ${req.reviewedBy?.name ?? req.reviewedBy?.email ?? "unknown"}`}
            />
          )}
        </CardContent>
      </Card>

      {req.adminComment && (
        <Alert variant={["REJECTED", "STEP1_REJECTED", "STEP2_REJECTED"].includes(req.status) ? "destructive" : "default"}>
          <MessageSquare className="h-4 w-4" />
          <AlertTitle>Reviewer Comment</AlertTitle>
          <AlertDescription>{req.adminComment}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Dates</CardTitle>
          <CardDescription>{sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {sortedDates.map((date) => (
              <div key={date.toISOString()} className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium">
                {format(date, "EEE, MMM d, yyyy")}
              </div>
            ))}
          </div>
          <Separator />
          <SubmittedCalendar dates={sortedDates.map((d) => d.toISOString())} />
        </CardContent>
      </Card>

      {req.professor.campusId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Conflict Analysis
            </CardTitle>
            <CardDescription>
              Impact of approving these dates on {req.professor.campus?.name} campus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConflictPanel
              conflicts={conflicts}
              campusThreshold={campusThreshold}
              deptThreshold={deptThreshold}
              deptEnabled={deptEnabled}
              campusName={req.professor.campus?.name ?? "campus"}
              deptName={req.professor.department?.name ?? "department"}
            />
          </CardContent>
        </Card>
      )}

      {canReview && (
        <>
          <Separator />
          <Card className="border-2 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Review Request</CardTitle>
              <CardDescription>
                Approve or reject this leave request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewForm
                requestId={req.id}
                dates={sortedDates.map((d) => d.toISOString())}
                callerRole={role}
                requestStatus={req.status}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
