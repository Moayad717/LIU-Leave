import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canAccessAdmin, canApproveStep1, canApproveStep2, canBypassApproval } from "@/types/enums"
import { getAcademicYearFromStartYear, getCurrentAcademicYear, isBlockedDate } from "@/lib/academic-year"
import { format, getDaysInMonth, getDay, addMonths } from "date-fns"
import { PrintButton } from "./print-button"
import { CalendarExportFilter } from "@/components/calendar-export-filter"

interface Props {
  searchParams: { year?: string; campusId?: string; departmentId?: string; professorId?: string }
}

const DEPT_ABBREVS: Record<string, string> = {
  "computer and communication": "CCE",
  "electrical and electronics": "EEE",
  "mechanical": "MECH",
  "biomedical": "BME",
  "industrial": "IND",
  "surveying": "SURV",
}

function deptAbbrev(name: string | null | undefined): string {
  if (!name) return ""
  const key = name.toLowerCase().trim()
  for (const [pattern, abbr] of Object.entries(DEPT_ABBREVS)) {
    if (key.includes(pattern)) return abbr
  }
  return name.slice(0, 3).toUpperCase()
}

function formatProfName(fullName: string | null | undefined): string {
  return fullName?.trim() || "Unknown"
}

function mondayDow(date: Date): number {
  const d = getDay(date)
  return d === 0 ? 6 : d - 1
}

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default async function CalendarExportPage({ searchParams }: Props) {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const currentYear = getCurrentAcademicYear()
  const selectedStartYear = searchParams.year
    ? parseInt(searchParams.year)
    : currentYear.start.getFullYear()
  const { start, end, label } = getAcademicYearFromStartYear(selectedStartYear)

  const role = session.user.role

  // Role-based scope — always applied
  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }

  const canFilter = canBypassApproval(role)

  const [allRequests, holidays, campuses, departments] = await Promise.all([
    db.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        submittedAt: { gte: start, lte: end },
        ...(Object.keys(scopeFilter).length > 0 ? { professor: scopeFilter } : {}),
      },
      include: {
        professor: {
          include: {
            campus: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),
    db.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, label: true },
    }),
    canFilter ? db.campus.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    canFilter ? db.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ])

  // Derive unique professors who have approved leave this year (for the dropdown)
  const profMap = new Map<string, { id: string; name: string | null; email: string }>()
  for (const req of allRequests) {
    if (!profMap.has(req.professorId)) {
      profMap.set(req.professorId, {
        id: req.professorId,
        name: req.professor.name,
        email: req.professor.email,
      })
    }
  }
  const professors = Array.from(profMap.values()).sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email)
  )

  // Additional filter from searchParams (only for bypass-capable roles)
  const selectedCampusId = canFilter ? (searchParams.campusId ?? "") : ""
  const selectedDepartmentId = canFilter ? (searchParams.departmentId ?? "") : ""
  const selectedProfessorId = canFilter ? (searchParams.professorId ?? "") : ""

  // Filter requests in memory — all active filters applied together (AND)
  const requests = allRequests.filter((req) => {
    if (selectedCampusId     && req.professor.campusId     !== selectedCampusId)     return false
    if (selectedDepartmentId && req.professor.departmentId !== selectedDepartmentId) return false
    if (selectedProfessorId  && req.professorId            !== selectedProfessorId)  return false
    return true
  })

  // Build filter label from whichever filters are active
  const filterParts = [
    selectedCampusId     ? (campuses.find((c) => c.id === selectedCampusId)?.name ?? "")                    : "",
    selectedDepartmentId ? (departments.find((d) => d.id === selectedDepartmentId)?.name ?? "")              : "",
    selectedProfessorId  ? (profMap.get(selectedProfessorId)?.name ?? profMap.get(selectedProfessorId)?.email ?? "") : "",
  ].filter(Boolean)
  const filterLabel = filterParts.join(" · ")

  // Build day map: "yyyy-MM-dd" → display strings
  const dayMap = new Map<string, string[]>()
  for (const req of requests) {
    const profDisplay = `${formatProfName(req.professor.name)} — ${deptAbbrev(req.professor.department?.name)}`
    for (const date of req.dates) {
      const key = format(date, "yyyy-MM-dd")
      if (!dayMap.has(key)) dayMap.set(key, [])
      const list = dayMap.get(key)!
      if (!list.includes(profDisplay)) list.push(profDisplay)
    }
  }
  dayMap.forEach((list) => list.sort())

  // Holiday map: "yyyy-MM-dd" → label
  const holidayMap = new Map<string, string>()
  for (const h of holidays) {
    holidayMap.set(format(h.date, "yyyy-MM-dd"), h.label ?? "Holiday")
  }

  const months: Date[] = Array.from({ length: 12 }, (_, i) => addMonths(start, i))

  return (
    <>
      <style>{`
        @media print {
          header { display: none !important; }
          .month-page { page-break-after: always; break-after: page; }
          .month-page:last-child { page-break-after: avoid; break-after: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { size: A4 landscape; margin: 1.2cm; }
      `}</style>

      {/* Screen toolbar */}
      <div className="print:hidden flex items-center justify-between gap-4 px-6 py-4 border-b mb-2 bg-white sticky top-0 z-10 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Leave Calendar — {label}</h1>
          <p className="text-xs text-gray-500">
            {filterLabel ? `${filterLabel} · ` : ""}
            {canApproveStep1(role)
              ? "Your campus · "
              : canApproveStep2(role)
              ? "Your department · "
              : ""}
            Approved leave · one month per page
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {canFilter && (
            <CalendarExportFilter
              campuses={campuses}
              departments={departments}
              professors={professors}
              year={selectedStartYear}
              currentCampusId={selectedCampusId}
              currentDepartmentId={selectedDepartmentId}
              currentProfessorId={selectedProfessorId}
            />
          )}
          <PrintButton />
        </div>
      </div>

      {/* Calendar pages */}
      {months.map((monthStart) => {
        const year = monthStart.getFullYear()
        const month = monthStart.getMonth()
        const daysCount = getDaysInMonth(monthStart)
        const leadingEmpties = mondayDow(new Date(year, month, 1))
        const monthLabel = format(monthStart, "MMMM yyyy")

        const cells: (number | null)[] = [
          ...Array<null>(leadingEmpties).fill(null),
          ...Array.from({ length: daysCount }, (_, i) => i + 1),
        ]
        while (cells.length % 7 !== 0) cells.push(null)

        return (
          <div key={monthLabel} className="month-page px-4 py-3">
            <h2 className="text-base font-bold text-center tracking-wide uppercase text-gray-800">
              {monthLabel}
            </h2>
            {filterLabel && (
              <p className="text-center text-[10px] text-gray-400 mb-1">{filterLabel}</p>
            )}

            <div className="grid grid-cols-7 gap-px bg-gray-300 border border-gray-300 text-xs mt-2">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="bg-gray-100 text-center font-semibold py-1 text-gray-600 text-[10px] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}

              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`filler-${i}`} className="bg-gray-50 min-h-[72px]" />
                }

                const dateObj = new Date(year, month, day)
                const dateKey = format(dateObj, "yyyy-MM-dd")
                const entries = dayMap.get(dateKey) ?? []
                const dow = mondayDow(dateObj)
                const isWeekend = dow === 5 || dow === 6
                const isBlocked = isBlockedDate(dateObj)
                const holidayLabel = holidayMap.get(dateKey)
                const isHoliday = !!holidayLabel
                const muted = isWeekend || isBlocked || isHoliday

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[72px] p-1 ${isHoliday ? "bg-amber-50" : muted ? "bg-gray-100" : "bg-white"}`}
                  >
                    <span className={`text-[10px] font-bold block mb-0.5 ${muted ? "text-gray-400" : "text-gray-700"}`}>
                      {day}
                    </span>
                    {isHoliday && (
                      <span className="block text-[9px] leading-tight text-amber-700 italic truncate">
                        {holidayLabel}
                      </span>
                    )}
                    {!muted && entries.map((name, ei) => (
                      <span key={ei} className="block text-[9px] leading-tight text-gray-800 truncate">
                        {name}
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}
