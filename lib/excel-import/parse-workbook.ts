import ExcelJS from "exceljs"
import { normalizeCitizenId } from "@/lib/citizen-id"
import { parseExcelDate } from "./parse-date"
import { resolveOrderTypeFromLabel } from "./order-type-labels"
import type { ImportPreviewRow, ImportPreviewResult, ImportSheetName, ParsedImportOrder } from "./types"

const IMPORT_SHEETS: ImportSheetName[] = ["movement", "salary", "resign"]

const SHEET_DEFAULT_ORDER_TYPE: Partial<Record<ImportSheetName, import("@/lib/order-types").OrderType>> = {
  resign: "resign",
}

/** Headers we never read as input */
const OUTPUT_HEADERS = new Set(["salary detech", "รายการแก้ไข"])

type ColumnMap = Record<string, keyof ParsedImportOrder | "citizenId" | "personName" | "orderTypeLabel">

const MOVEMENT_COLUMNS: ColumnMap = {
  "เลขประจำตัวประชาชน": "citizenId",
  "ชื่อ - นามสกุล": "personName",
  "ตำแหน่งที่เดิม": "priorPositionName",
  "กระทรวงที่เดิม": "priorMinistry",
  "กรมที่เดิม": "priorDepartment",
  "สำนัก/กองที่เดิม": "priorBureau",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ ที่เดิม": "priorSubDivision",
  "ประเภทตำแหน่งที่เดิม": "priorPositionType",
  "ระดับที่เดิม": "priorPositionLevel",
  "เลขที่ตำแหน่งที่เดิม": "priorPositionNo",
  "เงินเดือนที่เดิม": "priorSalary",
  "เงินเพิ่มการครองชีพชั่วคราวที่เดิม": "priorCostOfLivingAllowance",
  "ค่าตอบแทนพิเศษที่เดิม": "priorSpecialCompensation",
  "เงินเดือนที่เดิม ณ วันที่": "priorSalaryAsOfDate",
  "ตำแหน่งที่แต่งตั้ง": "positionName",
  "กระทรวงที่แต่งตั้ง": "ministry",
  "กรมที่แต่งตั้ง": "department",
  "สำนัก/กองที่แต่งตั้ง": "bureau",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ ที่แต่งตั้ง": "subDivision",
  "ประเภทตำแหน่งที่แต่งตั้ง": "positionType",
  "ระดับที่แต่งตั้ง": "positionLevel",
  "เลขที่ตำแหน่งที่แต่งตั้ง": "positionNo",
  "เงินเดือนที่แต่งตั้ง": "salary",
  "เงินเพิ่มการครองชีพชั่วคราวที่แต่งตั้ง": "costOfLivingAllowance",
  "ค่าตอบแทนพิเศษที่แต่งตั้ง": "specialCompensation",
  "เงินเดือนที่แต่งตั้ง ณ วันที่": "salaryAsOfDate",
  "วันที่มีผล": "effectiveDate",
  หมายเหตุ: "note",
  "ประเภทคำสั่ง": "orderTypeLabel",
  "เลขที่คำสั่ง": "orderNo",
  "คำสั่งลงวันที่": "issueDate",
  "เงินประจำตำแหน่ง": "positionAllowance",
  "ค่าตอบแทนนอกเหนือจากเงินเดือน": "compensationBeyondSalary",
}

