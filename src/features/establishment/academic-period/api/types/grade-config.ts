import type { PromotionCriteria } from "./promotion-criteria"

export type ScheduleCells = Record<string, Record<string, string>>

export interface GradeSchedule {
  byGroup: Record<string, ScheduleCells>
}

export interface GradeConfig {
  promotionCriteria?: PromotionCriteria
  schedule?: GradeSchedule
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
