/** Normalize Thai citizen ID to 13 digits (strip spaces/dashes) */
export function normalizeCitizenId(value: unknown): string | null {
  if (value == null || value === "") return null
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null
    const digits = String(Math.trunc(Math.abs(value)))
    return digits || null
  }
  const digits = String(value).replace(/\D/g, "")
  return digits || null
}

export function isValidCitizenId(value: unknown): boolean {
  const id = normalizeCitizenId(value)
  if (!id) return true // optional field
  return /^\d{13}$/.test(id)
}

/** Display as X-XXXX-XXXXX-XX-X when 13 digits */
export function formatCitizenId(value: string | null | undefined): string {
  const id = normalizeCitizenId(value)
  if (!id || id.length !== 13) return value?.trim() || "—"
  return `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}`
}
