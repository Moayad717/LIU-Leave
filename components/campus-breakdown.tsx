"use client"

import { Fragment, useState } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DayOverlap {
  date: string
  professors: string[]
}

interface DeptDayOverlap {
  date: string
  deptName: string
  professors: string[]
}

export interface CampusEntry {
  id: string
  name: string
  totalProfessors: number
  totalDays: number
  busiestMonth: string
  allOverlaps: DayOverlap[]
  deptOverlaps: DeptDayOverlap[]
}

interface Props {
  campuses: CampusEntry[]
  campusThreshold: number
  deptThreshold: number
}

export function CampusBreakdown({ campuses, campusThreshold, deptThreshold }: Props) {
  const [byDept, setByDept] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">Overlap mode:</span>
        <div className="inline-flex rounded-md border overflow-hidden text-sm">
          <button
            className={`px-3 py-1.5 transition-colors ${!byDept ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => { setByDept(false); setExpandedId(null) }}
          >
            All professors
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${byDept ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => { setByDept(true); setExpandedId(null) }}
          >
            By department
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          threshold: {byDept ? deptThreshold : campusThreshold}+ professors
        </span>
      </div>

      {campuses.length === 0 ? (
        <p className="p-6 text-center text-muted-foreground">No approved leave data.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campus</TableHead>
              <TableHead>Professors</TableHead>
              <TableHead>Total Days</TableHead>
              <TableHead>Busiest Month</TableHead>
              <TableHead>Overlap Days</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {campuses.map((campus) => {
              const isOpen = expandedId === campus.id
              const overlapCount = byDept ? campus.deptOverlaps.length : campus.allOverlaps.length

              return (
                <Fragment key={campus.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : campus.id)}
                  >
                    <TableCell className="font-medium">{campus.name}</TableCell>
                    <TableCell>{campus.totalProfessors}</TableCell>
                    <TableCell><span className="font-semibold">{campus.totalDays}</span></TableCell>
                    <TableCell>{campus.totalDays > 0 ? campus.busiestMonth : "—"}</TableCell>
                    <TableCell>
                      {overlapCount > 0 ? (
                        <Badge variant="destructive">{overlapCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="py-5 px-8">
                        {byDept ? (
                          <DeptOverlapDetails overlaps={campus.deptOverlaps} threshold={deptThreshold} />
                        ) : (
                          <AllOverlapDetails overlaps={campus.allOverlaps} threshold={campusThreshold} />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function AllOverlapDetails({ overlaps, threshold }: { overlaps: DayOverlap[]; threshold: number }) {
  if (overlaps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        No overlap days detected (threshold: {threshold}+ professors).
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-3">
        {overlaps.length} day{overlaps.length !== 1 ? "s" : ""} with {threshold}+ professors absent
      </p>
      {overlaps.map((o) => (
        <div key={o.date} className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm font-medium min-w-[9rem]">
              {format(new Date(o.date), "EEE, MMM d, yyyy")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {o.professors.map((p) => (
              <Badge key={p} variant="secondary" className="text-xs font-normal">{p}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DeptOverlapDetails({ overlaps, threshold }: { overlaps: DeptDayOverlap[]; threshold: number }) {
  if (overlaps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-1">
        No department-level overlaps detected (threshold: {threshold}+ professors).
      </p>
    )
  }

  const grouped = new Map<string, DeptDayOverlap[]>()
  for (const o of overlaps) {
    if (!grouped.has(o.deptName)) grouped.set(o.deptName, [])
    grouped.get(o.deptName)!.push(o)
  }

  return (
    <div className="space-y-5">
      {Array.from(grouped.entries()).map(([dept, entries]) => (
        <div key={dept}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold">{dept}</span>
            <Badge variant="outline" className="text-xs">
              {entries.length} day{entries.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-1.5 pl-3 border-l-2 border-amber-200">
            {entries.map((o) => (
              <div key={o.date} className="flex items-start gap-3">
                <span className="text-sm text-muted-foreground min-w-[8rem] shrink-0">
                  {format(new Date(o.date), "EEE, MMM d")}
                </span>
                <div className="flex flex-wrap gap-1">
                  {o.professors.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs font-normal">{p}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
