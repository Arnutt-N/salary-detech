import { z } from "zod"
import { ORDER_TYPE_VALUES, type OrderType } from "@/lib/order-types"

const optionalNumber = z
  .number()
  .optional()
  .nullable()
  .or(z.nan().transform(() => null))

const optionalString = z.string().optional().nullable()

const snapshotFields = {
  salary: optionalNumber,
  costOfLivingAllowance: optionalNumber,
  specialCompensation: optionalNumber,
  positionAllowance: optionalNumber,
  compensationBeyondSalary: optionalNumber,
  salaryAsOfDate: optionalString,
  salarySystemType: optionalString,
  positionName: optionalString,
  positionType: optionalString,
  positionLevel: optionalString,
  positionNo: optionalString,
  bureau: optionalString,
  division: optionalString,
  subDivision: optionalString,
  department: optionalString,
  ministry: optionalString,
  note: optionalString,
  priorSalary: optionalNumber,
  priorCostOfLivingAllowance: optionalNumber,
  priorSpecialCompensation: optionalNumber,
  priorSalaryAsOfDate: optionalString,
  priorPositionName: optionalString,
  priorPositionType: optionalString,
  priorPositionLevel: optionalString,
  priorPositionNo: optionalString,
  priorBureau: optionalString,
  priorDivision: optionalString,
  priorSubDivision: optionalString,
  priorDepartment: optionalString,
  priorMinistry: optionalString,
}

export const orderSchema = z
  .object({
    employeeId: z.number().positive("กรุณาเลือกข้าราชการ"),
    orderType: z.enum(ORDER_TYPE_VALUES, {
      message: "กรุณาเลือกประเภทคำสั่ง",
    }),
    orderNo: optionalString,
    issueDate: z.string().min(1, "กรุณาระบุวันที่ลงคำสั่ง"),
    effectiveDate: z.string().min(1, "กรุณาระบุวันที่มีผล"),
    ...snapshotFields,
  })
  .refine(
    (data) =>
      !data.salaryAsOfDate ||
      !data.effectiveDate ||
      data.salaryAsOfDate <= data.effectiveDate,
    {
      message: "เงินเดือน ณ วันที่ ต้องไม่เกินวันที่มีผล",
      path: ["salaryAsOfDate"],
    }
  )
  .refine(
    (data) =>
      !data.priorSalaryAsOfDate ||
      !data.effectiveDate ||
      data.priorSalaryAsOfDate <= data.effectiveDate,
    {
      message: "เงินเดือนเดิม ณ วันที่ ต้องไม่เกินวันที่มีผล",
      path: ["priorSalaryAsOfDate"],
    }
  )

export type OrderFormData = z.infer<typeof orderSchema>

export const orderFormDefaultValues: Partial<OrderFormData> = {
  orderType: "salary_increase",
  orderNo: "",
  issueDate: "",
  effectiveDate: "",
  salary: null,
  costOfLivingAllowance: null,
  specialCompensation: null,
  positionAllowance: null,
  compensationBeyondSalary: null,
  salaryAsOfDate: "",
  salarySystemType: "",
  positionName: "",
  positionType: "",
  positionLevel: "",
  positionNo: "",
  bureau: "",
  division: "",
  subDivision: "",
  department: "",
  ministry: "",
  note: "",
  priorSalary: null,
  priorCostOfLivingAllowance: null,
  priorSpecialCompensation: null,
  priorSalaryAsOfDate: "",
  priorPositionName: "",
  priorPositionType: "",
  priorPositionLevel: "",
  priorPositionNo: "",
  priorBureau: "",
  priorDivision: "",
  priorSubDivision: "",
  priorDepartment: "",
  priorMinistry: "",
}

