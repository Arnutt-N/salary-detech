"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FormField } from "@/components/shared/form-field"
import { batchSchema, type BatchFormData } from "@/lib/validation/batch-schema"

const batchTypeOptions = [
  { value: "salary_apr", label: "💰 เลื่อนเงินเดือน 1 เม.ย." },
  { value: "salary_oct", label: "💰 เลื่อนเงินเดือน 1 ต.ค." },
  { value: "promotion", label: "📈 เลื่อนตำแหน่ง" },
  { value: "transfer", label: "🔄 ย้าย" },
]

export function NewBatchForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batchNo: "",
      batchType: "salary_apr",
      effectiveDate: "",
      description: "",
    },
  })

  const onSubmit = async (data: BatchFormData) => {
    setLoading(true)
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchNo: data.batchNo,
          batchType: data.batchType,
          effectiveDate: data.effectiveDate || null,
          description: data.description || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 409) {
          toast.error("เลขนี้มีอยู่แล้ว")
        } else {
          toast.error(err.error || "สร้างไม่สำเร็จ")
        }
        return
      }
      const batch = await res.json()
      toast.success("สร้างชุดคำสั่งสำเร็จ")
      router.push(`/batches/${batch.id}`)
    } catch {
      toast.error("สร้างไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="batch-batchNo"
            label="เลขที่ชุด *"
            error={errors.batchNo?.message}
          >
            <input {...register("batchNo")} placeholder="เช่น SAL-APR-2569-001" required aria-required="true" />
          </FormField>
          <FormField id="batch-batchType" label="ประเภท" error={errors.batchType?.message}>
            <select {...register("batchType")}>
              {batchTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="batch-effectiveDate"
            label="วันที่มีผล"
            error={errors.effectiveDate?.message}
          >
            <input type="date" {...register("effectiveDate")} />
          </FormField>
          <div className="col-span-2">
            <FormField
              id="batch-description"
              label="คำอธิบาย"
              error={errors.description?.message}
            >
              <textarea {...register("description")} rows={3} />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          📦 สร้างชุดคำสั่ง
        </button>
        <button
          type="button"
          onClick={() => router.push("/batches")}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50"
        >
          ↩️ ยกเลิก
        </button>
      </div>
    </form>
  )
}
