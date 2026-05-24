export interface AcademicYear {
  start: Date
  end: Date
  label: string
}

export function getCurrentAcademicYear(): AcademicYear {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed; 8 = September

  const startYear = month >= 8 ? year : year - 1

  return {
    start: new Date(startYear, 8, 1, 0, 0, 0),
    end: new Date(startYear + 1, 7, 31, 23, 59, 59),
    label: `${startYear}–${startYear + 1}`,
  }
}

export function getAcademicYearFromStartYear(startYear: number): AcademicYear {
  return {
    start: new Date(startYear, 8, 1, 0, 0, 0),
    end: new Date(startYear + 1, 7, 31, 23, 59, 59),
    label: `${startYear}–${startYear + 1}`,
  }
}

export function getAcademicYearForDate(date: Date): AcademicYear {
  const year = date.getFullYear()
  const month = date.getMonth()
  const startYear = month >= 8 ? year : year - 1

  return {
    start: new Date(startYear, 8, 1, 0, 0, 0),
    end: new Date(startYear + 1, 7, 31, 23, 59, 59),
    label: `${startYear}–${startYear + 1}`,
  }
}