const SINGLE_SNAPSHOT_COLUMNS: ColumnMap = {
  "เลขประจำตัวประชาชน": "citizenId",
  "ชื่อ - นามสกุล": "personName",
  ตำแหน่ง: "positionName",
  กระทรวง: "ministry",
  กรม: "department",
  "สำนัก/กอง": "bureau",
  "ต่ำกว่าสำนัก/กอง 1 ระดับ": "subDivision",
  "ประเภทตำแหน่ง": "positionType",
  ระดับ: "positionLevel",
  "เลขที่ตำแหน่ง": "positionNo",
  เงินเดือน: "salary",
  "เงินเพิ่มการครองชีพชั่วคราว": "costOfLivingAllowance",
  "ค่าตอบแทนพิเศษ": "specialCompensation",
  "เงินเดือน ณ วันที่": "salaryAsOfDate",
  "วันที่มีผล": "effectiveDate",
  หมายเหตุ: "note",
  "ประเภทคำสั่ง": "orderTypeLabel",
  "เลขที่คำสั่ง": "orderNo",
  "คำสั่งลงวันที่": "issueDate",
  "เงินประจำตำแหน่ง": "positionAllowance",
  "ค่าตอบแทนนอกเหนือจากเงินเดือน": "compensationBeyondSalary",
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null
  if (typeof value === "number" && !Number.isNaN(value)) return value
  const n = Number(String(value).replace(/,/g, "").trim())
  return Number.isNaN(n) ? null : n
}

function parseString(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function buildHeaderIndex(row: ExcelJS.Row, columnMap: ColumnMap): Map<number, ColumnMap[string]> {
  const index = new Map<number, ColumnMap[string]>()
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const header = normalizeHeader(cell.value)
    if (!header || OUTPUT_HEADERS.has(header.toLowerCase())) return
    const field = columnMap[header]
    if (field) index.set(colNumber, field)
  })
  return index
}

function isRowEmpty(row: ExcelJS.Row, headerIndex: Map<number, ColumnMap[string]>): boolean {
  let hasData = false
  for (const col of headerIndex.keys()) {
    const v = row.getCell(col).value
    if (v != null && String(v).trim() !== "") {
      hasData = true
      break
    }
  }
  return !hasData
}

function parseSheetRow(
  sheet: ImportSheetName,
  row: ExcelJS.Row,
  headerIndex: Map<number, ColumnMap[string]>,
  rowNumber: number
): ImportPreviewRow {
  const errors: string[] = []
  const warnings: string[] = []
  const raw: Record<string, unknown> = {}

  for (const [col, field] of headerIndex.entries()) {
    raw[field] = row.getCell(col).value
  }

  const citizenId = normalizeCitizenId(raw.citizenId)
  const personName = parseString(raw.personName)

  if (!citizenId && !personName) {
    return {
      sheet,
      rowNumber,
      citizenId,
      personName,
      employeeId: null,
      matchStatus: "skipped",
      order: null,
      errors: [],
      warnings: [],
    }
  }

  const orderTypeLabel = raw.orderTypeLabel
  const orderType = resolveOrderTypeFromLabel(orderTypeLabel, SHEET_DEFAULT_ORDER_TYPE[sheet])
  if (!orderType) {
    errors.push(
      personName || citizenId
        ? `ไม่รู้จักประเภทคำสั่ง "${String(orderTypeLabel ?? "").trim() || "(ว่าง)"}"`
        : "ไม่ระบุประเภทคำสั่ง"
    )
  }

  const effectiveDate = parseExcelDate(raw.effectiveDate)
  if (!effectiveDate) errors.push("วันที่มีผลไม่ถูกต้องหรือว่าง")

  const issueDate = parseExcelDate(raw.issueDate) ?? effectiveDate
  if (!issueDate && effectiveDate) warnings.push("ใช้วันที่มีผลแทนวันที่ลงคำสั่ง")

  const order: ParsedImportOrder = {
    citizenId,
    personName,
    orderType: orderType ?? "other",
    orderNo: parseString(raw.orderNo),
    issueDate: issueDate ?? effectiveDate ?? "",
    effectiveDate: effectiveDate ?? "",
    salary: parseNumber(raw.salary),
    costOfLivingAllowance: parseNumber(raw.costOfLivingAllowance),
    specialCompensation: parseNumber(raw.specialCompensation),
    positionAllowance: parseNumber(raw.positionAllowance),
    compensationBeyondSalary: parseNumber(raw.compensationBeyondSalary),
    salaryAsOfDate: parseExcelDate(raw.salaryAsOfDate),
    positionName: parseString(raw.positionName),
    positionType: parseString(raw.positionType),
    positionLevel: parseString(raw.positionLevel),
    positionNo: parseString(raw.positionNo),
    bureau: parseString(raw.bureau),
    division: parseString(raw.division),
    subDivision: parseString(raw.subDivision),
    department: parseString(raw.department),
    ministry: parseString(raw.ministry),
    note: parseString(raw.note),
    priorSalary: parseNumber(raw.priorSalary),
    priorCostOfLivingAllowance: parseNumber(raw.priorCostOfLivingAllowance),
    priorSpecialCompensation: parseNumber(raw.priorSpecialCompensation),
    priorSalaryAsOfDate: parseExcelDate(raw.priorSalaryAsOfDate),
    priorPositionName: parseString(raw.priorPositionName),
    priorPositionType: parseString(raw.priorPositionType),
    priorPositionLevel: parseString(raw.priorPositionLevel),
    priorPositionNo: parseString(raw.priorPositionNo),
    priorBureau: parseString(raw.priorBureau),
    priorDivision: parseString(raw.priorDivision),
    priorSubDivision: parseString(raw.priorSubDivision),
    priorDepartment: parseString(raw.priorDepartment),
    priorMinistry: parseString(raw.priorMinistry),
  }

  if (order.salaryAsOfDate && order.effectiveDate && order.salaryAsOfDate > order.effectiveDate) {
    errors.push("เงินเดือน ณ วันที่ ต้องไม่เกินวันที่มีผล")
  }

  return {
    sheet,
    rowNumber,
    citizenId,
    personName,
    employeeId: null,
    matchStatus: errors.length > 0 ? "not_found" : "not_found",
    order: errors.length > 0 ? null : order,
    errors,
    warnings,
  }
}

