"use client"

import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle2, Users, Building } from "lucide-react"
import { format } from "date-fns"
import { parseDate } from "@/lib/utils"

export interface DateConflict {
  date: string
  campusAbsent: string[]
  deptAbsent: string[]
  campusAlert: boolean
  deptAlert: boolean
}

interface Props {
  conflicts: DateConflict[]
  campusThreshold: number
  deptThreshold: number
  deptEnabled: boolean
  campusName: string
  deptName: string
}

export function ConflictPanel({
  conflicts,
  campusThreshold,
  deptThreshold,
  deptEnabled,
  campusName,
  deptName,
}: Props) {
  const campusAlerts = conflicts.filter((c) => c.campusAlert)
  const deptAlerts = conflicts.filter((c) => c.deptAlert)
  const hasAnyAlert = campusAlerts.length > 0 || deptAlerts.length > 0

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      {hasAnyAlert ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900 space-y-0.5">
            {campusAlerts.length > 0 && (
              <p>
                <span className="font-semibold">{campusAlerts.length} date{campusAlerts.length !== 1 ? "s" : ""}</span> would
                trigger a campus-level overlap alert ({campusThreshold}+ professors absent on the same day).
              </p>
            )}
            {deptAlerts.length > 0 && deptEnabled && (
              <p>
                <span className="font-semibold">{deptAlerts.length} date{deptAlerts.length !== 1 ? "s" : ""}</span> would
                trigger a department-level overlap alert ({deptThreshold}+ from same dept absent).
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          No overlap conflicts detected. Approving this request will not trigger any alerts.
        </div>
      )}

      {/* Per-date breakdown */}
      <div className="space-y-2">
        {conflicts.map((c) => {
          const hasCampus = c.campusAbsent.length > 0
          const hasDept = c.deptAbsent.length > 0 && deptEnabled
          const isClean = !c.campusAlert && !c.deptAlert

          return (
            <div
              key={c.date}
              className={`rounded-md border px-4 py-3 text-sm ${
                c.campusAlert || (c.deptAlert && deptEnabled)
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-border bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-medium min-w-[9rem]">
                  {format(parseDate(c.date), "EEE, MMM d, yyyy")}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {isClean && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> No conflicts
                    </span>
                  )}
                  {c.campusAlert && (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      Campus overlap ({c.campusAbsent.length + 1}/{campusThreshold}+)
                    </Badge>
                  )}
                  {c.deptAlert && deptEnabled && (
                    <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-500 text-white">
                      <AlertTriangle className="w-3 h-3" />
                      Dept overlap ({c.deptAbsent.length + 1}/{deptThreshold}+)
                    </Badge>
                  )}
                </div>
              </div>

              {(hasCampus || hasDept) && (
                <div className="mt-2 space-y-1.5">
                  {hasCampus && (
                    <div className="flex items-start gap-2">
                      <Building className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-muted-foreground shrink-0">
                          Also absent on {campusName}:
                        </span>
                        {c.campusAbsent.map((name) => (
                          <Badge key={name} variant="secondary" className="text-xs font-normal">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasDept && (
                    <div className="flex items-start gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs text-muted-foreground shrink-0">
                          Also absent from {deptName}:
                        </span>
                        {c.deptAbsent.map((name) => (
                          <Badge key={name} className="text-xs font-normal bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
