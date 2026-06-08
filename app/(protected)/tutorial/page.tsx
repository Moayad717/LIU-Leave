"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  GraduationCap,
  ShieldCheck,
  Crown,
  Building2,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
} from "lucide-react"

type RoleKey = "PROFESSOR" | "ASSISTANT_DEAN" | "CHAIRMAN" | "DEAN"

interface RoleOption {
  key: RoleKey
  label: string
  description: string
  icon: React.ElementType
  color: string
  badgeClass: string
}

const ROLES: RoleOption[] = [
  {
    key: "PROFESSOR",
    label: "Professor",
    description: "Submit and track your leave requests",
    icon: GraduationCap,
    color: "text-slate-600",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    key: "ASSISTANT_DEAN",
    label: "Assistant Dean",
    description: "Step 1 reviewer — campus-level approvals",
    icon: ShieldCheck,
    color: "text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "CHAIRMAN",
    label: "Chairman",
    description: "Step 2 reviewer — department-level approvals",
    icon: Crown,
    color: "text-orange-600",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    key: "DEAN",
    label: "Dean / Coordinator",
    description: "Final approval, user management & statistics",
    icon: Building2,
    color: "text-blue-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
]

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1 pb-6">
        <p className="font-semibold text-sm mb-1.5">{title}</p>
        <div className="text-sm text-muted-foreground space-y-1.5">{children}</div>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusFlow({ statuses }: { statuses: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 my-2">
      {statuses.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <Badge className={s.color}>{s.label}</Badge>
          {i < statuses.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

function ScreenshotPlaceholder({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-lg overflow-hidden border shadow-sm my-3">
      <img src={src} alt={alt} className="w-full object-cover" />
    </div>
  )
}

function ProfessorGuide() {
  return (
    <div className="space-y-8">
      <Section icon={CalendarDays} title="Your Dashboard">
        <Step number={1} title="View your leave summary">
          <p>When you sign in, your dashboard shows three key numbers: <strong>Total days allowed</strong> (set by your dean), <strong>Days used</strong> across all active requests this academic year, and <strong>Days remaining</strong>.</p>
          <p className="mt-1">The academic year runs from <strong>October 1</strong> to <strong>September 30</strong>.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/prof-dash-noreq.png" alt="Professor dashboard with no requests" />
        <Step number={2} title="View existing requests">
          <p>All your leave requests for the current academic year appear in cards above the submission form, sorted newest first. Each card shows the dates selected, submission date, current status, and any admin comment.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/prof-dash-withreq.png" alt="Professor dashboard with existing requests" />
      </Section>

      <Separator />

      <Section icon={ClipboardList} title="Submitting a Request">
        <Step number={1} title="Pick dates from the calendar">
          <p>The calendar shows the full academic year. You can select multiple non-consecutive dates — just click each one. Weekends, official holidays, and the Sep 16–30 closing period are greyed out and cannot be selected.</p>
          <p className="mt-1">Dates already used in approved or pending requests are highlighted and blocked.</p>
        </Step>
        <Step number={2} title="Submit your selection">
          <p>Once you have your dates, click <strong>Submit Leave Request</strong>. You can submit multiple separate requests throughout the year — the system tracks your cumulative total automatically.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/submission-page.png" alt="Submission page" />
        <Step number={3} title="Save a draft">
          <p>Not ready to submit yet? Click <strong>Save draft</strong> — your selected dates are stored in your browser and restored the next time you visit. The draft is cleared automatically after you submit.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={CheckCircle2} title="Tracking Your Request Status">
        <Step number={1} title="Understand the approval chain">
          <p>Every request goes through up to three reviewers before a final decision:</p>
          <StatusFlow statuses={[
            { label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
            { label: "Awaiting Chairman", color: "bg-blue-100 text-blue-800 border-blue-300" },
            { label: "Awaiting Dean", color: "bg-purple-100 text-purple-800 border-purple-300" },
            { label: "Approved", color: "bg-green-100 text-green-800 border-green-300" },
          ]} />
          <p>A Dean or Coordinator can skip directly to a final decision at any step.</p>
        </Step>
        <Step number={2} title="What happens when rejected">
          <p>If your request is rejected, the admin may leave a comment explaining why. Some dates may be flagged as conflicting — those specific dates cannot be resubmitted.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/submission-reject.png" alt="Rejected submission with comment" />
      </Section>

      <Separator />

      <Section icon={RotateCcw} title="Restore Rejected Days">
        <Step number={1} title="One-click restore">
          <p>After a rejection, a <strong>Restore rejected days</strong> button appears above the calendar. Clicking it pre-selects all dates from your rejected request(s) that are still available — excluding any dates the admin explicitly flagged as conflicting.</p>
        </Step>
        <Step number={2} title="Review and re-submit">
          <p>Check the pre-selected dates, add or remove any, then submit as a new request. The restored dates count against your remaining day balance.</p>
        </Step>
      </Section>
    </div>
  )
}

function AssistantDeanGuide() {
  return (
    <div className="space-y-8">
      <Section icon={ShieldCheck} title="Your Role">
        <Step number={1} title="What you review">
          <p>As an Assistant Dean, you handle <strong>Step 1</strong> of the approval chain. You see only requests submitted by professors in <strong>your campus</strong> with status <strong>Pending</strong>.</p>
          <p className="mt-1">Your decision moves the request forward to the Chairman, or rejects it back to the professor.</p>
        </Step>
        <Step number={2} title="Scope">
          <p>You only have visibility over your own campus. Requests from other campuses do not appear in your queue.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={ClipboardList} title="Reviewing Requests">
        <Step number={1} title="Find pending requests">
          <p>Go to <strong>Submissions</strong> in the top navigation. The list is filtered to show only requests you can act on. Click any row to open the full review form.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/submission-page.png" alt="Submissions list" />
        <Step number={2} title="Review the details">
          <p>The review form shows the professor's name, department, campus, all selected dates on a calendar, and the request history. Review for conflicts before deciding.</p>
        </Step>
        <Step number={3} title="Approve or Reject">
          <p><strong>Approve:</strong> The request moves to <strong>Awaiting Chairman</strong> status. No comment required.</p>
          <p><strong>Reject:</strong> A comment is mandatory. You can optionally click individual dates on the calendar to flag them as conflicting — flagged dates appear in the rejection comment and the professor cannot restore them.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/reject-panel.png" alt="Rejection form with flagged dates" />
      </Section>

      <Separator />

      <Section icon={BarChart3} title="Statistics">
        <Step number={1} title="View campus statistics">
          <p>The <strong>Statistics</strong> page shows heatmaps and overlap analysis. You can see which days have multiple professors on leave simultaneously, broken down by campus or department.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/bycampus-allprof.png" alt="Statistics by campus" />
      </Section>
    </div>
  )
}

function ChairmanGuide() {
  return (
    <div className="space-y-8">
      <Section icon={Crown} title="Your Role">
        <Step number={1} title="What you review">
          <p>As a Chairman, you handle <strong>Step 2</strong> of the approval chain. You see only requests that have already passed Step 1 (status <strong>Awaiting Chairman</strong>) from professors in <strong>your department</strong>.</p>
          <p className="mt-1">Your approval moves the request to the Dean for final sign-off.</p>
        </Step>
        <Step number={2} title="Scope">
          <p>You have visibility only over your department. Requests from other departments — even on the same campus — do not appear in your queue.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={ClipboardList} title="Reviewing Requests">
        <Step number={1} title="Find requests awaiting you">
          <p>Go to <strong>Submissions</strong>. Only requests with <strong>Awaiting Chairman</strong> status from your department appear. Click a row to open the review form.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/await-chair-subpage.png" alt="Submissions list awaiting chairman" />
        <Step number={2} title="The approval flow so far">
          <StatusFlow statuses={[
            { label: "Pending", color: "bg-gray-100 text-gray-500 border-gray-200" },
            { label: "Awaiting Chairman ←", color: "bg-blue-100 text-blue-800 border-blue-300" },
            { label: "Awaiting Dean", color: "bg-purple-100 text-purple-700 border-purple-200" },
            { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
          ]} />
          <p>The request has already been reviewed by an Assistant Dean. You are the second check.</p>
        </Step>
        <Step number={3} title="Approve or Reject">
          <p><strong>Approve:</strong> Moves to <strong>Awaiting Dean</strong>. No comment required.</p>
          <p><strong>Reject:</strong> Requires a comment. You can flag specific conflicting dates in the rejection form.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/reject-panel.png" alt="Rejection panel with flagged dates" />
      </Section>

      <Separator />

      <Section icon={BarChart3} title="Statistics">
        <Step number={1} title="Department overlap view">
          <p>In <strong>Statistics → By department</strong>, you can see days where multiple professors from the same department are on leave simultaneously. Use this to inform your approval decisions.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/bycampus-bydep.png" alt="Statistics by department" />
      </Section>
    </div>
  )
}

function DeanGuide() {
  return (
    <div className="space-y-8">
      <Section icon={Building2} title="Your Role">
        <Step number={1} title="Final approval authority">
          <p>As a Dean or Coordinator, you make the <strong>final decision</strong> on all requests that have completed Steps 1 and 2 (status <strong>Awaiting Dean</strong>). Your approval marks the request as fully <strong>Approved</strong>.</p>
          <p className="mt-1">You can also <strong>bypass</strong> the chain entirely — approving or rejecting any request at any step.</p>
        </Step>
        <Step number={2} title="Admin access">
          <p>You have access to all admin sections: Submissions, Statistics, Users, and Settings.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={ClipboardList} title="Reviewing Requests">
        <Step number={1} title="Final review queue">
          <p>In <strong>Submissions</strong>, requests awaiting your decision appear with status <strong>Awaiting Dean</strong>. You can also view and act on requests at any earlier step if needed.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/await-dean-subpage.png" alt="Submissions list awaiting dean" />
        <Step number={2} title="Approve or Reject">
          <p><strong>Approve:</strong> Request is marked <strong>Approved</strong>. The professor is notified and can print their leave confirmation.</p>
          <p><strong>Reject:</strong> Requires a comment. You can flag specific conflicting dates in the rejection form.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/reject-panel.png" alt="Rejection panel with flagged dates" />
      </Section>

      <Separator />

      <Section icon={Users} title="User Management">
        <Step number={1} title="Change roles">
          <p>Go to <strong>Users</strong>. Each user row has a role control — click it to assign a new role. You can assign any role except Super Admin. Role changes take effect within 15 minutes for active sessions.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/users-page.png" alt="Users management page" />
        <Step number={2} title="Block a user">
          <p>Click the <strong>shield icon</strong> next to a user to block their account. A blocked user is immediately redirected to an error page and cannot access the system until unblocked. To unblock, they must sign out and sign back in.</p>
        </Step>
        <Step number={3} title="Delete a user">
          <p>Click the <strong>trash icon</strong> to permanently delete a user and all their leave requests. This cannot be undone. A confirmation dialog appears before deletion.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={BarChart3} title="Statistics">
        <Step number={1} title="Heatmap overview">
          <p>The heatmap shows the full academic year. Each cell represents one day — darker blue means more professors on leave that day. Hover any cell to see who is on leave.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/conflict-analysis.png" alt="Conflict analysis heatmap" />
        <Step number={2} title="Campus breakdown & overlap alerts">
          <p>The campus breakdown table highlights days where the number of absent professors exceeds your configured threshold. Switch between <strong>All professors</strong> and <strong>By department</strong> modes.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/bycampus-allprof.png" alt="Campus overlap analysis" />
        <Step number={3} title="Export data">
          <p>Use the export buttons to download leave data as CSV — either a summary per professor or a daily breakdown. Use these for reporting or record-keeping.</p>
        </Step>
      </Section>

      <Separator />

      <Section icon={Settings} title="Settings">
        <Step number={1} title="Open / close submissions">
          <p>Toggle the <strong>Submissions</strong> switch to prevent professors from submitting new requests during exam periods or other blackout windows.</p>
        </Step>
        <Step number={2} title="Thresholds & limits">
          <p>Set the <strong>maximum leave days</strong> per professor for the year. Configure campus and department overlap alert thresholds — when the number of absent professors on any given day exceeds these, an alert is shown in Statistics.</p>
        </Step>
        <Step number={3} title="Manage holidays">
          <p>Add official holidays manually or import them from an LIU calendar CSV. Holidays are blocked on the professor's date picker automatically.</p>
        </Step>
        <ScreenshotPlaceholder src="/tutorial/holidays-list.png" alt="Holiday management" />
        <ScreenshotPlaceholder src="/tutorial/import-list.png" alt="CSV import dialog" />
      </Section>
    </div>
  )
}

const GUIDES: Record<RoleKey, React.ReactNode> = {
  PROFESSOR: <ProfessorGuide />,
  ASSISTANT_DEAN: <AssistantDeanGuide />,
  CHAIRMAN: <ChairmanGuide />,
  DEAN: <DeanGuide />,
}

export default function TutorialPage() {
  const [selected, setSelected] = useState<RoleKey | null>(null)

  const selectedRole = ROLES.find((r) => r.key === selected)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Guide</h1>
        <p className="text-muted-foreground mt-1">Select your role to see instructions for your specific workflow.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const Icon = role.icon
          const isActive = selected === role.key
          return (
            <button
              key={role.key}
              onClick={() => setSelected(isActive ? null : role.key)}
              className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-2 rounded-lg ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : role.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{role.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selected && selectedRole && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <selectedRole.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>{selectedRole.label} Guide</CardTitle>
                <CardDescription>{selectedRole.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {GUIDES[selected]}
          </CardContent>
        </Card>
      )}

      {!selected && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <GraduationCap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a role above to view its guide</p>
        </div>
      )}
    </div>
  )
}
