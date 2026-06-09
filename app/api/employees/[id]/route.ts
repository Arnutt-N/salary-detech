import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { personSchema, personFormToApiBody } from "@/lib/validation/person-schema"

async function assertUniqueCitizenId(citizenId: string | null, excludeId: number) {
  if (!citizenId) return null
  const existing = await prisma.person.findFirst({
    where: { citizenId, id: { not: excludeId } },
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params
  const id = parseInt(idStr)

  const person = await prisma.person.findUnique({
    where: { id },
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
      salarySystemType: true,
      currentQualification: true,
      qualificationEffectiveDate: true,
      isActive: true,
      createdAt: true,
      _count: { select: { orders: true, changeLogs: true } },
    },
  })

  if (!person) {
    return NextResponse.json({ error: "ไม่พบบุคคลนี้" }, { status: 404 })
  }

  const staleCount = await prisma.order.count({
    where: {
      employeeId: id,
      orderStatus: { in: ["active", "superseded"] },
      OR: [
        { statusSalary: "stale" },
        { statusLevel: "stale" },
        { statusPosition: "stale" },
        { statusType: "stale" },
        { statusOrg: "stale" },
      ],
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _count, ...rest } = person

  return NextResponse.json({
    ...rest,
    orderCount: _count.orders,
    changeLogCount: _count.changeLogs,
    staleCount,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)

    const existing = await prisma.person.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบุคคลนี้" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = personSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = personFormToApiBody(parsed.data)
    const conflict = await assertUniqueCitizenId(data.citizenId ?? null, id)
    if (conflict) return conflict

    const person = await prisma.person.update({
      where: { id },
      data,
    })

    return NextResponse.json(person)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update person", detail: String(error) },
      { status: 500 }
    )
  }
}
