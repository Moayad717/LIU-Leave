"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toggleSubmissions, addHoliday, removeHoliday } from "@/actions/settings"
import { toast } from "sonner"
import { CalendarOff, Lock, Unlock, Trash2, Plus } from "lucide-react"

interface Holiday {
  id: string
  date: Date
  label: string | null
}

interface Props {
  submissionsOpen: boolean
  holidays: Holiday[]
}

export function SettingsPanel({ submissionsOpen: initialOpen, holidays: initialHolidays }: Props) {
  const [open, setOpen] = useState(initialOpen)
  const [holidays, setHolidays] = useState(initialHolidays)
  const [date, setDate] = useState("")
  const [label, setLabel] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleSubmissions()
      setOpen(result.submissionsOpen)
      toast.success(result.submissionsOpen ? "Submissions are now open." : "Submissions are now closed.")
    })
  }

  const handleAddHoliday = () => {
    if (!date) { toast.error("Please select a date."); return }
    startTransition(async () => {
      const result = await addHoliday(date, label)
      if (result?.error) { toast.error(result.error); return }
      setHolidays((prev) => [
        ...prev,
        { id: crypto.randomUUID(), date: new Date(date), label: label.trim() || null },
      ].sort((a, b) => a.date.getTime() - b.date.getTime()))
      setDate("")
      setLabel("")
      toast.success("Holiday added.")
    })
  }

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeHoliday(id)
      setHolidays((prev) => prev.filter((h) => h.id !== id))
      toast.success("Holiday removed.")
    })
  }

  return (
    <div className="space-y-6">
      {/* Submissions toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {open ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-500" />}
            Submissions
          </CardTitle>
          <CardDescription>
            When closed, professors cannot submit new leave requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${open ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm font-medium">
              Submissions are currently{" "}
              <span className={open ? "text-green-600" : "text-red-500"}>
                {open ? "open" : "closed"}
              </span>
            </span>
          </div>
          <Button
            variant={open ? "destructive" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
            className="gap-1.5"
          >
            {open ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {open ? "Close Submissions" : "Open Submissions"}
          </Button>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-500" />
            Holidays
          </CardTitle>
          <CardDescription>
            Professors cannot select these dates when submitting leave requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Add form */}
          <div className="flex flex-wrap gap-3 items-end rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-date">Date</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
                className="w-44"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-40">
              <Label htmlFor="holiday-label">
                Label <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="holiday-label"
                placeholder="e.g. Eid Al-Adha"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              onClick={handleAddHoliday}
              disabled={isPending || !date}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </Button>
          </div>

          {/* Holiday list */}
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No holidays configured.
            </p>
          ) : (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 font-normal">
                      {format(h.date, "EEE, MMM d, yyyy")}
                    </Badge>
                    {h.label && (
                      <span className="text-sm text-muted-foreground">{h.label}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(h.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
