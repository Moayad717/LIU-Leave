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
import { X } from "lucide-react"

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

function getColor(count: number, selected: boolean) {
  const base =
    count === 0 ? "bg-gray-100"
    : count === 1 ? "bg-blue-200"
    : count === 2 ? "bg-blue-400"
    : count === 3 ? "bg-blue-500"
    : "bg-blue-700"

  return selected ? `${base} ring-2 ring-offset-1 ring-blue-900` : base
}

export function CalendarHeatmap({ data, details, startDate, endDate }: Props) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(startDate, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(endDate, { weekStartsOn: 0 })

    return eachWeekOfInterval(
      { start: gridStart, end: gridEnd },
      { weekStartsOn: 0 }
    ).map((weekStart) =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 0 }),
      })
    )
  }, [startDate, endDate])

  const monthLabels = useMemo(() => {
    const labels: { month: string; colIndex: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, colIndex) => {
      const firstDayInRange = week.find((d) => d >= startDate && d <= endDate)
      if (!firstDayInRange) return
      const m = getMonth(firstDayInRange)
      if (m !== lastMonth) {
        labels.push({ month: MONTHS[m], colIndex })
        lastMonth = m
      }
    })
    return labels
  }, [weeks, startDate, endDate])

  const maxCount = Math.max(0, ...Object.values(data))
  const selectedProfs = selectedDay ? (details[selectedDay] ?? []) : []

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex mb-1 ml-8">
            {weeks.map((_, colIndex) => {
              const label = monthLabels.find((l) => l.colIndex === colIndex)
              return (
                <div key={colIndex} className="w-4 mr-0.5 text-xs text-muted-foreground">
                  {label ? label.month : ""}
                </div>
              )
            })}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col mr-1">
              {DAYS.map((day, i) => (
                <div key={day} className="h-4 mb-0.5 text-xs text-muted-foreground text-right pr-1 leading-4 w-7">
                  {i % 2 === 1 ? day.slice(0, 1) : ""}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex gap-0.5">
              {weeks.map((week, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-0.5">
                  {week.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const isInRange = day >= startDate && day <= endDate
                    const count = isInRange ? (data[key] ?? 0) : 0
                    const isSelected = selectedDay === key

                    return (
                      <div
                        key={key}
                        title={isInRange ? `${format(day, "MMM d, yyyy")}: ${count} professor${count !== 1 ? "s" : ""}` : undefined}
                        onClick={() => isInRange && setSelectedDay(isSelected ? null : key)}
                        className={`w-4 h-4 rounded-sm transition-all ${
                          isInRange
                            ? `${getColor(count, isSelected)} cursor-pointer hover:opacity-80`
                            : "bg-transparent"
                        }`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 ml-8">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map((v) => (
              <div key={v} className={`w-4 h-4 rounded-sm ${getColor(v, false)}`} />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
            {maxCount > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                Peak: {maxCount} professor{maxCount !== 1 ? "s" : ""} on one day
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay ? (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">
                {format(new Date(selectedDay), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedProfs.length === 0
                  ? "No approved leave"
                  : `${selectedProfs.length} professor${selectedProfs.length !== 1 ? "s" : ""} on approved leave`}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedProfs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedProfs.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground text-xs">{p.campus}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All professors are available on this day.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground ml-8">
          Click any day to see who is on leave.
        </p>
      )}
    </div>
  )
}
