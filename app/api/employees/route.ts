import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { STALE_ORDER_WHERE } from "@/lib/freshness"
import type { PersonWithCount } from "@/lib/types"
import { personSchema, personFormToApiBody } from "@/lib/validation/person-schema"

const PAGE_SIZE = 50

function buildSearchWhere(search: string): Record<string, unknown> {
  if (!search) return {}
  const digitSearch = search.replace(/\D/g, "")
  const or: Record<string, unknown>[] = [
    { firstName: { contains: search } },
    { lastName: { contains: search } },
  ]
  if (digitSearch.length >= 4) {
    or.push({ citizenId: { contains: digitSearch } })
  }
  return { OR: or }
}

async function assertUniqueCitizenId(citizenId: string | null, excludeId?: number) {
  if (!citizenId) return null
  const existing = await prisma.person.findFirst({
    where: {
      citizenId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, firstName: true, lastName: true },
  })
  if (existing) {
    return NextResponse.json(
      {
        error: `เลขบัตรนี้มีในระบบแล้ว (${existing.firstName} ${existing.lastName})`,
      },
      { status: 409 }
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const search = searchParams.get("search") || ""
  const active = searchParams.get("active")

  const where: Record<string, unknown> = buildSearchWhere(search)
  if (active === "true") where.isActive = true
  if (active === "false") where.isActive = false

  const persons = (await prisma.person.findMany({
    where,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: { id: "asc" },
    select: {
      id: true,
      nameTitle: true,
      firstName: true,
      lastName: true,
      citizenId: true,
      currentPositionName: true,
      currentPositionType: true,
      currentPositionLevel: true,
      currentBureau: true,
      currentDivision: true,
      currentDepartment: true,
      currentMinistry: true,
      currentSalary: true,
      isActive: true,
      _count: { select: { orders: true } },
    },
  })) as PersonWithCount[]
  const total = await prisma.person.count({ where })

  // Avoid groupBy (Prisma 7 libSQL compatibility) — fetch stale counts in one query
  const personIds = persons.map((p) => p.id)
  const staleOrders =
    personIds.length > 0
      ? await prisma.order.findMany({
          where: { employeeId: { in: personIds }, ...STALE_ORDER_WHERE },
          select: { employeeId: true, id: true },
        })
      : []

  // Manual group count
  const staleMap = new Map<number, number>()
  for (const o of staleOrders) {
    staleMap.set(o.employeeId, (staleMap.get(o.employeeId) ?? 0) + 1)
  }

  const enriched = persons.map((p) => ({
    id: p.id,
    nameTitle: p.nameTitle,
    firstName: p.firstName,
    lastName: p.lastName,
    citizenId: p.citizenId,
    currentPositionName: p.currentPositionName,
    currentPositionType: p.currentPositionType,
    currentPositionLevel: p.currentPositionLevel,
    currentBureau: p.currentBureau,
    currentDivision: p.currentDivision,
    currentDepartment: p.currentDepartment,
    currentMinistry: p.currentMinistry,
    currentSalary: p.currentSalary,
    isActive: p.isActive,
    orderCount: p._count.orders,
    staleCount: staleMap.get(p.id) ?? 0,
  }))

  return NextResponse.json({ persons: enriched, total, page, limit: PAGE_SIZE })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = personSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = personFormToApiBody(parsed.data)
    const conflict = await assertUniqueCitizenId(data.citizenId ?? null)
    if (conflict) return conflict

    const person = await prisma.person.create({ data })

    return NextResponse.json(person, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create person", detail: String(error) },
      { status: 500 }
    )
  }
}