function parseWorksheet(sheetName: ImportSheetName, worksheet: ExcelJS.Worksheet): ImportPreviewRow[] {
  const columnMap = sheetName === "movement" ? MOVEMENT_COLUMNS : SINGLE_SNAPSHOT_COLUMNS
  const headerRow = worksheet.getRow(1)
  const headerIndex = buildHeaderIndex(headerRow, columnMap)

  if (headerIndex.size === 0) {
    return [
      {
        sheet: sheetName,
        rowNumber: 1,
        citizenId: null,
        personName: null,
        employeeId: null,
        matchStatus: "skipped",
        order: null,
        errors: [`แผ่น "${sheetName}" ไม่พบหัวคอลัมน์ที่รองรับ`],
        warnings: [],
      },
    ]
  }

  const rows: ImportPreviewRow[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    if (isRowEmpty(row, headerIndex)) return
    rows.push(parseSheetRow(sheetName, row, headerIndex, rowNumber))
  })
  return rows
}

export async function parseImportWorkbook(buffer: ArrayBuffer | Buffer): Promise<ImportPreviewResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ExcelJS.Buffer)

  const rows: ImportPreviewRow[] = []
  for (const sheetName of IMPORT_SHEETS) {
    const ws = workbook.getWorksheet(sheetName)
    if (!ws) continue
    rows.push(...parseWorksheet(sheetName, ws))
  }

  const dataRows = rows.filter((r) => r.matchStatus !== "skipped" || r.errors.length > 0)
  const ready = dataRows.filter((r) => r.order && r.errors.length === 0).length
  const errors = dataRows.filter((r) => r.errors.length > 0).length
  const skipped = rows.filter((r) => r.matchStatus === "skipped" && r.errors.length === 0).length

  const bySheet: Record<ImportSheetName, number> = {
    movement: 0,
    salary: 0,
    resign: 0,
  }
  for (const r of dataRows.filter((x) => x.order)) {
    bySheet[r.sheet]++
  }

  return {
    rows: dataRows,
    summary: {
      total: dataRows.length,
      ready,
      errors,
      skipped,
      bySheet,
    },
  }
}
