"use client"

import { useState, useTransition, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, X, CalendarCheck, Save, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, parseDate } from "@/lib/utils"
import { submitLeaveRequest } from "@/actions/leave"
import { toast } from "sonner"
import "react-day-picker/dist/style.css"

interface Holiday {
  iso: string
  label: string | null
}

interface Props {
  academicYearStart: Date
  academicYearEnd: Date
  holidays?: Holiday[]
  blockedDates?: Date[]
  approvedDates?: Date[]
  pendingDates?: Date[]
  onSuccess: () => void
  maxDays?: number
}

const DRAFT_KEY = "liu-leave-draft"

export function DateMultiPicker({
  academicYearStart,
  academicYearEnd,
  holidays = [],
  blockedDates = [],
  approvedDates = [],
  pendingDates = [],
  onSuccess,
  maxDays = 22,
}: Props) {
  const MAX_DAYS = maxDays
  const [selected, setSelected] = useState<Date[]>([])
  const [isPending, startTransition] = useTransition()
  const [justSaved, setJustSaved] = useState(false)

  const holidayDates = holidays.map((h) => parseDate(h.iso))

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const isos: string[] = JSON.parse(raw)
      const dates = isos
        .map((s) => new Date(s))
        .filter(
          (d) =>
            !isNaN(d.getTime()) &&
            d >= academicYearStart &&
            d <= academicYearEnd &&
            !holidayDates.some((h) => isSameDay(h, d)) &&
            !blockedDates.some((b) => isSameDay(b, d)) &&
            !approvedDates.some((a) => isSameDay(a, d)) &&
            !pendingDates.some((p) => isSameDay(p, d))
        )
      if (dates.length > 0) setSelected(dates)
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(selected.map((d) => d.toISOString())))
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  const remaining = MAX_DAYS - selected.length

  const handleSelect = (days: Date[] | undefined) => {
    if (!days) {
      setSelected([])
      return
    }
    if (days.length > MAX_DAYS) {
      toast.warning(`You can select a maximum of ${MAX_DAYS} days.`)
      return
    }
    setSelected(days)
  }

  const removeDate = (date: Date) => {
    setSelected((prev) => prev.filter((d) => !isSameDay(d, date)))
  }

  const handleSubmit = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one date.")
      return
    }

    startTransition(async () => {
      const result = await submitLeaveRequest(
        selected.map((d) => format(d, "yyyy-MM-dd"))
      )
      if (result?.error) {
        toast.error(result.error)
        return
      }
      localStorage.removeItem(DRAFT_KEY)
      setSelected([])
      toast.success("Leave request submitted successfully.")
      onSuccess()
    })
  }

  const sortedSelected = [...selected].sort((a, b) => a.getTime() - b.getTime())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={selected.length > 0 ? "default" : "secondary"} className="text-sm px-3 py-1">
            {selected.length} / {MAX_DAYS} days selected
          </Badge>
          {remaining > 0 && (
            <span className="text-sm text-muted-foreground">{remaining} remaining</span>
          )}
          {remaining === 0 && (
            <span className="text-sm text-amber-600 font-medium">Maximum reached</span>
          )}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveDraft}
              disabled={isPending}
              className={`text-xs gap-1 ${justSaved ? "text-green-600" : "text-muted-foreground"}`}
            >
              {justSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              {justSaved ? "Saved" : "Save draft"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              className="text-muted-foreground text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center overflow-x-auto">
        <DayPicker
          mode="multiple"
          selected={selected}
          onSelect={handleSelect}
          disabled={[
            { before: academicYearStart },
            { after: academicYearEnd },
            { dayOfWeek: [0, 6] },
            ...holidayDates,
            ...blockedDates,
            ...approvedDates,
            ...pendingDates,
            ...(remaining === 0
              ? [(date: Date) => !selected.some((d) => isSameDay(d, date))]
              : []),
          ]}
          modifiers={{
            holiday: holidayDates,
            weekend: { dayOfWeek: [0, 6] },
            blocked: blockedDates,
            approvedDay: approvedDates,
            pendingDay: pendingDates,
          }}
          modifiersStyles={{
            holiday:    { color: "#d97706", textDecoration: "line-through", opacity: 0.7 },
            weekend:    { opacity: 0.25 },
            blocked:    { color: "#9ca3af", textDecoration: "line-through", opacity: 0.5 },
            approvedDay: { backgroundColor: "#dcfce7", color: "#15803d", fontWeight: "600", opacity: 1, borderRadius: "0.5rem" },
            pendingDay:  { backgroundColor: "#fef9c3", color: "#a16207", fontWeight: "600", opacity: 1, borderRadius: "0.5rem" },
          }}
          numberOfMonths={2}
          pagedNavigation
          showOutsideDays={false}
          components={{
            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
            IconRight: () => <ChevronRight className="h-4 w-4" />,
          }}
          classNames={{
            months: "flex flex-wrap gap-8 justify-center",
            month: "space-y-3",
            caption: "flex justify-center pt-1 relative items-center mb-2",
            caption_label: "text-base font-semibold",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-8 w-8 bg-transparent p-0 border border-input rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "inline-flex items-center justify-center"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-11 font-medium text-xs text-center py-1.5",
            row: "flex w-full mt-1",
            cell: "h-11 w-11 text-center text-sm p-0 relative",
            day: cn(
              "h-11 w-11 p-0 font-normal rounded-lg text-sm",
              "hover:bg-accent hover:text-accent-foreground",
              "inline-flex items-center justify-center transition-colors",
              "aria-selected:opacity-100"
            ),
            day_selected: "bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-md ring-2 ring-blue-300",
            day_today: "ring-2 ring-primary/40 font-semibold",
            day_outside: "invisible",
            day_disabled: "text-muted-foreground opacity-25 cursor-not-allowed",
          }}
        />
      </div>

      {sortedSelected.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Selected dates</p>
            <div className="flex flex-wrap gap-2">
              {sortedSelected.map((date) => (
                <Badge
                  key={date.toISOString()}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {format(date, "MMM d, yyyy")}
                  <button
                    onClick={() => removeDate(date)}
                    className="ml-1 rounded-full hover:bg-background/50 p-0.5"
                    aria-label={`Remove ${format(date, "MMM d")}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {approvedDates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-200" />
            <span className="text-green-700 font-medium">Approved leave</span>
          </div>
        )}
        {pendingDates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-yellow-200" />
            <span className="text-yellow-700 font-medium">Pending review</span>
          </div>
        )}
        {holidays.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-medium text-amber-600">Holidays:</span>
            {holidays.map((h) => (
              <span key={h.iso} className="text-amber-600/80">
                {format(parseDate(h.iso), "MMM d")}{h.label ? ` — ${h.label}` : ""}
              </span>
            ))}
          </div>
        )}
        {blockedDates.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-300 opacity-70" />
            <span className="text-gray-500">Sep 16–30: Academic year closing period</span>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={selected.length === 0 || isPending}
        className="w-full gap-2"
        size="lg"
      >
        <CalendarCheck className="w-5 h-5" />
        {isPending ? "Submitting..." : `Submit ${selected.length > 0 ? `${selected.length} day${selected.length > 1 ? "s" : ""}` : "Leave Request"}`}
      </Button>
    </div>
  )
}
