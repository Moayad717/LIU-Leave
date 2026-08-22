"use client"

import { useMemo, useState } from "react"
import {
  startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval,
  format, getMonth, isWeekend,
} from "date-fns"
import { Pin, X } from "lucide-react"
import { parseDate } from "@/lib/utils"

interface Professor { id: string; name: string; campus: string }

interface Props {
  availData:       Record<string, number>
  onLeaveIds:      Record<string, string[]>
  allProfessors:   Professor[]
  totalProfessors: number
  startDate:       Date
  endDate:         Date
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const TODAY      = format(new Date(), "yyyy-MM-dd")

function cellColor(available: number, total: number) {
  if (total === 0)                    return "bg-slate-100 dark:bg-slate-800"
  if (available === total)            return "bg-emerald-600"
  const r = available / total
  if (r >= 0.75)                      return "bg-emerald-400"
  if (r >= 0.5)                       return "bg-yellow-300"
  if (r >= 0.25)                      return "bg-orange-400"
  if (available > 0)                  return "bg-red-400"
  return "bg-red-700"
}

function textColor(available: number, total: number) {
  if (total === 0)         return "text-slate-400"
  if (available === total) return "text-white"
  const r = available / total
  if (r >= 0.5)            return "text-gray-800"
  return "text-white"
}

function groupByCampus(profs: Professor[]): [string, string[]][] {
  const map: Record<string, string[]> = {}
  for (const p of profs) {
    const c = p.campus || "Unknown"
    if (!map[c]) map[c] = []
    map[c].push(p.name)
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

export function AvailabilityHeatmap({
  availData, onLeaveIds, allProfessors, totalProfessors, startDate, endDate,
}: Props) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [pinnedDay,  setPinnedDay]  = useState<string | null>(null)

  const displayDay = pinnedDay ?? hoveredDay

  const onLeaveSet = useMemo(
    () => new Set(displayDay ? (onLeaveIds[displayDay] ?? []) : []),
    [displayDay, onLeaveIds]
  )
  const availableProfs = useMemo(() => allProfessors.filter((p) => !onLeaveSet.has(p.id)), [allProfessors, onLeaveSet])
  const availByCampus  = useMemo(() => groupByCampus(availableProfs), [availableProfs])
  const allPresent     = displayDay ? onLeaveSet.size === 0 : false

  const weeks = useMemo(() => {
    const s = startOfWeek(startDate, { weekStartsOn: 0 })
    const e = endOfWeek(endDate, { weekStartsOn: 0 })
    return eachWeekOfInterval({ start: s, end: e }, { weekStartsOn: 0 }).map((ws) =>
      eachDayOfInterval({ start: ws, end: endOfWeek(ws, { weekStartsOn: 0 }) })
    )
  }, [startDate, endDate])

  const weekMonths = useMemo(() => {
    const labels: (string | null)[] = []
    let lastMonth = -1
    for (const week of weeks) {
      const first = week.find((d) => d >= startDate && d <= endDate)
      if (!first) { labels.push(null); continue }
      const m = getMonth(first)
      if (m !== lastMonth) { labels.push(MONTHS[m]); lastMonth = m }
      else labels.push(null)
    }
    return labels
  }, [weeks, startDate, endDate])

  return (
    <div className="flex gap-6">
      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto shrink-0">
        {/* Day column headers */}
        <div className="flex mb-2 ml-10">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className={`w-9 text-center text-[11px] font-medium ${
                d === "Sun" || d === "Sat" ? "text-muted-foreground/60" : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div onMouseLeave={() => setHoveredDay(null)}>
          {weeks.map((week, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-0 mb-0.5">
              <div className="w-10 shrink-0 text-[11px] font-semibold text-muted-foreground text-right pr-2 select-none">
                {weekMonths[rowIdx] ?? ""}
              </div>
              {week.map((day) => {
                const key       = format(day, "yyyy-MM-dd")
                const isInRange = day >= startDate && day <= endDate
                const avail     = isInRange ? (availData[key] ?? totalProfessors) : 0
                const isToday   = key === TODAY
                const isPinned  = pinnedDay === key
                const isHovered = displayDay === key
                const weekend   = isWeekend(day)

                return (
                  <div
                    key={key}
                    onMouseEnter={() => isInRange && setHoveredDay(key)}
                    onClick={() => { if (!isInRange) return; setPinnedDay(pinnedDay === key ? null : key) }}
                    title={isInRange ? format(day, "MMM d") : undefined}
                    className={[
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all select-none",
                      isInRange ? "cursor-pointer" : "opacity-0 pointer-events-none",
                      isInRange ? cellColor(avail, totalProfessors) : "",
                      isPinned ? "ring-2 ring-gray-800 ring-offset-1" : "",
                      isHovered && !isPinned ? "ring-2 ring-emerald-500 ring-offset-1" : "",
                      isToday && isInRange ? "outline outline-2 outline-offset-1 outline-primary" : "",
                    ].join(" ")}
                  >
                    {isInRange && (
                      <span className={`text-[11px] font-semibold leading-none ${textColor(avail, totalProfessors)}`}>
                        {day.getDate()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 ml-10 flex-wrap">
          <span className="text-xs text-muted-foreground">Low</span>
          {["bg-red-700","bg-red-400","bg-orange-400","bg-yellow-300","bg-emerald-400","bg-emerald-600"].map((cls) => (
            <div key={cls} className={`w-4 h-4 rounded-sm ${cls}`} />
          ))}
          <span className="text-xs text-muted-foreground">Full</span>
          <span className="text-xs text-muted-foreground ml-2">
            {totalProfessors} professor{totalProfessors !== 1 ? "s" : ""} in scope
          </span>
          <span className="text-xs text-muted-foreground ml-3 hidden sm:inline">
            Hover to preview · Click to pin
          </span>
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 rounded-xl border bg-card p-4 self-start sticky top-24">
        {displayDay ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  {pinnedDay && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
                  <p className="text-sm font-semibold leading-tight">
                    {format(parseDate(displayDay), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {availableProfs.length} / {totalProfessors} available
                </p>
              </div>
              {pinnedDay && (
                <button
                  onClick={() => setPinnedDay(null)}
                  className="shrink-0 rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {allPresent ? (
              <p className="text-sm font-medium text-emerald-700">All professors available — full attendance.</p>
            ) : (
              <div className="space-y-2">
                {availByCampus.map(([campus, names]) => (
                  <div key={campus}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {campus}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {names.map((n) => (
                        <span key={n} className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <Pin className="w-4 h-4" />
            </div>
            <p className="text-xs">Hover a day to preview<br />Click to pin details</p>
          </div>
        )}
      </div>
    </div>
  )
}
