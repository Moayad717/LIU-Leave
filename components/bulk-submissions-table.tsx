"use client"

import { useState, useTransition, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ClipboardList, ChevronRight, CheckCheck, ChevronsUpDown } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { bulkApproveRequests } from "@/actions/admin"
import { isRejected, LeaveStatus } from "@/types/enums"

function SortHeader({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onSelect: (v: string) => void
}) {
  const selectedLabel = options.find((o) => o.value === selected)?.label
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded hover:bg-muted/60 hover:text-foreground">
          {label}
          {selectedLabel ? (
            <span className="text-[11px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {selectedLabel}
            </span>
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {selected && (
          <>
            <DropdownMenuItem className="text-muted-foreground text-xs" onClick={() => onSelect("")}>
              Clear sort
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={selected === opt.value ? "font-medium bg-primary/5 text-primary" : ""}
          >
            {opt.label} first
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
    campus: { id: string; name: string } | null
    department: { id: string; name: string } | null
  }
}

interface Props {
  requests: RequestRow[]
  canBulkApprove: boolean
}

export function BulkSubmissionsTable({ requests, canBulkApprove }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [sortCampusId, setSortCampusId] = useState("")
  const [sortDeptId, setSortDeptId] = useState("")

  const campusOptions = Array.from(
    new Map(requests.filter((r) => r.professor.campus).map((r) => [r.professor.campus!.id, r.professor.campus!.name])).entries()
  ).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label))

  const deptOptions = Array.from(
    new Map(requests.filter((r) => r.professor.department).map((r) => [r.professor.department!.id, r.professor.department!.name])).entries()
  ).map(([id, name]) => ({ value: id, label: name })).sort((a, b) => a.label.localeCompare(b.label))

  // Reset selection whenever the request list changes (filter/year changed)
  const requestKey = requests.map((r) => r.id).join(",")
  useEffect(() => {
    setSelected(new Set())
  }, [requestKey])

  const sorted = (sortCampusId || sortDeptId)
    ? [...requests].sort((a, b) => {
        const aScore =
          (sortCampusId && a.professor.campus?.id === sortCampusId ? 2 : 0) +
          (sortDeptId   && a.professor.department?.id === sortDeptId ? 1 : 0)
        const bScore =
          (sortCampusId && b.professor.campus?.id === sortCampusId ? 2 : 0) +
          (sortDeptId   && b.professor.department?.id === sortDeptId ? 1 : 0)
        return bScore - aScore
      })
    : requests

  const selectableIds = sorted.filter((r) => !isTerminal(r.status)).map((r) => r.id)
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
            <TableHead>
              <SortHeader label="Campus" options={campusOptions} selected={sortCampusId} onSelect={setSortCampusId} />
            </TableHead>
            <TableHead>
              <SortHeader label="Department" options={deptOptions} selected={sortDeptId} onSelect={setSortDeptId} />
            </TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((req) => (
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
