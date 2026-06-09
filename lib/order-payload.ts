/** Map API/form body → Prisma Order create/update data */

type Nullable<T> = T | null | undefined

export interface OrderInputBody {
  employeeId?: number
  batchId?: Nullable<number>
  orderType?: string
  orderNo?: Nullable<string>
  issueDate?: string
  effectiveDate?: string
  orderStatus?: string
  salary?: Nullable<number>
  costOfLivingAllowance?: Nullable<number>
  specialCompensation?: Nullable<number>
  positionAllowance?: Nullable<number>
  compensationBeyondSalary?: Nullable<number>
  salaryAsOfDate?: Nullable<string>
  salarySystemType?: Nullable<string>
  positionName?: Nullable<string>
  positionType?: Nullable<string>
  positionLevel?: Nullable<string>
  positionNo?: Nullable<string>
  bureau?: Nullable<string>
  division?: Nullable<string>
  subDivision?: Nullable<string>
  department?: Nullable<string>
  ministry?: Nullable<string>
  note?: Nullable<string>
  priorSalary?: Nullable<number>
  priorCostOfLivingAllowance?: Nullable<number>
  priorSpecialCompensation?: Nullable<number>
  priorSalaryAsOfDate?: Nullable<string>
  priorPositionName?: Nullable<string>
  priorPositionType?: Nullable<string>
  priorPositionLevel?: Nullable<string>
  priorPositionNo?: Nullable<string>
  priorBureau?: Nullable<string>
  priorDivision?: Nullable<string>
  priorSubDivision?: Nullable<string>
  priorDepartment?: Nullable<string>
  priorMinistry?: Nullable<string>
}

function orNull<T>(v: Nullable<T>): T | null {
  return v === undefined || v === "" ? null : (v as T)
}

export function orderInputToCreateData(body: OrderInputBody) {
  return {
    employeeId: body.employeeId!,
    batchId: orNull(body.batchId),
    orderType: body.orderType!,
    orderNo: orNull(body.orderNo),
    issueDate: body.issueDate!,
    effectiveDate: body.effectiveDate!,
    salary: orNull(body.salary),
    costOfLivingAllowance: orNull(body.costOfLivingAllowance),
    specialCompensation: orNull(body.specialCompensation),
    positionAllowance: orNull(body.positionAllowance),
    compensationBeyondSalary: orNull(body.compensationBeyondSalary),
    salaryAsOfDate: orNull(body.salaryAsOfDate),
    salarySystemType: orNull(body.salarySystemType),
    positionName: orNull(body.positionName),
    positionType: orNull(body.positionType),
    positionLevel: orNull(body.positionLevel),
    positionNo: orNull(body.positionNo),
    bureau: orNull(body.bureau),
    division: orNull(body.division),
    subDivision: orNull(body.subDivision),
    department: orNull(body.department),
    ministry: orNull(body.ministry),
    note: orNull(body.note),
    priorSalary: orNull(body.priorSalary),
    priorCostOfLivingAllowance: orNull(body.priorCostOfLivingAllowance),
    priorSpecialCompensation: orNull(body.priorSpecialCompensation),
    priorSalaryAsOfDate: orNull(body.priorSalaryAsOfDate),
    priorPositionName: orNull(body.priorPositionName),
    priorPositionType: orNull(body.priorPositionType),
    priorPositionLevel: orNull(body.priorPositionLevel),
    priorPositionNo: orNull(body.priorPositionNo),
    priorBureau: orNull(body.priorBureau),
    priorDivision: orNull(body.priorDivision),
    priorSubDivision: orNull(body.priorSubDivision),
    priorDepartment: orNull(body.priorDepartment),
    priorMinistry: orNull(body.priorMinistry),
    orderStatus: body.orderStatus ?? "active",
  }
}

export function orderInputToUpdateData(body: OrderInputBody, existing: OrderInputBody) {
  const merged: OrderInputBody = { ...existing, ...body }
  const full = orderInputToCreateData(merged)
  const { employeeId: _e, batchId: _b, orderStatus: _s, ...updateData } = full
  return updateData
}
