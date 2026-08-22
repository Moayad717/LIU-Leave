"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { X, CalendarCheck, ArrowRight } from "lucide-react"

interface BriefData {
  total: number
  onLeave: number
  available: number
  onLeaveList: { name: string; campus: string; department: string }[]
}

export function DailyBriefPopup() {
  const [data, setData] = useState<BriefData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetch("/api/admin/daily-brief")
      .then((r) => r.ok ? r.json() : null)
      .then((d: BriefData | null) => {
        if (d) { setData(d); setVisible(true) }
      })
      .catch(() => {})
  }, [])

  if (!visible || !data) return null

  const today = format(new Date(), "EEEE, MMM d")

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border bg-background shadow-2xl ring-1 ring-border animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">Today's Brief</p>
            <p className="text-xs text-muted-foreground">{today}</p>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="shrink-0 rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">On leave</span>
          <span className={`font-semibold ${data.onLeave > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
            {data.onLeave} / {data.total}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Available</span>
          <span className="font-semibold text-green-600">{data.available} / {data.total}</span>
        </div>

        {data.onLeaveList.length > 0 && (
          <div className="mt-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1.5">On leave today:</p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {data.onLeaveList.slice(0, 5).map((p) => (
                <div key={p.name} className="text-xs flex items-baseline gap-1.5">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-muted-foreground shrink-0">{p.campus}</span>
                </div>
              ))}
              {data.onLeaveList.length > 5 && (
                <p className="text-xs text-muted-foreground">+{data.onLeaveList.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <Link
          href="/admin/daily-summary"
          onClick={() => setVisible(false)}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors"
        >
          View Full Summary
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
