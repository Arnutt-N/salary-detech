import ExcelJS from "exceljs"

export interface ImportWorkbookRow {
  citizenId?: string | number | null
  personName?: string | null
  orderTypeLabel?: string
  orderNo?: string
  issueDate?: string
  effectiveDate?: string
  salary?: number
  salaryAsOfDate?: string
  positionName?: string
  positionType?: string
  positionLevel?: string
  bureau?: string
  department?: string
  ministry?: string
  priorPositionName?: string
  priorSalary?: number
  priorSalaryAsOfDate?: string
}

const SALARY_HEADERS = [
  "ลำดับที่",
  "เลขประจำตัวประชาชน",
  "ชื่อ - นามสกุล",
  "ตำแหน่ง",
  "กระทรวง",
  "กรม",
  "สำนัก/กอง",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ",
  "ประเภทตำแหน่ง",
  "ระดับ",
  "เลขที่ตำแหน่ง",
  "เงินเดือน",
  "เงินเพิ่มการครองชีพชั่วคราว",
  "ค่าตอบแทนพิเศษ",
  "เงินเดือน ณ วันที่",
  "วันที่มีผล",
  "หมายเหตุ",
  "ประเภทคำสั่ง",
  "เลขที่คำสั่ง",
  "คำสั่งลงวันที่",
  "เงินประจำตำแหน่ง",
  "ค่าตอบแทนนอกเหนือจากเงินเดือน",
]

const MOVEMENT_HEADERS = [
  "ลำดับที่",
  "เลขประจำตัวประชาชน",
  "ชื่อ - นามสกุล",
  "ตำแหน่งที่เดิม",
  "กระทรวงที่เดิม",
  "กรมที่เดิม",
  "สำนัก/กองที่เดิม",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ ที่เดิม",
  "ประเภทตำแหน่งที่เดิม",
  "ระดับที่เดิม",
  "เลขที่ตำแหน่งที่เดิม",
  "เงินเดือนที่เดิม",
  "เงินเพิ่มการครองชีพชั่วคราวที่เดิม",
  "ค่าตอบแทนพิเศษที่เดิม",
  "เงินเดือนที่เดิม ณ วันที่",
  "ตำแหน่งที่แต่งตั้ง",
  "กระทรวงที่แต่งตั้ง",
  "กรมที่แต่งตั้ง",
  "สำนัก/กองที่แต่งตั้ง",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ ที่แต่งตั้ง",
  "ประเภทตำแหน่งที่แต่งตั้ง",
  "ระดับที่แต่งตั้ง",
  "เลขที่ตำแหน่งที่แต่งตั้ง",
  "เงินเดือนที่แต่งตั้ง",
  "เงินเพิ่มการครองชีพชั่วคราวที่แต่งตั้ง",
  "ค่าตอบแทนพิเศษที่แต่งตั้ง",
  "เงินเดือนที่แต่งตั้ง ณ วันที่",
  "วันที่มีผล",
  "หมายเหตุ",
  "ประเภทคำสั่ง",
  "เลขที่คำสั่ง",
  "คำสั่งลงวันที่",
  "เงินประจำตำแหน่ง",
  "ค่าตอบแทนนอกเหนือจากเงินเดือน",
]

function salaryDataRow(row: ImportWorkbookRow, seq = 1): (string | number | null)[] {
  return [
    seq,
    row.citizenId ?? null,
    row.personName ?? null,
    row.positionName ?? null,
    row.ministry ?? null,
    row.department ?? null,
    row.bureau ?? null,
    null,
    row.positionType ?? null,
    row.positionLevel ?? null,
    null,
    row.salary ?? null,
    null,
    null,
    row.salaryAsOfDate ?? row.effectiveDate ?? null,
    row.effectiveDate ?? null,
    null,
    row.orderTypeLabel ?? "เลื่อนเงินเดือน",
    row.orderNo ?? null,
    row.issueDate ?? row.effectiveDate ?? null,
    null,
    null,
  ]
}

function movementDataRow(row: ImportWorkbookRow, seq = 1): (string | number | null)[] {
  return [
    seq,
    row.citizenId ?? null,
    row.personName ?? null,
    row.priorPositionName ?? null,
    row.ministry ?? null,
    row.department ?? null,
    row.bureau ?? null,
    null,
    row.positionType ?? null,
    row.positionLevel ?? null,
    null,
    row.priorSalary ?? null,
    null,
    null,
    row.priorSalaryAsOfDate ?? null,
    row.positionName ?? null,
    row.ministry ?? null,
    row.department ?? null,
    row.bureau ?? null,
    null,
    row.positionType ?? null,
    row.positionLevel ?? null,
    null,
    row.salary ?? null,
    null,
    null,
    row.salaryAsOfDate ?? row.effectiveDate ?? null,
    row.effectiveDate ?? null,
    null,
    row.orderTypeLabel ?? "ย้าย",
    row.orderNo ?? null,
    row.issueDate ?? row.effectiveDate ?? null,
    null,
    null,
  ]
}

export async function buildImportWorkbook(options: {
  salaryRows?: ImportWorkbookRow[]
  movementRows?: ImportWorkbookRow[]
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()

  if (options.salaryRows?.length) {
    const ws = wb.addWorksheet("salary")
    ws.addRow(SALARY_HEADERS)
    options.salaryRows.forEach((row, i) => ws.addRow(salaryDataRow(row, i + 1)))
  }

  if (options.movementRows?.length) {
    const ws = wb.addWorksheet("movement")
    ws.addRow(MOVEMENT_HEADERS)
    options.movementRows.forEach((row, i) => ws.addRow(movementDataRow(row, i + 1)))
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

/** Sample row aligned with prisma/seed.ts demo person */
export const SEED_IMPORT_ROW: ImportWorkbookRow = {
  citizenId: "1100200300401",
  personName: "นางสาว สมหญิง ใจดี",
  orderTypeLabel: "เลื่อนเงินเดือน",
  orderNo: "ลน.2568/IMPORT-001",
  issueDate: "01/04/2568",
  effectiveDate: "01/04/2568",
  salary: 21000,
  salaryAsOfDate: "01/04/2568",
  positionName: "นักวิชาการเงินและบัญชีปฏิบัติการ",
  positionType: "วิชาการ",
  positionLevel: "ปฏิบัติการ",
  bureau: "กองคลัง",
  department: "กรมบัญชีกลาง",
  ministry: "กระทรวงการคลัง",
}
