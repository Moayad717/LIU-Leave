"use client"

import { AlertTriangle, CheckCircle2, Users, Building2, Info } from "lucide-react"
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
  const campusAlertDates = conflicts.filter((c) => c.campusAlert)
  const deptAlertDates   = conflicts.filter((c) => c.deptAlert && deptEnabled)
  const totalAlerts      = campusAlertDates.length + deptAlertDates.length
  const hasAnyAlert      = totalAlerts > 0

  return (
    <div className="space-y-5">

      {/* ── Summary banner ───────────────────────────────────────────── */}
      {hasAnyAlert ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-900 text-sm">Overlap warnings detected</p>
              <div className="space-y-1 text-sm text-amber-800">
                {campusAlertDates.length > 0 && (
                  <p>
                    <span className="font-semibold">{campusAlertDates.length} date{campusAlertDates.length !== 1 ? "s" : ""}</span>
                    {" "}will put {campusThreshold}+ professors absent on <span className="font-semibold">{campusName}</span> campus simultaneously.
                  </p>
                )}
                {deptAlertDates.length > 0 && (
                  <p>
                    <span className="font-semibold">{deptAlertDates.length} date{deptAlertDates.length !== 1 ? "s" : ""}</span>
                    {" "}will put {deptThreshold}+ professors absent from <span className="font-semibold">{deptName}</span> at the same time.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm">No conflicts</p>
              <p className="text-xs text-green-700 mt-0.5">Approving this request won't cause any overlap alerts.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-date breakdown ───────────────────────────────────────── */}
      <div className="space-y-2">
        {conflicts.map((c) => {
          const hasCampus  = c.campusAbsent.length > 0
          const hasDept    = c.deptAbsent.length > 0 && deptEnabled
          const campusAlert = c.campusAlert
          const deptAlert  = c.deptAlert && deptEnabled
          const isClean    = !campusAlert && !deptAlert

          // Severity determines left border color
          const borderColor = campusAlert || deptAlert
            ? "border-l-amber-400"
            : "border-l-green-400"

          // Total absent on campus = already out + this professor
          const campusTotal = c.campusAbsent.length + 1
          const deptTotal   = c.deptAbsent.length + 1

          return (
            <div
              key={c.date}
              className={`rounded-lg border border-l-4 bg-card ${borderColor} overflow-hidden`}
            >
              {/* Date row */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                <p className="text-sm font-semibold tabular-nums">
                  {format(parseDate(c.date), "EEE, MMM d, yyyy")}
                </p>

                {isClean ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Clear
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {campusAlert && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <Building2 className="w-3 h-3" />
                        {campusTotal} absent on campus · limit {campusThreshold}
                      </span>
                    )}
                    {deptAlert && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                        <Users className="w-3 h-3" />
                        {deptTotal} absent from dept · limit {deptThreshold}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* "Also absent" details */}
              {(hasCampus || hasDept) && (
                <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                  {hasCampus && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        Also absent on {campusName} campus
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.campusAbsent.map((name) => (
                          <span
                            key={name}
                            className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasDept && (
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        Also absent from {deptName}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.deptAbsent.map((name) => (
                          <span
                            key={name}
                            className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-900"
                          >
                            {name}
                          </span>
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

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Counts include this professor. Campus limit is {campusThreshold}+ absences; department limit is {deptThreshold}+.
          These are warnings only — approving is still possible.
        </p>
      </div>
    </div>
  )
}
