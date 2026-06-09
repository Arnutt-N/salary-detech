import type { Person } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizeCitizenId } from "@/lib/citizen-id"
import type { ImportPreviewRow } from "./types"

const NAME_TITLES = new Set(["นาย", "นาง", "นางสาว", "ด.ช.", "ด.ญ."])

function stripNameTitles(parts: string[]): string[] {
  let rest = [...parts]
  while (rest.length >= 2 && NAME_TITLES.has(rest[0])) {
    rest = rest.slice(1)
  }
  return rest
}

function splitPersonName(full: string): { firstName: string; lastName: string } | null {
  const parts = stripNameTitles(full.trim().split(/\s+/).filter(Boolean))
  if (parts.length < 2) return null
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function nameMatches(person: Person, personName: string): boolean {
  const split = splitPersonName(personName)
  if (!split) return false
  const fn = (person.firstName ?? "").trim()
  const ln = (person.lastName ?? "").trim()
  if (fn === split.firstName && ln === split.lastName) return true

  const excelParts = stripNameTitles(personName.trim().split(/\s+/).filter(Boolean))
  if (excelParts.length >= 2) {
    const excelFirst = excelParts[0]
    const excelLast = excelParts[excelParts.length - 1]
    if (fn === excelFirst && ln === excelLast) return true
  }

  const dbFull = [person.nameTitle, fn, ln].filter(Boolean).join(" ")
  const dbSplit = splitPersonName(dbFull)
  return dbSplit?.firstName === split.firstName && dbSplit?.lastName === split.lastName
}

export function resolveEmployeeMatches(
  rows: ImportPreviewRow[],
  persons: Person[]
): ImportPreviewRow[] {
  const byCitizen = new Map<string, Person[]>()
  for (const p of persons) {
    const id = normalizeCitizenId(p.citizenId)
    if (!id) continue
    const list = byCitizen.get(id) ?? []
    list.push(p)
    byCitizen.set(id, list)
  }

  return rows.map((row) => {
    if (!row.order || row.errors.length > 0) return row

    let matches: Person[] = []

    if (row.citizenId) {
      matches = byCitizen.get(row.citizenId) ?? []
    }

    if (matches.length === 0 && row.personName) {
      matches = persons.filter((p) => nameMatches(p, row.personName!))
    }

    if (matches.length === 1) {
      return {
        ...row,
        employeeId: matches[0].id,
        matchStatus: "matched",
      }
    }

    if (matches.length > 1) {
      return {
        ...row,
        employeeId: null,
        matchStatus: "ambiguous",
        errors: [...row.errors, "พบข้าราชการมากกว่า 1 คนที่ตรงกับข้อมูล"],
        order: null,
      }
    }

    return {
      ...row,
      employeeId: null,
      matchStatus: "not_found",
      errors: [...row.errors, "ไม่พบข้าราชการในระบบ"],
      order: null,
    }
  })
}

export async function loadPersonsForImport(): Promise<Person[]> {
  return prisma.person.findMany({ where: { isActive: true } })
}
