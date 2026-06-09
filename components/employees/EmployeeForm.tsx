"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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

  const inputCls = "w-full px-3 py-2 border rounded-lg text-sm mt-1"
  const labelCls = "text-xs text-zinc-500"

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
      toast.error("บันทึกไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">👤 ข้อมูลส่วนตัว</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>เลขบัตรประชาชน</label>
            <input
              {...register("citizenId")}
              placeholder="13 หลัก (ใช้ match Excel import)"
              className={`${inputCls} font-mono`}
            />
            {errors.citizenId && (
              <p className="text-xs text-red-500 mt-1">{errors.citizenId.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>คำนำหน้า</label>
            <input {...register("nameTitle")} placeholder="นาย / นาง / นางสาว" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ชื่อ *</label>
            <input {...register("firstName")} className={inputCls} />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className={labelCls}>นามสกุล *</label>
            <input {...register("lastName")} className={inputCls} />
            {errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>
            )}
          </div>
          <div className="col-span-2 flex items-center gap-2 mt-2">
            <input type="checkbox" {...register("isActive")} id="isActive" className="rounded" />
            <label htmlFor="isActive" className="text-sm">
              ยังประจำการ
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">📋 ข้อมูลปัจจุบัน (snapshot)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>ตำแหน่ง</label>
            <input {...register("currentPositionName")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ประเภทตำแหน่ง</label>
            <input {...register("currentPositionType")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>ระดับ</label>
            <input {...register("currentPositionLevel")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>เงินเดือนปัจจุบัน</label>
            <input
              type="number"
              {...register("currentSalary", { valueAsNumber: true })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>ระบบเงินเดือน</label>
            <input {...register("salarySystemType")} placeholder="พลเรือน" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>วุฒิการศึกษา</label>
            <input {...register("currentQualification")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>กระทรวง</label>
            <input {...register("currentMinistry")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>กรม</label>
            <input {...register("currentDepartment")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>สำนัก/กอง</label>
            <input {...register("currentBureau")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>กอง/ฝ่าย</label>
            <input {...register("currentDivision")} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
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
