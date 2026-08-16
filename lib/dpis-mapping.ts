/**
 * Data Mapping & Normalization Engine between DPIS (192 tables) and Salary Detech
 */

import { resolveOrderTypeFromDpisMovCode, resolvePositionLevel } from "./dpis-master-data"

export interface DpisPersonRaw {
  per_id?: number | string
  per_cardno?: string
  pn_name?: string
  per_name?: string
  per_surname?: string
  pos_name?: string
  pos_no?: string
  pt_name?: string
  level_no?: string
  level_name?: string
  org_name_bureau?: string
  org_name_division?: string
  org_name_department?: string
  org_name_ministry?: string
  per_salary?: number | string
  salary_system_type?: string
  per_gender?: number | string
  per_birthdate?: string
  per_startdate?: string
  per_retiredate?: string
  per_active?: number | string
}

export interface DpisOrderRaw {
  com_no?: string
  com_date?: string
  cmd_date?: string // effective date
  mov_code?: string
  cmd_seq?: number | string
  per_cardno?: string
  employee_id?: number
  // Salary
  cmd_salary?: number | string
  cmd_spsalary?: number | string
  cmd_old_salary?: number | string
  cost_of_living?: number | string
  pos_allowance?: number | string
  salary_as_of_date?: string
  // New Position & Org
  pos_name?: string
  pos_no?: string
  pt_name?: string
  level_no?: string
  level_name?: string
  org_bureau?: string
  org_division?: string
  org_subdivision?: string
  org_department?: string
  org_ministry?: string
  // Prior Position & Org
  cmd_position?: string
  cmd_level?: string
  cmd_org1?: string // กระทรวง
  cmd_org2?: string // กรม
  cmd_org3?: string // สำนัก/กอง
  cmd_org4?: string // ฝ่าย/กลุ่ม
  cmd_org5?: string
  note?: string
}

/**
 * Format string date (e.g. "2026-05-01 00:00:00" or "20260501" or "01/05/2569") to ISO YYYY-MM-DD
 */
export function normalizeIsoDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const clean = dateStr.trim().split(" ")[0]

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean

  // YYYYMMDD
  if (/^\d{8}$/.test(clean)) {
    const y = clean.substring(0, 4)
    const m = clean.substring(4, 6)
    const d = clean.substring(6, 8)
    return `${y}-${m}-${d}`
  }

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split("/")
    let numY = parseInt(y, 10)
    if (numY > 2400) numY -= 543 // convert Buddhist year
    return `${numY}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  return clean
}

/**
 * Map raw DPIS person record to Salary Detech Person input
 */
export function mapDpisPersonToModel(raw: DpisPersonRaw) {
  return {
    citizenId: raw.per_cardno ? raw.per_cardno.trim() : null,
    nameTitle: raw.pn_name?.trim() || null,
    firstName: raw.per_name?.trim() || null,
    lastName: raw.per_surname?.trim() || null,
    currentPositionName: raw.pos_name?.trim() || null,
    currentPositionType: raw.pt_name?.trim() || null,
    currentPositionLevel: resolvePositionLevel(raw.level_name || raw.level_no),
    currentBureau: raw.org_name_bureau?.trim() || null,
    currentDivision: raw.org_name_division?.trim() || null,
    currentDepartment: raw.org_name_department?.trim() || null,
    currentMinistry: raw.org_name_ministry?.trim() || null,
    currentSalary: raw.per_salary ? Number(raw.per_salary) : null,
    salarySystemType: raw.salary_system_type?.trim() || "แท่ง",
    gender: raw.per_gender ? String(raw.per_gender) : null,
    birthDate: normalizeIsoDate(raw.per_birthdate),
    startDate: normalizeIsoDate(raw.per_startdate),
    retireDate: normalizeIsoDate(raw.per_retiredate),
    positionNo: raw.pos_no?.trim() || null,
    isActive: raw.per_active !== 0 && raw.per_active !== "0",
  }
}

/**
 * Map raw DPIS order / movement record to Salary Detech Order input
 */
export function mapDpisOrderToModel(raw: DpisOrderRaw, employeeId: number) {
  const orderType = resolveOrderTypeFromDpisMovCode(raw.mov_code)
  const effectiveDate = normalizeIsoDate(raw.cmd_date) || new Date().toISOString().split("T")[0]
  const issueDate = normalizeIsoDate(raw.com_date) || effectiveDate

  return {
    employeeId,
    orderType,
    orderNo: raw.com_no?.trim() || null,
    issueDate,
    effectiveDate,
    movementCode: raw.mov_code?.trim() || null,
    cmdSeq: raw.cmd_seq ? Number(raw.cmd_seq) : null,
    // New Snapshot
    salary: raw.cmd_salary != null ? Number(raw.cmd_salary) : null,
    specialCompensation: raw.cmd_spsalary != null ? Number(raw.cmd_spsalary) : null,
    costOfLivingAllowance: raw.cost_of_living != null ? Number(raw.cost_of_living) : null,
    positionAllowance: raw.pos_allowance != null ? Number(raw.pos_allowance) : null,
    salaryAsOfDate: normalizeIsoDate(raw.salary_as_of_date) || effectiveDate,
    positionName: raw.pos_name?.trim() || null,
    positionType: raw.pt_name?.trim() || null,
    positionLevel: resolvePositionLevel(raw.level_name || raw.level_no),
    positionNo: raw.pos_no?.trim() || null,
    bureau: raw.org_bureau?.trim() || null,
    division: raw.org_division?.trim() || null,
    subDivision: raw.org_subdivision?.trim() || null,
    department: raw.org_department?.trim() || null,
    ministry: raw.org_ministry?.trim() || null,
    note: raw.note?.trim() || null,
    // Prior Snapshot
    priorSalary: raw.cmd_old_salary != null ? Number(raw.cmd_old_salary) : null,
    priorPositionName: raw.cmd_position?.trim() || null,
    priorPositionLevel: resolvePositionLevel(raw.cmd_level),
    priorMinistry: raw.cmd_org1?.trim() || null,
    priorDepartment: raw.cmd_org2?.trim() || null,
    priorBureau: raw.cmd_org3?.trim() || null,
    priorDivision: raw.cmd_org4?.trim() || null,
    priorSubDivision: raw.cmd_org5?.trim() || null,
    // Lifecycle
    orderStatus: "active",
  }
}
