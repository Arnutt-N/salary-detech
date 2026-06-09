"use client"

import type { FieldErrors, UseFormRegister } from "react-hook-form"
import type { OrderFormData } from "@/lib/validation/order-schema"
import { ORDER_TYPE_OPTIONS } from "@/lib/order-types"

type Register = UseFormRegister<OrderFormData>

interface OrderFormSectionsProps {
  register: Register
  errors: FieldErrors<OrderFormData>
  showMovementPrior: boolean
  disabled?: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-red-500 mt-1">{message}</p>
}

function SnapshotGrid({
  register,
  errors,
  prefix,
  disabled,
}: {
  register: Register
  errors: FieldErrors<OrderFormData>
  prefix: "prior" | "new"
  disabled?: boolean
}) {
  const isPrior = prefix === "prior"
  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm mt-1${disabled ? " disabled:bg-zinc-100" : ""}`

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-zinc-500">เงินเดือน</label>
        <input
          type="number"
          {...register(isPrior ? "priorSalary" : "salary", { valueAsNumber: true })}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorSalary?.message : errors.salary?.message} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">เงินเพิ่มการครองชีพชั่วคราว</label>
        <input
          type="number"
          {...register(isPrior ? "priorCostOfLivingAllowance" : "costOfLivingAllowance", {
            valueAsNumber: true,
          })}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={
            isPrior ? errors.priorCostOfLivingAllowance?.message : errors.costOfLivingAllowance?.message
          }
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">ค่าตอบแทนพิเศษ</label>
        <input
          type="number"
          {...register(isPrior ? "priorSpecialCompensation" : "specialCompensation", {
            valueAsNumber: true,
          })}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={
            isPrior ? errors.priorSpecialCompensation?.message : errors.specialCompensation?.message
          }
        />
      </div>
      {!isPrior && (
        <>
          <div>
            <label className="text-xs text-zinc-500">เงินประจำตำแหน่ง</label>
            <input
              type="number"
              {...register("positionAllowance", { valueAsNumber: true })}
              disabled={disabled}
              className={inputCls}
            />
            <FieldError message={errors.positionAllowance?.message} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">ค่าตอบแทนนอกเหนือจากเงินเดือน</label>
            <input
              type="number"
              {...register("compensationBeyondSalary", { valueAsNumber: true })}
              disabled={disabled}
              className={inputCls}
            />
            <FieldError message={errors.compensationBeyondSalary?.message} />
          </div>
        </>
      )}
      <div>
        <label className="text-xs text-zinc-500">เงินเดือน ณ วันที่</label>
        <input
          type="date"
          {...register(isPrior ? "priorSalaryAsOfDate" : "salaryAsOfDate")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={isPrior ? errors.priorSalaryAsOfDate?.message : errors.salaryAsOfDate?.message}
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">ตำแหน่ง</label>
        <input
          {...register(isPrior ? "priorPositionName" : "positionName")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={isPrior ? errors.priorPositionName?.message : errors.positionName?.message}
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">ประเภทตำแหน่ง</label>
        <input
          {...register(isPrior ? "priorPositionType" : "positionType")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={isPrior ? errors.priorPositionType?.message : errors.positionType?.message}
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">ระดับ</label>
        <input
          {...register(isPrior ? "priorPositionLevel" : "positionLevel")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError
          message={isPrior ? errors.priorPositionLevel?.message : errors.positionLevel?.message}
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">เลขที่ตำแหน่ง</label>
        <input
          {...register(isPrior ? "priorPositionNo" : "positionNo")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorPositionNo?.message : errors.positionNo?.message} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">สังกัด</label>
        <input
          {...register(isPrior ? "priorBureau" : "bureau")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorBureau?.message : errors.bureau?.message} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">กอง</label>
        <input
          {...register(isPrior ? "priorDivision" : "division")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorDivision?.message : errors.division?.message} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">ต่ำกว่าสำนัก/กอง 1 ระดับ</label>
        <input
          {...register(isPrior ? "priorSubDivision" : "subDivision")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorSubDivision?.message : errors.subDivision?.message} />
      </div>
      <div>
        <label className="text-xs text-zinc-500">กรม</label>
        <input
          {...register(isPrior ? "priorDepartment" : "department")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorDepartment?.message : errors.department?.message} />
      </div>
      <div className="col-span-2">
        <label className="text-xs text-zinc-500">กระทรวง</label>
        <input
          {...register(isPrior ? "priorMinistry" : "ministry")}
          disabled={disabled}
          className={inputCls}
        />
        <FieldError message={isPrior ? errors.priorMinistry?.message : errors.ministry?.message} />
      </div>
    </div>
  )
}

export function OrderFormSections({
  register,
  errors,
  showMovementPrior,
  disabled,
}: OrderFormSectionsProps) {
  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm mt-1${disabled ? " disabled:bg-zinc-100" : ""}`

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-500">ประเภทคำสั่ง</label>
          <select {...register("orderType")} disabled={disabled} className={inputCls}>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.orderType?.message} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">เลขที่คำสั่ง</label>
          <input {...register("orderNo")} disabled={disabled} className={inputCls} />
          <FieldError message={errors.orderNo?.message} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">วันที่ลงคำสั่ง</label>
          <input type="date" {...register("issueDate")} disabled={disabled} className={inputCls} />
          <FieldError message={errors.issueDate?.message} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">วันที่มีผล *</label>
          <input type="date" {...register("effectiveDate")} disabled={disabled} className={inputCls} />
          <FieldError message={errors.effectiveDate?.message} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-zinc-500">หมายเหตุ</label>
          <textarea {...register("note")} disabled={disabled} rows={2} className={inputCls} />
          <FieldError message={errors.note?.message} />
        </div>
      </div>

      {showMovementPrior && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold text-zinc-700 mb-3">📋 ข้อมูลเดิม (ก่อนมีผล)</h3>
          <SnapshotGrid register={register} errors={errors} prefix="prior" disabled={disabled} />
        </div>
      )}

      <div className={showMovementPrior ? "mt-6 pt-6 border-t" : "mt-4"}>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          {showMovementPrior ? "📋 ข้อมูลที่แต่งตั้ง / หลังมีผล" : "📋 ข้อมูลในคำสั่ง"}
        </h3>
        <SnapshotGrid register={register} errors={errors} prefix="new" disabled={disabled} />
      </div>
    </>
  )
}
