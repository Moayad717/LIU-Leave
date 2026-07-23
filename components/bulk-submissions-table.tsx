"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ClipboardList, ChevronRight, CheckCheck } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { bulkApproveRequests } from "@/actions/admin"
import { isRejected, LeaveStatus } from "@/types/enums"

function isTerminal(status: string) {
  return status === LeaveStatus.APPROVED || isRejected(status)
}

interface RequestRow {
  id: string
  dates: Date[]
  submittedAt: Date
  status: string
  professor: {
    name: string | null
    email: string
    campus: { name: string } | null
    department: { name: string } | null
  }
}

interface Props {
  requests: RequestRow[]
  canBulkApprove: boolean
}

export function BulkSubmissionsTable({ requests, canBulkApprove }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Reset selection whenever the request list changes (filter/year changed)
  const requestKey = requests.map((r) => r.id).join(",")
  useEffect(() => {
    setSelected(new Set())
  }, [requestKey])

  const selectableIds = requests.filter((r) => !isTerminal(r.status)).map((r) => r.id)
  const allChecked = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const indeterminate = selected.size > 0 && !allChecked

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(selectableIds))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleBulkApprove() {
    startTransition(async () => {
      await bulkApproveRequests(Array.from(selected))
      setSelected(new Set())
    })
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
        <p>No requests found.</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {canBulkApprove && (
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = indeterminate }}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead>Professor</TableHead>
            <TableHead>Campus</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => (
            <TableRow
              key={req.id}
              className={selected.has(req.id) ? "bg-primary/5" : undefined}
            >
              {canBulkApprove && (
                <TableCell className="pl-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded disabled:cursor-not-allowed disabled:opacity-30"
                    checked={selected.has(req.id)}
                    disabled={isTerminal(req.status)}
                    onChange={() => toggleOne(req.id)}
                    aria-label={`Select ${req.professor.name ?? req.professor.email}`}
                  />
                </TableCell>
              )}
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
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/admin/submissions/${req.id}`}>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Floating bulk-action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-gray-900 px-5 py-3 shadow-2xl ring-1 ring-white/10">
          <CheckCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="text-sm font-semibold text-green-400 transition-colors hover:text-green-300 disabled:opacity-50"
          >
            {isPending ? "Approving…" : "Approve All"}
          </button>
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={() => setSelected(new Set())}
            disabled={isPending}
            className="text-sm text-gray-400 transition-colors hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  )
}
