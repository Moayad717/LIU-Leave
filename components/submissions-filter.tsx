"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Loader2 } from "lucide-react"

interface Campus {
  id: string
  name: string
}

interface Props {
  campuses: Campus[]
  availableYears: number[]
  currentStartYear: number
}

const STATUS_OPTIONS = [
  { value: "PENDING",        label: "Awaiting Asst. Dean" },
  { value: "STEP1_APPROVED", label: "Awaiting Chairman" },
  { value: "STEP1_REJECTED", label: "Rejected (Step 1)" },
  { value: "STEP2_APPROVED", label: "Awaiting Dean" },
  { value: "STEP2_REJECTED", label: "Rejected (Step 2)" },
  { value: "APPROVED",       label: "Approved" },
  { value: "REJECTED",       label: "Rejected" },
]

export function SubmissionsFilter({ campuses, availableYears, currentStartYear }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const campus = params.get("campus") ?? ""
  const status = params.get("status") ?? ""
  const year = params.get("year") ?? String(currentStartYear)
  const [search, setSearch] = useState(params.get("search") ?? "")

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.push(`/admin/submissions?${next.toString()}`)
    })
  }

  useEffect(() => {
    const timer = setTimeout(() => update("search", search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const clear = () => {
    setSearch("")
    startTransition(() => {
      router.push(`/admin/submissions?year=${currentStartYear}`)
    })
  }

  const hasFilters = !!campus || !!status || !!search || year !== String(currentStartYear)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={year} onValueChange={(v) => update("year", v)} disabled={isPending}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}–{y + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search professor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 w-52"
          disabled={isPending}
        />
      </div>

      {campuses.length > 0 && (
        <Select value={campus} onValueChange={(v) => update("campus", v === "all" ? "" : v)} disabled={isPending}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All campuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campuses</SelectItem>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={status} onValueChange={(v) => update("status", v === "all" ? "" : v)} disabled={isPending}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}

      {!isPending && hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1 text-muted-foreground">
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
