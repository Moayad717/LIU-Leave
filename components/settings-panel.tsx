"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toggleSubmissions, addHoliday, removeHoliday, updateSettings } from "@/actions/settings"
import { toast } from "sonner"
import { CalendarOff, Lock, Unlock, Trash2, Plus, SlidersHorizontal } from "lucide-react"

interface Holiday {
  id: string
  date: Date
  label: string | null
}

interface Props {
  submissionsOpen: boolean
  holidays: Holiday[]
  maxLeaveDays: number
  campusOverlapThreshold: number
  deptOverlapEnabled: boolean
  deptOverlapThreshold: number
}

export function SettingsPanel({
  submissionsOpen: initialOpen,
  holidays: initialHolidays,
  maxLeaveDays: initialMaxDays,
  campusOverlapThreshold: initialCampusThreshold,
  deptOverlapEnabled: initialDeptEnabled,
  deptOverlapThreshold: initialDeptThreshold,
}: Props) {
  const [open, setOpen] = useState(initialOpen)
  const [holidays, setHolidays] = useState(initialHolidays)
  const [date, setDate] = useState("")
  const [label, setLabel] = useState("")
  const [maxDays, setMaxDays] = useState(String(initialMaxDays))
  const [campusThreshold, setCampusThreshold] = useState(String(initialCampusThreshold))
  const [deptEnabled, setDeptEnabled] = useState(initialDeptEnabled)
  const [deptThreshold, setDeptThreshold] = useState(String(initialDeptThreshold))
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

  const handleSaveThresholds = () => {
    const parsedMaxDays = parseInt(maxDays)
    const parsedCampus = parseInt(campusThreshold)
    const parsedDept = parseInt(deptThreshold)

    if (isNaN(parsedMaxDays) || parsedMaxDays < 1 || parsedMaxDays > 60) {
      toast.error("Max leave days must be between 1 and 60.")
      return
    }
    if (isNaN(parsedCampus) || parsedCampus < 2 || parsedCampus > 20) {
      toast.error("Campus overlap threshold must be between 2 and 20.")
      return
    }
    if (isNaN(parsedDept) || parsedDept < 2 || parsedDept > 20) {
      toast.error("Department overlap threshold must be between 2 and 20.")
      return
    }

    startTransition(async () => {
      const result = await updateSettings({
        maxLeaveDays: parsedMaxDays,
        campusOverlapThreshold: parsedCampus,
        deptOverlapEnabled: deptEnabled,
        deptOverlapThreshold: parsedDept,
      })
      if (result?.success) toast.success("Settings saved.")
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {open ? <Unlock className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-red-500" />}
            Submissions
          </CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            Thresholds &amp; Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="max-days">Max Leave Days per Professor</Label>
              <Input
                id="max-days"
                type="number"
                min={1}
                max={60}
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campus-threshold">Campus Overlap Alert (≥)</Label>
              <Input
                id="campus-threshold"
                type="number"
                min={2}
                max={20}
                value={campusThreshold}
                onChange={(e) => setCampusThreshold(e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="dept-threshold">Dept. Overlap Alert (≥)</Label>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="dept-overlap-toggle"
                    checked={deptEnabled}
                    onCheckedChange={setDeptEnabled}
                    disabled={isPending}
                  />
                  <span className="text-xs text-muted-foreground">{deptEnabled ? "On" : "Off"}</span>
                </div>
              </div>
              <Input
                id="dept-threshold"
                type="number"
                min={2}
                max={20}
                value={deptThreshold}
                onChange={(e) => setDeptThreshold(e.target.value)}
                disabled={isPending || !deptEnabled}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveThresholds} disabled={isPending} size="sm">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-500" />
            Holidays
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
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
