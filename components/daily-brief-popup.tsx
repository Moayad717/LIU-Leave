"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { format, parseISO, getDay } from "date-fns"
import { CalendarCheck, ArrowRight, ChevronRight, X, ChevronLeft, Coffee } from "lucide-react"

interface BriefData {
  total:       number
  onLeave:     number
  available:   number
  onLeaveList: { name: string; campus: string; department: string }[]
}

const todayISO = format(new Date(), "yyyy-MM-dd")

function isWeekendDate(iso: string) {
  const d = getDay(parseISO(iso))
  return d === 0 || d === 6
}

export function DailyBriefPopup() {
  const [open,       setOpen]   = useState(true)
  const [date,       setDate]   = useState(todayISO)
  const [data,       setData]   = useState<BriefData | null>(null)
  const [loading,    setLoading] = useState(false)

  const fetchBrief = useCallback(async (d: string) => {
    if (isWeekendDate(d)) { setData(null); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/daily-brief?date=${d}`)
      if (r.ok) setData(await r.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrief(date) }, [date, fetchBrief])

  const isWeekend = isWeekendDate(date)
  const isToday   = date === todayISO
  const dayLabel  = isToday
    ? "Today"
    : format(parseISO(date), "EEE, MMM d")

  return (
    <div
      className={[
        "fixed right-0 top-1/3 z-50 flex items-stretch transition-all duration-300 ease-in-out print:hidden",
        open ? "translate-x-0" : "translate-x-[calc(100%-2.25rem)]",
      ].join(" ")}
      style={{ maxHeight: "70vh" }}
    >
      {/* ── Collapse tab ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className={[
          "flex flex-col items-center justify-center gap-1 w-9 shrink-0 rounded-l-xl border border-r-0 shadow-md transition-colors",
          open
            ? "bg-white hover:bg-muted/60"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        ].join(" ")}
        title={open ? "Minimize" : "Daily Brief"}
        aria-label={open ? "Minimize daily brief" : "Open daily brief"}
      >
        {open ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <>
            <CalendarCheck className="w-4 h-4" />
            <span className="text-[10px] font-semibold [writing-mode:vertical-rl] rotate-180 tracking-wider">
              Daily
            </span>
            <ChevronLeft className="w-4 h-4" />
          </>
        )}
      </button>

      {/* ── Panel ────────────────────────────────────────────────────── */}
      <div className="w-72 flex flex-col rounded-l-none rounded-r-none border bg-white shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">Daily Brief</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 hover:bg-primary-foreground/10 transition-colors"
            aria-label="Minimize"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date picker */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
            Select date
          </label>
          <input
            type="date"
            value={date}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
          {!isToday && (
            <button
              onClick={() => setDate(todayISO)}
              className="text-xs text-primary hover:underline mt-1.5 block"
            >
              Back to today
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isWeekend ? (
            <div className="flex flex-col items-center text-center py-6 gap-2 text-muted-foreground">
              <Coffee className="w-6 h-6" />
              <p className="text-sm font-medium">Weekend</p>
              <p className="text-xs">No leave activity on {format(parseISO(date), "EEEE")}s.</p>
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
          ) : data ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-center">
                  <p className={`text-xl font-bold leading-none ${data.onLeave > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {data.onLeave}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">On leave</p>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-center">
                  <p className="text-xl font-bold leading-none text-green-600">{data.available}</p>
                  <p className="text-[11px] text-green-700 mt-1">Available</p>
                </div>
              </div>

              {/* On leave list */}
              {data.onLeaveList.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    On leave — {dayLabel}
                  </p>
                  <div className="space-y-1">
                    {data.onLeaveList.map((p) => (
                      <div key={p.name} className="flex items-baseline justify-between gap-2 text-xs py-1 border-b last:border-0">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-muted-foreground shrink-0">{p.campus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-green-700 font-medium">All professors available {isToday ? "today" : "on this day"}.</p>
              )}
            </>
          ) : null}
        </div>

        {/* Footer CTA */}
        <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
          <Link
            href={`/admin/daily-summary${date !== todayISO ? `?date=${date}` : ""}`}
            className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90 transition-colors"
          >
            View Full Summary
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
