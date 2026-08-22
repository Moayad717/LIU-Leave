"use client"

import { useMemo, useState } from "react"
import {
  startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval,
  format, getMonth, isWeekend,
} from "date-fns"
import { Pin, X } from "lucide-react"
import { parseDate } from "@/lib/utils"

interface ProfOnLeave { name: string; campus: string }

interface Props {
  data:      Record<string, number>
  details:   Record<string, ProfOnLeave[]>
  startDate: Date
  endDate:   Date
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const TODAY      = format(new Date(), "yyyy-MM-dd")

function cellColor(count: number) {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800"
  if (count === 1) return "bg-blue-200"
  if (count === 2) return "bg-blue-400"
  if (count === 3) return "bg-blue-500"
  return "bg-blue-700"
}

function textColor(count: number) {
  if (count === 0) return "text-slate-400"
  if (count <= 1)  return "text-blue-900"
  return "text-white"
}

export function CalendarHeatmap({ data, details, startDate, endDate }: Props) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [pinnedDay,  setPinnedDay]  = useState<string | null>(null)

  const displayDay   = pinnedDay ?? hoveredDay
  const displayProfs = displayDay ? (details[displayDay] ?? []) : []

  const displayIsWeekend = displayDay ? isWeekend(parseDate(displayDay)) : false

  const campusGroups = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const p of displayProfs) {
      const c = p.campus || "Unknown"
      if (!map[c]) map[c] = []
      map[c].push(p.name)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [displayProfs])

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

  const maxCount = Math.max(0, ...Object.values(data))

  return (
    <div className="flex gap-6">
      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto shrink-0">
        {/* Day column headers */}
        <div className="flex mb-2 ml-12">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className={`w-12 text-center text-[11px] font-medium ${
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
              {/* Month label */}
              <div className="w-12 shrink-0 text-[11px] font-semibold text-muted-foreground text-right pr-2 select-none">
                {weekMonths[rowIdx] ?? ""}
              </div>

              {/* Day cells */}
              {week.map((day) => {
                const key        = format(day, "yyyy-MM-dd")
                const isInRange  = day >= startDate && day <= endDate
                const count      = isInRange ? (data[key] ?? 0) : 0
                const isToday    = key === TODAY
                const isPinned   = pinnedDay === key
                const isHovered  = displayDay === key

                return (
                  <div
                    key={key}
                    onMouseEnter={() => isInRange && setHoveredDay(key)}
                    onClick={() => { if (!isInRange) return; setPinnedDay(pinnedDay === key ? null : key) }}
                    title={isInRange ? format(day, "MMM d") : undefined}
                    className={[
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all select-none",
                      isInRange ? "cursor-pointer" : "opacity-0 pointer-events-none",
                      isInRange ? cellColor(count) : "",
                      isPinned    ? "ring-2 ring-gray-800 ring-offset-1" : "",
                      isHovered && !isPinned ? "ring-2 ring-blue-400 ring-offset-1" : "",
                      isToday && isInRange  ? "outline outline-2 outline-offset-1 outline-primary" : "",
                    ].join(" ")}
                  >
                    {isInRange && (
                      <span className={`text-xs font-semibold leading-none ${textColor(count)}`}>
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
        <div className="flex items-center gap-1.5 mt-3 ml-12">
          <span className="text-xs text-muted-foreground">None</span>
          {[0, 1, 2, 3, 4].map((v) => (
            <div key={v} className={`w-4 h-4 rounded-sm ${cellColor(v)}`} />
          ))}
          <span className="text-xs text-muted-foreground">Many</span>
          {maxCount > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              Peak: {maxCount} on leave
            </span>
          )}
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
                  {displayIsWeekend
                    ? "Weekend"
                    : displayProfs.length === 0
                    ? "No approved leave on this day"
                    : `${displayProfs.length} person${displayProfs.length !== 1 ? "s" : ""} on approved leave`}
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

            {displayIsWeekend ? (
              <p className="text-sm text-muted-foreground">No classes scheduled on weekends.</p>
            ) : displayProfs.length > 0 ? (
              <div className="space-y-3">
                {campusGroups.map(([campus, names]) => (
                  <div key={campus}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {campus}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {names.map((name) => (
                        <span key={name} className="rounded-md border bg-background px-2 py-0.5 text-xs font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All faculty available.</p>
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
