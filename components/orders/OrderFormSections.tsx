"use client"

import type { FieldErrors, UseFormRegister } from "react-hook-form"
import type { OrderFormData } from "@/lib/validation/order-schema"
import { FormField } from "@/components/shared/form-field"
import { ORDER_TYPE_OPTIONS } from "@/lib/order-types"

type Register = UseFormRegister<OrderFormData>

interface OrderFormSectionsProps {
  register: Register
  errors: FieldErrors<OrderFormData>
  showMovementPrior: boolean
  disabled?: boolean
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
  const id = (name: string) => `order-${prefix}-${name}`

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        id={id("salary")}
        label="เงินเดือน"
        error={isPrior ? errors.priorSalary?.message : errors.salary?.message}
        disabled={disabled}
      >
        <input
          type="number"
          {...register(isPrior ? "priorSalary" : "salary", { valueAsNumber: true })}
        />
      </FormField>
      <FormField
        id={id("costOfLivingAllowance")}
        label="เงินเพิ่มการครองชีพชั่วคราว"
        error={
          isPrior
            ? errors.priorCostOfLivingAllowance?.message
            : errors.costOfLivingAllowance?.message
        }
        disabled={disabled}
      >
        <input
          type="number"
          {...register(isPrior ? "priorCostOfLivingAllowance" : "costOfLivingAllowance", {
            valueAsNumber: true,
          })}
        />
      </FormField>
      <FormField
        id={id("specialCompensation")}
        label="ค่าตอบแทนพิเศษ"
        error={
          isPrior
            ? errors.priorSpecialCompensation?.message
            : errors.specialCompensation?.message
        }
        disabled={disabled}
      >
        <input
          type="number"
          {...register(isPrior ? "priorSpecialCompensation" : "specialCompensation", {
            valueAsNumber: true,
          })}
        />
      </FormField>
      {!isPrior && (
        <>
          <FormField
            id={id("positionAllowance")}
            label="เงินประจำตำแหน่ง"
            error={errors.positionAllowance?.message}
            disabled={disabled}
          >
            <input
              type="number"
              {...register("positionAllowance", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            id={id("compensationBeyondSalary")}
            label="ค่าตอบแทนนอกเหนือจากเงินเดือน"
            error={errors.compensationBeyondSalary?.message}
            disabled={disabled}
          >
            <input
              type="number"
              {...register("compensationBeyondSalary", { valueAsNumber: true })}
            />
          </FormField>
        </>
      )}
      <FormField
        id={id("salaryAsOfDate")}
        label="เงินเดือน ณ วันที่"
        error={isPrior ? errors.priorSalaryAsOfDate?.message : errors.salaryAsOfDate?.message}
        disabled={disabled}
      >
        <input
          type="date"
          {...register(isPrior ? "priorSalaryAsOfDate" : "salaryAsOfDate")}
        />
      </FormField>
      <FormField
        id={id("positionName")}
        label="ตำแหน่ง"
        error={isPrior ? errors.priorPositionName?.message : errors.positionName?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorPositionName" : "positionName")} />
      </FormField>
      <FormField
        id={id("positionType")}
        label="ประเภทตำแหน่ง"
        error={isPrior ? errors.priorPositionType?.message : errors.positionType?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorPositionType" : "positionType")} />
      </FormField>
      <FormField
        id={id("positionLevel")}
        label="ระดับ"
        error={isPrior ? errors.priorPositionLevel?.message : errors.positionLevel?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorPositionLevel" : "positionLevel")} />
      </FormField>
      <FormField
        id={id("positionNo")}
        label="เลขที่ตำแหน่ง"
        error={isPrior ? errors.priorPositionNo?.message : errors.positionNo?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorPositionNo" : "positionNo")} />
      </FormField>
      <FormField
        id={id("bureau")}
        label="สังกัด"
        error={isPrior ? errors.priorBureau?.message : errors.bureau?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorBureau" : "bureau")} />
      </FormField>
      <FormField
        id={id("division")}
        label="กอง"
        error={isPrior ? errors.priorDivision?.message : errors.division?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorDivision" : "division")} />
      </FormField>
      <FormField
        id={id("subDivision")}
        label="ต่ำกว่าสำนัก/กอง 1 ระดับ"
        error={isPrior ? errors.priorSubDivision?.message : errors.subDivision?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorSubDivision" : "subDivision")} />
      </FormField>
      <FormField
        id={id("department")}
        label="กรม"
        error={isPrior ? errors.priorDepartment?.message : errors.department?.message}
        disabled={disabled}
      >
        <input {...register(isPrior ? "priorDepartment" : "department")} />
      </FormField>
      <div className="col-span-2">
        <FormField
          id={id("ministry")}
          label="กระทรวง"
          error={isPrior ? errors.priorMinistry?.message : errors.ministry?.message}
          disabled={disabled}
        >
          <input {...register(isPrior ? "priorMinistry" : "ministry")} />
        </FormField>
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
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="order-orderType"
          label="ประเภทคำสั่ง"
          error={errors.orderType?.message}
          disabled={disabled}
        >
          <select {...register("orderType")}>
            {ORDER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="order-orderNo"
          label="เลขที่คำสั่ง"
          error={errors.orderNo?.message}
          disabled={disabled}
        >
          <input {...register("orderNo")} />
        </FormField>
        <FormField
          id="order-issueDate"
          label="วันที่ลงคำสั่ง"
          error={errors.issueDate?.message}
          disabled={disabled}
        >
          <input type="date" {...register("issueDate")} />
        </FormField>
        <FormField
          id="order-effectiveDate"
          label="วันที่มีผล *"
          error={errors.effectiveDate?.message}
          disabled={disabled}
        >
          <input type="date" {...register("effectiveDate")} />
        </FormField>
        <div className="col-span-2">
          <FormField
            id="order-note"
            label="หมายเหตุ"
            error={errors.note?.message}
            disabled={disabled}
          >
            <textarea {...register("note")} rows={2} />
          </FormField>
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
