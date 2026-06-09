import { EmployeeForm } from "@/components/employees/EmployeeForm"

export default function NewEmployeePage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">➕ เพิ่มข้าราชการ</h1>
      <EmployeeForm mode="create" />
    </div>
  )
}
