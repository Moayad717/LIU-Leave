import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { format } from "date-fns"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReviewForm } from "@/components/review-form"
import {
  ArrowLeft,
  CalendarDays,
  User,
  Building,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react"

interface Props {
  params: { id: string }
}

export default async function SubmissionDetailPage({ params }: Props) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const req = await db.leaveRequest.findUnique({
    where: { id: params.id },
    include: {
      professor: { include: { campus: true, department: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
  })

  if (!req) notFound()

  const sortedDates = [...req.dates].sort((a, b) => a.getTime() - b.getTime())
  const isPending = req.status === "PENDING"

  return (
    <div className="space-y-6 max-w-2xl">
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
              label="Reviewed"
              value={`${format(req.reviewedAt, "MMMM d, yyyy")} by ${req.reviewedBy?.name ?? req.reviewedBy?.email ?? "unknown"}`}
            />
          )}
        </CardContent>
      </Card>

      {req.adminComment && (
        <Alert variant={req.status === "REJECTED" ? "destructive" : "success"}>
          <MessageSquare className="h-4 w-4" />
          <AlertTitle>Admin Comment</AlertTitle>
          <AlertDescription>{req.adminComment}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Dates</CardTitle>
          <CardDescription>{sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sortedDates.map((date) => (
              <Badge key={date.toISOString()} variant="secondary" className="text-xs font-normal">
                {format(date, "EEE, MMM d, yyyy")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {isPending && (
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

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
  if (status === "REJECTED") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
  return <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>
}
