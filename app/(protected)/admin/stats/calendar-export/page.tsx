import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canAccessAdmin, canApproveStep1, canApproveStep2 } from "@/types/enums"
import { getAcademicYearFromStartYear, getCurrentAcademicYear, isBlockedDate } from "@/lib/academic-year"
import { format, getDaysInMonth, getDay, addMonths } from "date-fns"
import { PrintButton } from "./print-button"

interface Props {
  searchParams: { year?: string }
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

// Returns Mon-based day-of-week: Mon=0 … Sun=6
function mondayDow(date: Date): number {
  const d = getDay(date) // Sun=0 … Sat=6
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
  const scopeFilter: Record<string, unknown> = {}
  if (canApproveStep1(role) && session.user.campusId) {
    scopeFilter.campusId = session.user.campusId
  } else if (canApproveStep2(role) && session.user.departmentId) {
    scopeFilter.departmentId = session.user.departmentId
  }

  const requests = await db.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      submittedAt: { gte: start, lte: end },
      ...(Object.keys(scopeFilter).length > 0 ? { professor: scopeFilter } : {}),
    },
    select: {
      dates: true,
      professor: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
    },
  })

  // Build day map: "YYYY-MM-DD" → display strings (deduplicated per professor per day)
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
  // Sort each day alphabetically
  dayMap.forEach((list) => list.sort())

  // 12 months starting from Oct (month index 9)
  const months: Date[] = Array.from({ length: 12 }, (_, i) => addMonths(start, i))

  return (
    <>
      {/* Print CSS — hides nav, sets page size, forces page breaks */}
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
      <div className="print:hidden flex items-center justify-between px-6 py-4 border-b mb-2 bg-white sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold">Leave Calendar — {label}</h1>
          <p className="text-xs text-gray-500">
            {canApproveStep1(role)
              ? "Your campus · Approved leave · one month per page"
              : canApproveStep2(role)
              ? "Your department · Approved leave · one month per page"
              : "Approved leave · one month per page"}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Calendar pages */}
      {months.map((monthStart) => {
        const year = monthStart.getFullYear()
        const month = monthStart.getMonth()
        const daysCount = getDaysInMonth(monthStart)
        const leadingEmpties = mondayDow(new Date(year, month, 1))
        const monthLabel = format(monthStart, "MMMM yyyy")

        // Grid cells: null = filler, number = day-of-month
        const cells: (number | null)[] = [
          ...Array<null>(leadingEmpties).fill(null),
          ...Array.from({ length: daysCount }, (_, i) => i + 1),
        ]
        while (cells.length % 7 !== 0) cells.push(null)

        return (
          <div key={monthLabel} className="month-page px-4 py-3">
            {/* Month header */}
            <h2 className="text-base font-bold text-center mb-2 tracking-wide uppercase text-gray-800">
              {monthLabel}
            </h2>

            {/* Calendar grid — gap-px on gray bg renders as solid grid lines */}
            <div className="grid grid-cols-7 gap-px bg-gray-300 border border-gray-300 text-xs">
              {/* Day-of-week header */}
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="bg-gray-100 text-center font-semibold py-1 text-gray-600 text-[10px] uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}

              {/* Day cells */}
              {cells.map((day, i) => {
                if (day === null) {
                  return (
                    <div
                      key={`filler-${i}`}
                      className="bg-gray-50 min-h-[72px]"
                    />
                  )
                }

                const dateObj = new Date(year, month, day)
                const dateKey = format(dateObj, "yyyy-MM-dd")
                const entries = dayMap.get(dateKey) ?? []
                const dow = mondayDow(dateObj)
                const isWeekend = dow === 5 || dow === 6
                const isBlocked = isBlockedDate(dateObj)
                const muted = isWeekend || isBlocked

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[72px] p-1 ${muted ? "bg-gray-100" : "bg-white"}`}
                  >
                    <span className={`text-[10px] font-bold block mb-0.5 ${muted ? "text-gray-400" : "text-gray-700"}`}>
                      {day}
                    </span>
                    {!muted && entries.map((name, ei) => (
                      <span key={ei} className="block text-[9px] leading-tight text-gray-800 truncate">
                        {name}
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Legend — only on first month on screen */}
            {monthLabel === format(months[0], "MMMM yyyy") && (
              <p className="print:hidden mt-2 text-[10px] text-gray-400 text-right">
                Format: First Last Initial — Department Abbreviation
              </p>
            )}
          </div>
        )
      })}
    </>
  )
}
