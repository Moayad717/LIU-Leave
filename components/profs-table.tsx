"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RequestRow {
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

export function ProfsTable({ requests }: { requests: RequestRow[] }) {
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = search.trim()
    ? requests.filter((r) => {
        const q = search.toLowerCase()
        return (
          r.professor.name?.toLowerCase().includes(q) ||
          r.professor.email.toLowerCase().includes(q) ||
          r.professor.campus?.name.toLowerCase().includes(q) ||
          r.professor.department?.name.toLowerCase().includes(q)
        )
      })
    : requests

  return (
    <div className="space-y-4">
      <div className="relative px-6 pt-2">
        <Search className="absolute left-9 top-4.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search professor or campus..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No results for &quot;{search}&quot;.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((req) => {
              const isOpen = expandedId === req.id
              const sortedDates = [...req.dates].sort((a, b) => a.getTime() - b.getTime())

              return (
                <>
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : req.id)}
                  >
                    <TableCell className="font-medium">
                      {req.professor.name ?? req.professor.email}
                    </TableCell>
                    <TableCell>{req.professor.campus?.name ?? "—"}</TableCell>
                    <TableCell>{req.professor.department?.name ?? "—"}</TableCell>
                    <TableCell>{req.dates.length}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(req.submittedAt, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow key={`${req.id}-dates`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={7} className="py-3 px-6">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Selected dates ({sortedDates.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sortedDates.map((date) => (
                            <Badge
                              key={date.toISOString()}
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {format(date, "EEE, MMM d, yyyy")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED") return <Badge variant="success">Approved</Badge>
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="warning">Pending</Badge>
}
