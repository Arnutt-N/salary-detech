const BUDDHIST_ERA_OFFSET = 543

/** Parse Excel / Thai date cell → ISO YYYY-MM-DD */
export function parseExcelDate(value: unknown): string | null {
  if (value == null || value === "") return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return formatIso(value)
  }

  if (typeof value === "number") {
    // Excel serial date (1900 system)
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(epoch.getTime() + value * 86400000)
    if (Number.isNaN(d.getTime())) return null
    return formatIso(d)
  }

  const text = String(value).trim()
  if (!text) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const day = Number(slash[1])
    const month = Number(slash[2])
    let year = Number(slash[3])
    if (year >= 2400) year -= BUDDHIST_ERA_OFFSET
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null
    }
    return formatIso(d)
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return formatIso(parsed)

  return null
}

function formatIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
