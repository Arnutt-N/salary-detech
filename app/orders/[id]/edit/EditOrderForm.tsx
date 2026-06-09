"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  orderSchema,
  orderToFormDefaults,
  orderFormToApiBody,
  type OrderFormData,
} from "@/lib/validation/order-schema"
import { isMovementOrderType } from "@/lib/order-types"
import { OrderFormSections } from "@/components/orders/OrderFormSections"

interface OrderData {
  id: number
  orderType: string
  orderNo: string | null
  issueDate: string
  effectiveDate: string
  person: {
    firstName: string | null
    lastName: string | null
  }
  [key: string]: unknown
}

export function EditOrderForm({ order, canEdit }: { order: OrderData; canEdit: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: orderToFormDefaults(order),
  })

  const showMovementPrior = isMovementOrderType(watch("orderType") ?? order.orderType)

  const onSubmit = async (data: OrderFormData) => {
    if (!canEdit) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderFormToApiBody(data)),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "บันทึกไม่สำเร็จ")
        return
      }
      toast.success("แก้ไขคำสั่งสำเร็จ")
      router.push(`/orders/${order.id}`)
    } catch {
      toast.error("บันทึกไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <p className="text-sm text-zinc-500 mb-4">
          ข้าราชการ:{" "}
          <span className="font-medium text-zinc-700">
            {order.person.firstName} {order.person.lastName}
          </span>
        </p>
        <OrderFormSections
          register={register}
          errors={errors}
          showMovementPrior={showMovementPrior}
          disabled={!canEdit}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !canEdit}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          💾 บันทึก
        </button>
        <button
          type="button"
          onClick={() => router.push(`/orders/${order.id}`)}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-zinc-50"
        >
          ↩️ ยกเลิก
        </button>
      </div>
    </form>
  )
}
