import { z } from "zod"
import { isValidCitizenId, normalizeCitizenId } from "@/lib/citizen-id"

const optionalString = z.string().optional().nullable()
const optionalNumber = z
  .number()
  .optional()
  .nullable()
  .or(z.nan().transform(() => null))

export const personSchema = z.object({
  citizenId: z
    .string()
    .optional()
    .nullable()
    .refine((v) => isValidCitizenId(v), {
      message: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
    }),
  nameTitle: optionalString,
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  currentPositionName: optionalString,
  currentPositionType: optionalString,
  currentPositionLevel: optionalString,
  currentBureau: optionalString,
  currentDivision: optionalString,
  currentDepartment: optionalString,
  currentMinistry: optionalString,
  currentSalary: optionalNumber,
  salarySystemType: optionalString,
  currentQualification: optionalString,
  qualificationEffectiveDate: optionalString,
  isActive: z.boolean(),
})

export type PersonFormData = z.infer<typeof personSchema>

export const personFormDefaultValues: Partial<PersonFormData> = {
  citizenId: "",
  nameTitle: "",
  firstName: "",
  lastName: "",
  currentPositionName: "",
  currentPositionType: "",
  currentPositionLevel: "",
  currentBureau: "",
  currentDivision: "",
  currentDepartment: "",
  currentMinistry: "",
  currentSalary: null,
  salarySystemType: "",
  currentQualification: "",
  qualificationEffectiveDate: "",
  isActive: true,
}

export function personToFormDefaults(person: Record<string, unknown>): Partial<PersonFormData> {
  return {
    citizenId: (person.citizenId as string) ?? "",
    nameTitle: (person.nameTitle as string) ?? "",
    firstName: (person.firstName as string) ?? "",
    lastName: (person.lastName as string) ?? "",
    currentPositionName: (person.currentPositionName as string) ?? "",
    currentPositionType: (person.currentPositionType as string) ?? "",
    currentPositionLevel: (person.currentPositionLevel as string) ?? "",
    currentBureau: (person.currentBureau as string) ?? "",
    currentDivision: (person.currentDivision as string) ?? "",
    currentDepartment: (person.currentDepartment as string) ?? "",
    currentMinistry: (person.currentMinistry as string) ?? "",
    currentSalary: (person.currentSalary as number | null) ?? null,
    salarySystemType: (person.salarySystemType as string) ?? "",
    currentQualification: (person.currentQualification as string) ?? "",
    qualificationEffectiveDate: (person.qualificationEffectiveDate as string) ?? "",
    isActive: person.isActive !== false,
  }
}

function orNullString(v: string | null | undefined) {
  return v === undefined || v === "" ? null : v
}

export function personFormToApiBody(data: PersonFormData) {
  return {
    citizenId: normalizeCitizenId(data.citizenId),
    nameTitle: orNullString(data.nameTitle),
    firstName: data.firstName,
    lastName: data.lastName,
    currentPositionName: orNullString(data.currentPositionName),
    currentPositionType: orNullString(data.currentPositionType),
    currentPositionLevel: orNullString(data.currentPositionLevel),
    currentBureau: orNullString(data.currentBureau),
    currentDivision: orNullString(data.currentDivision),
    currentDepartment: orNullString(data.currentDepartment),
    currentMinistry: orNullString(data.currentMinistry),
    currentSalary: data.currentSalary ?? null,
    salarySystemType: orNullString(data.salarySystemType),
    currentQualification: orNullString(data.currentQualification),
    qualificationEffectiveDate: orNullString(data.qualificationEffectiveDate),
    isActive: data.isActive ?? true,
  }
}
