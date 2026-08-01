import type { PromotionCriteria } from "@/features/establishment/academic-period/api/types/promotion-criteria"

export const DEFAULT_PROMOTION_CRITERIA: PromotionCriteria = {
  curriculumNode: "",
  maxFailedRecovery: 0,
  absencePercentage: 0,
  maxLeveledSubjects: 0,
  applyAverageApproval: true,
  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 5,
  requiredSubjects: [],
}

export const promotionCriteriaDb: Record<number, PromotionCriteria> = {}
