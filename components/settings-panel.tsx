"use client"

import { useState, useTransition, useRef } from "react"
import { format } from "date-fns"
import { parseDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toggleSubmissions, addHoliday, removeHoliday, updateSettings, resetDatabase, bulkAddHolidays } from "@/actions/settings"
import { toast } from "sonner"
import { CalendarOff, Lock, Unlock, Trash2, Plus, SlidersHorizontal, AlertTriangle, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ParsedEntry {
  dateStr: string
  label: string
}

const MONTHS: Record<string, number> = {
  january: 0, janurary: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7, september: 8,
  october: 9, november: 10, december: 11,
}

function parseLIUCalendarCSV(text: string): ParsedEntry[] {
  // Find a consecutive academic year pair like "2025-2026" (second = first + 1)
  const allYearMatches = Array.from(text.matchAll(/(\d{4})-(\d{4})/g))
  const academicMatch = allYearMatches.find((m) => parseInt(m[2]) === parseInt(m[1]) + 1)
  const startYear = academicMatch ? parseInt(academicMatch[1]) : new Date().getFullYear()

  const getYear = (month: number) => month >= 8 ? startYear : startYear + 1

  const pad = (n: number) => String(n).padStart(2, "0")
  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${pad(month + 1)}-${pad(day)}`

  const results: ParsedEntry[] = []

  // Patterns ordered most-specific first
  const crossRange = /^([A-Za-z]+)\s+(\d+)-([A-Za-z]+)\s+(\d+)[:\s]+(.+)$/
  const sameRange  = /^([A-Za-z]+)\s+(\d+)-(\d+)[:\s]+(.+)$/
  const single     = /^([A-Za-z]+)\s+(\d+)[:\s]+(.+)$/

  const cells = text.split(/\r?\n/).flatMap((line) => line.split(",").map((c) => c.trim()))

  for (const cell of cells) {
    if (!cell) continue

    let m = cell.match(crossRange)
    if (m) {
      const month1 = MONTHS[m[1].toLowerCase()]
      const month2 = MONTHS[m[3].toLowerCase()]
      const label = m[5].trim()
      if (month1 !== undefined && month2 !== undefined && label) {
        let cur = new Date(getYear(month1), month1, parseInt(m[2]))
        const end = new Date(getYear(month2), month2, parseInt(m[4]))
        while (cur <= end) {
          results.push({ dateStr: toDateStr(cur.getFullYear(), cur.getMonth(), cur.getDate()), label })
          cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1)
        }
        continue
      }
    }

    m = cell.match(sameRange)
    if (m) {
      const month = MONTHS[m[1].toLowerCase()]
      const label = m[4].trim()
      if (month !== undefined && label) {
        const year = getYear(month)
        for (let d = parseInt(m[2]); d <= parseInt(m[3]); d++) {
          results.push({ dateStr: toDateStr(year, month, d), label })
        }
        continue
      }
    }

    m = cell.match(single)
    if (m) {
      const month = MONTHS[m[1].toLowerCase()]
      const label = m[3].trim()
      if (month !== undefined && label) {
        results.push({ dateStr: toDateStr(getYear(month), month, parseInt(m[2])), label })
      }
    }
  }

  // Deduplicate by dateStr
  const seen = new Set<string>()
  return results.filter(({ dateStr }) => {
    if (seen.has(dateStr)) return false
    seen.add(dateStr)
    return true
  }).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
}

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

  const [importOpen, setImportOpen] = useState(false)
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const entries = parseLIUCalendarCSV(text)
      if (entries.length === 0) { toast.error("No date entries found in the CSV."); return }
      setParsedEntries(entries)
      setSelected(new Set(entries.map((_, i) => i)))
      setImportOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleImport = () => {
    const toImport = parsedEntries.filter((_, i) => selected.has(i))
    startTransition(async () => {
      const result = await bulkAddHolidays(toImport.map((e) => ({ date: e.dateStr, label: e.label })))
      if ("error" in result) { toast.error(result.error); return }
      setHolidays((prev) =>
        [...prev, ...result.created].sort((a, b) => a.date.getTime() - b.date.getTime())
      )
      setImportOpen(false)
      toast.success(
        result.created.length === 0
          ? "All selected dates already exist."
          : `${result.created.length} holiday${result.created.length !== 1 ? "s" : ""} imported.`
      )
    })
  }

  const toggleEntry = (i: number) =>
    setSelected((prev) => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleSubmissions()
      if ("error" in result) { toast.error(result.error); return }
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
            <div className="h-px w-full sm:w-px sm:h-8 bg-border" />
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import from CSV
            </Button>
          </div>

          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Holidays from CSV</DialogTitle>
                <DialogDescription>
                  Found {parsedEntries.length} date entries. Uncheck any you don&apos;t want to import.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <button
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setSelected(new Set(parsedEntries.map((_, i) => i)))}
                >
                  Select all
                </button>
                <span>·</span>
                <button
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setSelected(new Set())}
                >
                  Deselect all
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
                {parsedEntries.map((entry, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleEntry(i)}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">{entry.dateStr}</span>
                    <span className="text-sm">{entry.label}</span>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={isPending || selected.size === 0}>
                  Import {selected.size} Holiday{selected.size !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                      {format(parseDate(h.date), "EEE, MMM d, yyyy")}
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

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Reset Database</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes all users and leave requests. Campuses, departments, and settings are kept.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isPending}>
                Reset Database
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently delete all users and leave requests. This action cannot be undone.
                  Campuses, departments, and app settings will not be affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await resetDatabase()
                      toast.success("Database reset. All users and leave requests deleted.")
                    })
                  }}
                >
                  Yes, reset everything
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
