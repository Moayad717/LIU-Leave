"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Search, CalendarDays, Building, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SubmittedCalendar } from "@/components/submitted-calendar"

interface ProfEntry {
  professorId: string
  name: string | null
  email: string
  campus: { name: string } | null
  department: { name: string } | null
  totalDays: number
  allDates: Date[]
  requestCount: number
}

export function ProfsTable({ professors }: { professors: ProfEntry[] }) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ProfEntry | null>(null)

  const filtered = search.trim()
    ? professors.filter((p) => {
        const q = search.toLowerCase()
        return (
          p.name?.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.campus?.name.toLowerCase().includes(q) ||
          p.department?.name.toLowerCase().includes(q)
        )
      })
    : professors

  const sortedDates = selected
    ? [...selected.allDates].sort((a, b) => a.getTime() - b.getTime())
    : []

  return (
    <>
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
                <TableHead>Total Days</TableHead>
                <TableHead>Requests</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((prof) => (
                <TableRow
                  key={prof.professorId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelected(prof)}
                >
                  <TableCell className="font-medium">
                    {prof.name ?? prof.email}
                  </TableCell>
                  <TableCell>{prof.campus?.name ?? "—"}</TableCell>
                  <TableCell>{prof.department?.name ?? "—"}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{prof.totalDays}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prof.requestCount === 1
                      ? "1 request"
                      : `${prof.requestCount} requests`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {selected.name ?? selected.email}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building className="w-3.5 h-3.5" />
                  {selected.campus?.name ?? "No campus"}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  {selected.department?.name ?? "No department"}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {selected.totalDays} approved day{selected.totalDays !== 1 ? "s" : ""}
                  {selected.requestCount > 1 && (
                    <span className="ml-1">
                      across {selected.requestCount} requests
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              <SubmittedCalendar dates={sortedDates.map((d) => d.toISOString())} />

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  All approved dates ({sortedDates.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sortedDates.map((date) => (
                    <Badge key={date.toISOString()} variant="secondary" className="text-xs font-normal">
                      {format(date, "EEE, MMM d, yyyy")}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
