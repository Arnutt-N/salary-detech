import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EmployeeForm } from "@/components/employees/EmployeeForm"

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const person = await prisma.person.findUnique({
    where: { id: parseInt(id) },
  })

  if (!person) notFound()

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        ✏️ แก้ไขข้อมูล — {person.firstName} {person.lastName}
      </h1>
      <EmployeeForm mode="edit" person={person} />
    </div>
  )
}
