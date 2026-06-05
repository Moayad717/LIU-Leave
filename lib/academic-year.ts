export interface AcademicYear {
  start: Date
  end: Date
  label: string
}

// Academic year: Oct 1 → Sep 30 of the following year
export function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed; 9 = October

  const startYear = month >= 9 ? year : year - 1

  return {
    start: new Date(startYear, 9, 1, 0, 0, 0),        // Oct 1
    end:   new Date(startYear + 1, 8, 30, 23, 59, 59), // Sep 30
    label: `${startYear}–${startYear + 1}`,
  }
}

export function getAcademicYearFromStartYear(startYear: number): AcademicYear {
  return {
    start: new Date(startYear, 9, 1, 0, 0, 0),
    end:   new Date(startYear + 1, 8, 30, 23, 59, 59),
    label: `${startYear}–${startYear + 1}`,
  }
}

export function getAcademicYearForDate(date: Date): AcademicYear {
  const year = date.getFullYear()
  const month = date.getMonth()
  const startYear = month >= 9 ? year : year - 1

  return {
    start: new Date(startYear, 9, 1, 0, 0, 0),
    end:   new Date(startYear + 1, 8, 30, 23, 59, 59),
    label: `${startYear}–${startYear + 1}`,
  }
}

// Sep 16–30 of every year are blocked (academic year closing period)
export function isBlockedDate(date: Date): boolean {
  const month = date.getMonth() // 8 = September
  const day = date.getDate()
  return month === 8 && day >= 16 && day <= 30
}

// Returns all Sep 16–30 dates within the given academic year (at the end of the year)
export function getBlockedDatesForYear(year: AcademicYear): Date[] {
  const endYear = year.end.getFullYear() // Sep 30 year
  const blocked: Date[] = []
  for (let day = 16; day <= 30; day++) {
    const d = new Date(endYear, 8, day) // September = month 8
    if (d.getDay() !== 0 && d.getDay() !== 6) { // skip weekends
      blocked.push(d)
    }
  }
  return blocked
}
