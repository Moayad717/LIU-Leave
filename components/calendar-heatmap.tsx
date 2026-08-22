"use client"

import { useMemo, useState } from "react"
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  getMonth,
} from "date-fns"
import { Pin, X } from "lucide-react"
import { parseDate } from "@/lib/utils"

interface ProfOnLeave {
  name: string
  campus: string
}

interface Props {
  data: Record<string, number>
  details: Record<string, ProfOnLeave[]>
  startDate: Date
  endDate: Date
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getColor(count: number, highlighted: boolean, pinned: boolean) {
  const base =
    count === 0 ? "bg-gray-100"
    : count === 1 ? "bg-blue-200"
    : count === 2 ? "bg-blue-400"
    : count === 3 ? "bg-blue-500"
    : "bg-blue-700"

  if (pinned)      return `${base} ring-2 ring-gray-900`
  if (highlighted) return `${base} ring-2 ring-offset-1 ring-blue-900`
  return base
}

function getTextColor(count: number) {
  if (count === 0) return "text-gray-400"
  if (count === 1) return "text-blue-900"
  return "text-white"
}

export function CalendarHeatmap({ data, details, startDate, endDate }: Props) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [pinnedDay, setPinnedDay]   = useState<string | null>(null)

  const displayDay  = pinnedDay ?? hoveredDay
  const displayProfs = displayDay ? (details[displayDay] ?? []) : []

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

  const maxCount = Math.max(0, ...Object.values(data))

  // Group display profs by campus
  const campusGroups = displayProfs.reduce<Record<string, string[]>>((acc, p) => {
    const c = p.campus || "Unknown"
    if (!acc[c]) acc[c] = []
    acc[c].push(p.name)
    return acc
  }, {})
  const sortedCampuses = Object.keys(campusGroups).sort()

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
                    const key        = format(day, "yyyy-MM-dd")
                    const isInRange  = day >= startDate && day <= endDate
                    const count      = isInRange ? (data[key] ?? 0) : 0
                    const isPinned   = pinnedDay === key
                    const isHighlighted = displayDay === key

                    return (
                      <div
                        key={key}
                        onMouseEnter={() => isInRange && setHoveredDay(key)}
                        onClick={() => { if (!isInRange) return; setPinnedDay(pinnedDay === key ? null : key) }}
                        className={`w-5 h-5 rounded-sm transition-all flex items-center justify-center ${
                          isInRange
                            ? `${getColor(count, isHighlighted, isPinned)} cursor-pointer`
                            : "bg-transparent"
                        }`}
                      >
                        {isInRange && (
                          <span className={`text-[9px] font-semibold leading-none ${getTextColor(count)}`}>
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

          <div className="flex items-center gap-1.5 mt-3 ml-8">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map((v) => (
              <div key={v} className={`w-5 h-5 rounded-sm ${getColor(v, false, false)}`} />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
            {maxCount > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                Peak: {maxCount} professor{maxCount !== 1 ? "s" : ""} on one day
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-4 hidden sm:inline">
              Hover to preview · Click to pin
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 min-h-[80px]">
        {displayDay ? (
          <>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  {pinnedDay && <Pin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <p className="font-semibold text-sm">
                    {format(parseDate(displayDay), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {displayProfs.length === 0
                    ? "No approved leave"
                    : `${displayProfs.length} professor${displayProfs.length !== 1 ? "s" : ""} on approved leave`}
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

            {displayProfs.length > 0 ? (
              <div className="space-y-3">
                {sortedCampuses.map((campus) => (
                  <div key={campus}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {campus}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {campusGroups[campus].map((name) => (
                        <div
                          key={name}
                          className="rounded-md border bg-background px-2.5 py-1 text-sm font-medium"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">All professors are available on this day.</p>
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