/** Build defaultValues for edit form from an order record */
export function orderToFormDefaults(
  order: Record<string, unknown>
): Partial<OrderFormData> {
  return {
    employeeId: 0,
    orderType: (ORDER_TYPE_VALUES as readonly string[]).includes(String(order.orderType))
      ? (order.orderType as OrderType)
      : "other",
    orderNo: (order.orderNo as string) ?? "",
    issueDate: (order.issueDate as string) ?? "",
    effectiveDate: (order.effectiveDate as string) ?? "",
    salary: (order.salary as number | null) ?? null,
    costOfLivingAllowance: (order.costOfLivingAllowance as number | null) ?? null,
    specialCompensation: (order.specialCompensation as number | null) ?? null,
    positionAllowance: (order.positionAllowance as number | null) ?? null,
    compensationBeyondSalary: (order.compensationBeyondSalary as number | null) ?? null,
    salaryAsOfDate: (order.salaryAsOfDate as string) ?? "",
    salarySystemType: (order.salarySystemType as string) ?? "",
    positionName: (order.positionName as string) ?? "",
    positionType: (order.positionType as string) ?? "",
    positionLevel: (order.positionLevel as string) ?? "",
    positionNo: (order.positionNo as string) ?? "",
    bureau: (order.bureau as string) ?? "",
    division: (order.division as string) ?? "",
    subDivision: (order.subDivision as string) ?? "",
    department: (order.department as string) ?? "",
    ministry: (order.ministry as string) ?? "",
    note: (order.note as string) ?? "",
    priorSalary: (order.priorSalary as number | null) ?? null,
    priorCostOfLivingAllowance: (order.priorCostOfLivingAllowance as number | null) ?? null,
    priorSpecialCompensation: (order.priorSpecialCompensation as number | null) ?? null,
    priorSalaryAsOfDate: (order.priorSalaryAsOfDate as string) ?? "",
    priorPositionName: (order.priorPositionName as string) ?? "",
    priorPositionType: (order.priorPositionType as string) ?? "",
    priorPositionLevel: (order.priorPositionLevel as string) ?? "",
    priorPositionNo: (order.priorPositionNo as string) ?? "",
    priorBureau: (order.priorBureau as string) ?? "",
    priorDivision: (order.priorDivision as string) ?? "",
    priorSubDivision: (order.priorSubDivision as string) ?? "",
    priorDepartment: (order.priorDepartment as string) ?? "",
    priorMinistry: (order.priorMinistry as string) ?? "",
  }
}

/** Serialize validated form data for API POST/PUT */
export function orderFormToApiBody(data: OrderFormData) {
  return {
    orderType: data.orderType,
    orderNo: data.orderNo || null,
    issueDate: data.issueDate,
    effectiveDate: data.effectiveDate,
    salary: data.salary ?? null,
    costOfLivingAllowance: data.costOfLivingAllowance ?? null,
    specialCompensation: data.specialCompensation ?? null,
    positionAllowance: data.positionAllowance ?? null,
    compensationBeyondSalary: data.compensationBeyondSalary ?? null,
    salaryAsOfDate: data.salaryAsOfDate || null,
    salarySystemType: data.salarySystemType || null,
    positionName: data.positionName || null,
    positionType: data.positionType || null,
    positionLevel: data.positionLevel || null,
    positionNo: data.positionNo || null,
    bureau: data.bureau || null,
    division: data.division || null,
    subDivision: data.subDivision || null,
    department: data.department || null,
    ministry: data.ministry || null,
    note: data.note || null,
    priorSalary: data.priorSalary ?? null,
    priorCostOfLivingAllowance: data.priorCostOfLivingAllowance ?? null,
    priorSpecialCompensation: data.priorSpecialCompensation ?? null,
    priorSalaryAsOfDate: data.priorSalaryAsOfDate || null,
    priorPositionName: data.priorPositionName || null,
    priorPositionType: data.priorPositionType || null,
    priorPositionLevel: data.priorPositionLevel || null,
    priorPositionNo: data.priorPositionNo || null,
    priorBureau: data.priorBureau || null,
    priorDivision: data.priorDivision || null,
    priorSubDivision: data.priorSubDivision || null,
    priorDepartment: data.priorDepartment || null,
    priorMinistry: data.priorMinistry || null,
  }
}
