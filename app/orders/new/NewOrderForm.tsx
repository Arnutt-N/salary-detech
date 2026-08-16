"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { UseFormSetValue } from "react-hook-form"
import {
  orderSchema,
  orderFormDefaultValues,
  orderFormToApiBody,
  type OrderFormData,
} from "@/lib/validation/order-schema"
import { isMovementOrderType } from "@/lib/order-types"
import { OrderFormSections } from "@/components/orders/OrderFormSections"

interface Person {
  id: number
  firstName: string | null
  lastName: string | null
  currentPositionName?: string | null
  currentPositionType?: string | null
  currentPositionLevel?: string | null
  currentBureau?: string | null
  currentDivision?: string | null
  currentDepartment?: string | null
  currentMinistry?: string | null
  currentSalary?: number | null
}

interface PreviewResult {
  totalAffected: number
  affectedOrders: Array<{
    id: number
    orderType: string
    effectiveDate: string
    reason: string
    actionRequired: string
  }>
  warnings: string[]
}

function fillSnapshotFromPerson(
  setValue: UseFormSetValue<OrderFormData>,
  p: Person,
  prefix: "prior" | "new"
) {
  if (prefix === "prior") {
    if (p.currentSalary) setValue("priorSalary", p.currentSalary)
    setValue("priorPositionName", p.currentPositionName || "")
    setValue("priorPositionType", p.currentPositionType || "")
    setValue("priorPositionLevel", p.currentPositionLevel || "")
    setValue("priorBureau", p.currentBureau || "")
    setValue("priorDivision", p.currentDivision || "")
    setValue("priorDepartment", p.currentDepartment || "")
    setValue("priorMinistry", p.currentMinistry || "")
  } else {
    if (p.currentSalary) setValue("salary", p.currentSalary)
    setValue("positionName", p.currentPositionName || "")
    setValue("positionType", p.currentPositionType || "")
    setValue("positionLevel", p.currentPositionLevel || "")
    setValue("bureau", p.currentBureau || "")
    setValue("division", p.currentDivision || "")
    setValue("department", p.currentDepartment || "")
    setValue("ministry", p.currentMinistry || "")
  }
}

export function NewOrderForm() {
  const router = useRouter()
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      ...orderFormDefaultValues,
      employeeId: undefined,
    },
  })

  const formValues = watch()
  const showMovementPrior = isMovementOrderType(formValues.orderType ?? "")

  const handleSearch = async () => {
    if (!employeeSearch.trim()) return
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(employeeSearch)}&limit=10`)
      const data = await res.json()
      setSearchResults(data.persons || [])
    } catch {
      toast.error("ค้นหาไม่สำเร็จ")
    }
  }

  const selectPerson = (p: Person) => {
    setSelectedPerson(p)
    setSearchResults([])
    setEmployeeSearch(`${p.firstName} ${p.lastName}`)
    setValue("employeeId", p.id, { shouldValidate: true })
    fillSnapshotFromPerson(setValue, p, "new")
    if (isMovementOrderType(formValues.orderType ?? "")) {
      fillSnapshotFromPerson(setValue, p, "prior")
    }
  }

  const handlePreview = async () => {
    if (!selectedPerson) {
      toast.error("กรุณาเลือกข้าราชการ")
      return
    }
    if (!formValues.effectiveDate) {
      toast.error("กรุณากรอกวันที่มีผล")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedPerson.id,
          orderType: formValues.orderType,
          effectiveDate: formValues.effectiveDate,
          salary: formValues.salary ? Number(formValues.salary) : undefined,
          salaryAsOfDate: formValues.salaryAsOfDate || undefined,
          positionLevel: formValues.positionLevel || undefined,
        }),
      })
      const data = await res.json()
      setPreview(data)
    } catch {
      toast.error("ตรวจสอบไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  const submitOrder = async (data: OrderFormData, orderStatus: "draft" | "active") => {
    if (!selectedPerson) {
      toast.error("กรุณาเลือกข้าราชการ")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedPerson.id,
          ...orderFormToApiBody(data),
          orderStatus,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "บันทึกไม่สำเร็จ")
        return
      }
      toast.success(orderStatus === "draft" ? "บันทึกแบบร่างสำเร็จ" : "บันทึกและเปิดใช้สำเร็จ")
      router.push("/orders")
    } catch {
      toast.error("บันทึกไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  const onDraft = handleSubmit((data) => submitOrder(data, "draft"))
  const onActive = handleSubmit((data) => submitOrder(data, "active"))

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">👤 เลือกข้าราชการ</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            placeholder="ค้นหาชื่อ..."
            className="input-touch min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="btn-primary shrink-0"
          >
            ค้นหา
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border">
            {searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPerson(p)}
                className="min-h-11 w-full px-3 text-left text-sm hover:bg-zinc-50"
              >
                {p.firstName} {p.lastName} — {p.currentPositionName || "—"}
              </button>
            ))}
          </div>
        )}
        {selectedPerson && (
          <p className="mt-2 text-sm text-green-600">
            ✅ เลือก: {selectedPerson.firstName} {selectedPerson.lastName}
          </p>
        )}
        {errors.employeeId && (
          <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-bold mb-4">📝 ข้อมูลคำสั่ง</h2>
        <OrderFormSections
          register={register}
          errors={errors}
          showMovementPrior={showMovementPrior}
        />
      </div>

      {preview && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-bold mb-4">👁️ ผลตรวจกระทบ</h2>
          <p className="text-sm mb-2">กระทบ {preview.totalAffected} คำสั่ง</p>
          {preview.affectedOrders?.map((o) => (
            <div key={o.id} className="text-sm py-1 border-b last:border-0">
              <span className="font-mono">#{o.id}</span> — {o.reason} ({o.actionRequired})
            </div>
          ))}
          {preview.warnings?.map((w, i) => (
            <p key={i} className="text-sm text-amber-600 mt-2">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading}
          className="btn-secondary disabled:opacity-50"
        >
          🔍 ตรวจผลกระทบ
        </button>
        <button
          type="button"
          onClick={onDraft}
          disabled={loading}
          className="btn-secondary disabled:opacity-50"
        >
          💾 บันทึกแบบร่าง
        </button>
        <button
          type="button"
          onClick={onActive}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          ✅ บันทึกและเปิดใช้
        </button>
      </div>
    </div>
  )
}
