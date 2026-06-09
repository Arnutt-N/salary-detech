import { format, parseISO, isValid } from "date-fns"
import { th } from "date-fns/locale"

const BUDDHIST_ERA_OFFSET = 543

/**
 * Format a date string (ISO 8601) to Thai พ.ศ. format
 * @example "2026-05-25" → "25 พ.ค. 2569"
 */
export function toThaiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  return format(d, "d MMM ", { locale: th }) + (d.getFullYear() + BUDDHIST_ERA_OFFSET)
}

/**
 * Format to full Thai date with day name
 * @example "อาทิตย์ 25 พฤษภาคม 2569"
 */
export function toThaiDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const d = parseISO(dateStr)
  if (!isValid(d)) return dateStr
  return (
    format(d, "EEEE d MMMM ", { locale: th }) +
    (d.getFullYear() + BUDDHIST_ERA_OFFSET)
  )
}

/**
 * Convert พ.ศ. year to ค.ศ.
 */
export function toChristianYear(buddhistYear: number): number {
  return buddhistYear - BUDDHIST_ERA_OFFSET
}

/**
 * Convert ค.ศ. year to พ.ศ.
 */
export function toBuddhistYear(christianYear: number): number {
  return christianYear + BUDDHIST_ERA_OFFSET
}

/** Lexicographic compare on YYYY-MM-DD business date strings (พ.ศ. or ค.ศ.). */
export function compareBusinessDates(
  a: string | null,
  b: string | null
): number | null {
  if (a == null || b == null) return null
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function maxBusinessDate(
  dates: (string | null | undefined)[]
): string | null {
  let max: string | null = null
  for (const d of dates) {
    if (!d) continue
    if (max === null || d > max) max = d
  }
  return max
}
