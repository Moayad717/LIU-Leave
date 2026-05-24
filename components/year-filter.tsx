"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  availableYears: number[]
  currentStartYear: number
  basePath: string
}

export function YearFilter({ availableYears, currentStartYear, basePath }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const selected = params.get("year") ?? String(currentStartYear)

  const update = (year: string) => {
    const next = new URLSearchParams(params.toString())
    next.set("year", year)
    router.push(`${basePath}?${next.toString()}`)
  }

  return (
    <Select value={selected} onValueChange={update}>
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
  )
}
