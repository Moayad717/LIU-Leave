"use client"

import { useMemo, useState } from "react"
import {
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachDayOfInterval,
  format,
  getMonth,
} from "date-fns"
import { Pin, X } from "lucide-react"
import { parseDate } from "@/lib/utils"

interface Professor {
  id: string
  name: string
  campus: string
}

interface Props {
  availData: Record<string, number>
  onLeaveIds: Record<string, string[]>
  allProfessors: Professor[]
  totalProfessors: number
  startDate: Date
  endDate: Date
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getColor(available: number, total: number, highlighted: boolean, pinned: boolean) {
  const base =
    total === 0            ? "bg-gray-100"
    : available === total  ? "bg-green-600"
    : available / total >= 0.75 ? "bg-green-400"
    : available / total >= 0.5  ? "bg-yellow-300"
    : available / total >= 0.25 ? "bg-orange-400"
    : available > 0        ? "bg-red-400"
    : "bg-red-700"

  if (pinned)      return `${base} ring-2 ring-gray-900`
  if (highlighted) return `${base} ring-2 ring-offset-1 ring-gray-700`
  return base
}

function getTextColor(available: number, total: number) {
  if (total === 0 || available === total) return available === total ? "text-white" : "text-gray-400"
  const ratio = available / total
  if (ratio >= 0.5) return "text-gray-800"
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
  availData,
  onLeaveIds,
  allProfessors,
  totalProfessors,
  startDate,
  endDate,
}: Props) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [pinnedDay, setPinnedDay]   = useState<string | null>(null)

  const displayDay = pinnedDay ?? hoveredDay

  const onLeaveSet = useMemo(() => {
    return new Set(displayDay ? (onLeaveIds[displayDay] ?? []) : [])
  }, [displayDay, onLeaveIds])

  const onLeaveProfs    = useMemo(() => allProfessors.filter((p) => onLeaveSet.has(p.id)),  [allProfessors, onLeaveSet])
  const availableProfs  = useMemo(() => allProfessors.filter((p) => !onLeaveSet.has(p.id)), [allProfessors, onLeaveSet])
  const availByCampus   = useMemo(() => groupByCampus(availableProfs),  [availableProfs])
  const onLeaveByCampus = useMemo(() => groupByCampus(onLeaveProfs),    [onLeaveProfs])
  const allPresent      = displayDay ? onLeaveSet.size === 0 : false

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startDate, { weekStartsOn: 0 })
    const gridEnd   = endOfWeek(endDate, { weekStartsOn: 0 })
    return eachWeekOfInterval({ start: gridStart, end: gridEnd }, { weekStartsOn: 0 }).map((weekStart) =>
      eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) })
    )
  }, [startDate, endDate])

  const monthLabels = useMemo(() => {
    const labels: { month: string; colIndex: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, colIndex) => {
      const firstDayInRange = week.find((d) => d >= startDate && d <= endDate)
      if (!firstDayInRange) return
      const m = getMonth(firstDayInRange)
      if (m !== lastMonth) { labels.push({ month: MONTHS[m], colIndex }); lastMonth = m }
    })
    return labels
  }, [weeks, startDate, endDate])

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex mb-1 ml-8">
            {weeks.map((_, colIndex) => {
              const label = monthLabels.find((l) => l.colIndex === colIndex)
              return (
                <div key={colIndex} className="w-5 mr-0.5 text-xs text-muted-foreground">
                  {label ? label.month : ""}
                </div>
              )
            })}
          </div>

          <div className="flex gap-0">
            <div className="flex flex-col mr-1">
              {DAYS.map((day, i) => (
                <div key={day} className="h-5 mb-0.5 text-xs text-muted-foreground text-right pr-1 leading-5 w-7">
                  {i % 2 === 1 ? day.slice(0, 1) : ""}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5" onMouseLeave={() => setHoveredDay(null)}>
              {weeks.map((week, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-0.5">
                  {week.map((day) => {
                    const key           = format(day, "yyyy-MM-dd")
                    const isInRange     = day >= startDate && day <= endDate
                    const avail         = isInRange ? (availData[key] ?? totalProfessors) : 0
                    const isPinned      = pinnedDay === key
                    const isHighlighted = displayDay === key

                    return (
                      <div
                        key={key}
                        onMouseEnter={() => isInRange && setHoveredDay(key)}
                        onClick={() => { if (!isInRange) return; setPinnedDay(pinnedDay === key ? null : key) }}
                        className={`w-5 h-5 rounded-sm transition-all flex items-center justify-center ${
                          isInRange
                            ? `${getColor(avail, totalProfessors, isHighlighted, isPinned)} cursor-pointer`
                            : "bg-transparent"
                        }`}
                      >
                        {isInRange && (
                          <span className={`text-[9px] font-semibold leading-none ${getTextColor(avail, totalProfessors)}`}>
                            {day.getDate()}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 ml-8">
            <span className="text-xs text-muted-foreground">Low</span>
            {["bg-red-700", "bg-red-400", "bg-orange-400", "bg-yellow-300", "bg-green-400", "bg-green-600"].map((cls) => (
              <div key={cls} className={`w-5 h-5 rounded-sm ${cls}`} />
            ))}
            <span className="text-xs text-muted-foreground">Full</span>
            <span className="text-xs text-muted-foreground ml-2">
              {totalProfessors} professor{totalProfessors !== 1 ? "s" : ""} in scope
            </span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              Hover to preview · Click to pin
            </span>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="rounded-lg border bg-muted/40 p-4 min-h-[80px]">
        {displayDay ? (
          <>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  {pinnedDay && <Pin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <p className="font-semibold text-sm">{format(parseDate(displayDay), "EEEE, MMMM d, yyyy")}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {availableProfs.length} / {totalProfessors} available
                  {onLeaveProfs.length > 0 && ` · ${onLeaveProfs.length} on leave`}
                </p>
              </div>
              {pinnedDay && (
                <button
                  onClick={() => setPinnedDay(null)}
                  className="shrink-0 rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Unpin"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {allPresent ? (
              <p className="text-sm font-medium text-green-700">All professors available — full attendance.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Available */}
                <div>
                  <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-2">
                    Available ({availableProfs.length})
                  </p>
                  <div className="space-y-3">
                    {availByCampus.map(([campus, names]) => (
                      <div key={campus}>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          {campus}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {names.map((name) => (
                            <div key={name} className="rounded-md border bg-background px-2.5 py-1 text-sm font-medium">
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* On leave */}
                {onLeaveProfs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-2">
                      On leave ({onLeaveProfs.length})
                    </p>
                    <div className="space-y-3">
                      {onLeaveByCampus.map(([campus, names]) => (
                        <div key={campus}>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            {campus}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {names.map((name) => (
                              <div key={name} className="rounded-md border bg-background px-2.5 py-1 text-sm font-medium opacity-60">
                                {name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Hover over any day to preview · Click to pin the details.
          </p>
        )}
      </div>
    </div>
  )
}
