import type { OrderInputBody } from "@/lib/order-payload"

export type ImportSheetName = "movement" | "salary" | "resign"

export interface ParsedImportOrder extends Omit<OrderInputBody, "employeeId" | "batchId" | "orderStatus"> {
  citizenId?: string | null
  personName?: string | null
}

export interface ImportPreviewRow {
  sheet: ImportSheetName
  rowNumber: number
  citizenId: string | null
  personName: string | null
  employeeId: number | null
  matchStatus: "matched" | "not_found" | "ambiguous" | "skipped"
  order: ParsedImportOrder | null
  errors: string[]
  warnings: string[]
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[]
  summary: {
    total: number
    ready: number
    errors: number
    skipped: number
    bySheet: Record<ImportSheetName, number>
  }
}

export interface ImportCommitResult {
  created: number
  skipped: number
  errors: string[]
}
