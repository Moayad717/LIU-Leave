import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDate(d: string | Date): Date {
  const iso = typeof d === "string" ? d : d.toISOString()
  const [year, month, day] = iso.split("T")[0].split("-").map(Number)
  return new Date(year, month - 1, day)
}
