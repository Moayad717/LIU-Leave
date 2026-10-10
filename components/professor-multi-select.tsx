"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getRoleLabel } from "@/types/enums"

export interface ProfessorOption {
  id: string
  name: string | null
  email: string
  role: string
}

interface Props {
  professors: ProfessorOption[]
  selectedIds: Set<string>
  onChange: (ids: Set<string>) => void
  disabled?: boolean
}

export function ProfessorMultiSelect({ professors, selectedIds, onChange, disabled }: Props) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return professors
    return professors.filter(
      (p) => (p.name ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }, [professors, query])

  const toggle = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="gap-1.5 justify-between w-full sm:w-64 font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            {selectedIds.size === 0
              ? "Select professors…"
              : `${selectedIds.size} professor${selectedIds.size !== 1 ? "s" : ""} selected`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No professors found.</p>
          ) : (
            filtered.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.id}
                checked={selectedIds.has(p.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggle(p.id)}
                className="flex-col items-start gap-0"
              >
                <span className="text-sm leading-tight">{p.name || p.email}</span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {p.email} · {getRoleLabel(p.role)}
                </span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
