"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormField } from "@/components/shared/form-field"
import {
  personSchema,
  personFormDefaultValues,
  personFormToApiBody,
  personToFormDefaults,
  type PersonFormData,
} from "@/lib/validation/person-schema"

interface EmployeeFormProps {
  mode: "create" | "edit"
  person?: Record<string, unknown>
}

export function EmployeeForm({ mode, person }: EmployeeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues:
      mode === "edit" && person ? personToFormDefaults(person) : personFormDefaultValues,
  })

  const onSubmit = async (data: PersonFormData) => {
    setLoading(true)
    try {
      const url = mode === "create" ? "/api/employees" : `/api/employees/${person!.id}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personFormToApiBody(data)),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || "บันทึกไม่สำเร็จ")
        return
      }
      toast.success(mode === "create" ? "เพิ่มข้าราชการสำเร็จ" : "บันทึกข้อมูลสำเร็จ")
      router.push(`/employees/${body.id}`)
      router.refresh()
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">👤 ข้อมูลส่วนตัว</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="employee-citizenId"
            label="เลขบัตรประชาชน"
            error={errors.citizenId?.message}
          >
            <input
              {...register("citizenId")}
              placeholder="13 หลัก (ใช้ match Excel import)"
              className="font-mono"
            />
          </FormField>
          <FormField id="employee-nameTitle" label="คำนำหน้า">
            <input {...register("nameTitle")} placeholder="นาย / นาง / นางสาว" />
          </FormField>
          <FormField id="employee-firstName" label="ชื่อ *" error={errors.firstName?.message}>
            <input {...register("firstName")} required aria-required="true" />
          </FormField>
          <FormField id="employee-lastName" label="นามสกุล *" error={errors.lastName?.message}>
            <input {...register("lastName")} required aria-required="true" />
          </FormField>
          <div className="col-span-2 flex items-center gap-2 mt-2">
            <input type="checkbox" {...register("isActive")} id="employee-isActive" className="rounded" />
            <label htmlFor="employee-isActive" className="text-sm">
              ยังประจำการ
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">📋 ข้อมูลปัจจุบัน (snapshot)</h2>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="employee-currentPositionName" label="ตำแหน่ง">
            <input {...register("currentPositionName")} />
          </FormField>
          <FormField id="employee-currentPositionType" label="ประเภทตำแหน่ง">
            <input {...register("currentPositionType")} />
          </FormField>
          <FormField id="employee-currentPositionLevel" label="ระดับ">
            <input {...register("currentPositionLevel")} />
          </FormField>
          <FormField id="employee-currentSalary" label="เงินเดือนปัจจุบัน">
            <input type="number" {...register("currentSalary", { valueAsNumber: true })} />
          </FormField>
          <FormField id="employee-salarySystemType" label="ระบบเงินเดือน">
            <input {...register("salarySystemType")} placeholder="พลเรือน" />
          </FormField>
          <FormField id="employee-currentQualification" label="วุฒิการศึกษา">
            <input {...register("currentQualification")} />
          </FormField>
          <FormField id="employee-currentMinistry" label="กระทรวง">
            <input {...register("currentMinistry")} />
          </FormField>
          <FormField id="employee-currentDepartment" label="กรม">
            <input {...register("currentDepartment")} />
          </FormField>
          <FormField id="employee-currentBureau" label="สำนัก/กอง">
            <input {...register("currentBureau")} />
          </FormField>
          <FormField id="employee-currentDivision" label="กอง/ฝ่าย">
            <input {...register("currentDivision")} />
          </FormField>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "⏳ กำลังบันทึก..." : mode === "create" ? "✅ เพิ่มข้าราชการ" : "💾 บันทึก"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50"
        >
          ↩️ ยกเลิก
        </button>
      </div>
    </form>
  )
}
