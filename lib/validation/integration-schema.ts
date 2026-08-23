import { z } from "zod"

/**
 * Zod contracts for /api/v1/integrations/* payloads (DPIS / external HR).
 * Records are validated per-item so one bad row never fails the whole
 * batch; unknown DPIS fields are tolerated via passthrough.
 */

export const MAX_SYNC_RECORDS = 1000
export const MAX_LOOKUP_IDS = 500

const optionalStr = z.string().optional().nullable()
const optionalNumOrStr = z.union([z.number(), z.string()]).optional().nullable()

export const dpisPersonRecordSchema = z
  .object({
    per_id: optionalNumOrStr,
    per_cardno: optionalStr,
    pn_name: optionalStr,
    per_name: optionalStr,
    per_surname: optionalStr,
    pos_name: optionalStr,
    pos_no: optionalStr,
    pt_name: optionalStr,
    level_no: optionalStr,
    level_name: optionalStr,
    org_name_bureau: optionalStr,
    org_name_division: optionalStr,
    org_name_department: optionalStr,
    org_name_ministry: optionalStr,
    per_salary: optionalNumOrStr,
    salary_system_type: optionalStr,
    per_gender: optionalNumOrStr,
    per_birthdate: optionalStr,
    per_startdate: optionalStr,
    per_retiredate: optionalStr,
    per_active: optionalNumOrStr,
  })
  .passthrough()

export const dpisOrderRecordSchema = z
  .object({
    com_no: optionalStr,
    com_date: optionalStr,
    cmd_date: optionalStr,
    mov_code: optionalStr,
    cmd_seq: optionalNumOrStr,
    per_cardno: optionalStr,
    employee_id: z.coerce.number().optional().nullable(),
    cmd_salary: optionalNumOrStr,
    cmd_spsalary: optionalNumOrStr,
    cmd_old_salary: optionalNumOrStr,
    cost_of_living: optionalNumOrStr,
    pos_allowance: optionalNumOrStr,
    salary_as_of_date: optionalStr,
    pos_name: optionalStr,
    pos_no: optionalStr,
    pt_name: optionalStr,
    level_no: optionalStr,
    level_name: optionalStr,
    org_bureau: optionalStr,
    org_division: optionalStr,
    org_subdivision: optionalStr,
    org_department: optionalStr,
    org_ministry: optionalStr,
    cmd_position: optionalStr,
    cmd_level: optionalStr,
    cmd_org1: optionalStr,
    cmd_org2: optionalStr,
    cmd_org3: optionalStr,
    cmd_org4: optionalStr,
    cmd_org5: optionalStr,
    note: optionalStr,
  })
  .passthrough()

export const freshnessCheckSchema = z
  .object({
    orderIds: z.array(z.coerce.number()).max(MAX_LOOKUP_IDS).optional().nullable(),
    employeeIds: z.array(z.coerce.number()).max(MAX_LOOKUP_IDS).optional().nullable(),
  })
  .refine((v) => (v.orderIds?.length ?? 0) + (v.employeeIds?.length ?? 0) > 0, {
    message: "Provide orderIds (array) or employeeIds (array)",
  })

export function zodIssueSummary(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")
}
