"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface Campus { id: string; name: string }
interface Department { id: string; name: string }
interface Professor { id: string; name: string | null; email: string }

interface Props {
  campuses: Campus[]
  departments: Department[]
  professors: Professor[]
  year: number
  currentCampusId: string
  currentDepartmentId: string
  currentProfessorId: string
}

const selectCls =
  "h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"

export function CalendarExportFilter({
  campuses,
  departments,
  professors,
  year,
  currentCampusId,
  currentDepartmentId,
  currentProfessorId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function go(key: string, value: string) {
    const params = new URLSearchParams({ year: String(year) })
    // Preserve the other two filters
    if (currentCampusId)     params.set("campusId",     currentCampusId)
    if (currentDepartmentId) params.set("departmentId", currentDepartmentId)
    if (currentProfessorId)  params.set("professorId",  currentProfessorId)
    // Update or clear the one that changed
    if (value) params.set(key, value)
    else       params.delete(key)
    startTransition(() => {
      router.push(`/admin/stats/calendar-export?${params}`)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isPending && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
      <select
        value={currentCampusId}
        onChange={(e) => go("campusId", e.target.value)}
        disabled={isPending}
        className={selectCls}
      >
        <option value="">All campuses</option>
        {campuses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        value={currentDepartmentId}
        onChange={(e) => go("departmentId", e.target.value)}
        disabled={isPending}
        className={selectCls}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        value={currentProfessorId}
        onChange={(e) => go("professorId", e.target.value)}
        disabled={isPending}
        className={selectCls}
      >
        <option value="">All professors</option>
        {professors.map((p) => (
          <option key={p.id} value={p.id}>{p.name ?? p.email}</option>
        ))}
      </select>
    </div>
  )
}
