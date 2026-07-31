import type { PromotionCriteria } from "@/features/establishment/academic-period/api/types/promotion-criteria"

export const DEFAULT_PROMOTION_CRITERIA: PromotionCriteria = {
  curriculumNode: "",
  maxFailedRecovery: 0,
  absencePercentage: 0,
  maxLeveledSubjects: 0,
  maxFailedSubjects: 0,
  applyAverageApproval: true,
  basePercentage: 25,
  minimumSubjectPercentage: 25,
  maxFailedForAverage: 5,
  requiredSubjects: [],
}

export const promotionCriteriaDb: Record<number, PromotionCriteria> = {
  1: {
    curriculumNode: "AS",
    maxFailedRecovery: 3,
    absencePercentage: 20,
    maxLeveledSubjects: 2,
    maxFailedSubjects: 1,
    applyAverageApproval: true,
    basePercentage: 25,
    minimumSubjectPercentage: 25,
    maxFailedForAverage: 5,
    requiredSubjects: ["MATEMÁTICAS", "LENGUA CASTELLANA"],
  },
  2: {
    curriculumNode: "AR",
    maxFailedRecovery: 2,
    absencePercentage: 25,
    maxLeveledSubjects: 1,
    maxFailedSubjects: 1,
    applyAverageApproval: false,
    basePercentage: 30,
    minimumSubjectPercentage: 30,
    maxFailedForAverage: 3,
    requiredSubjects: ["INFORMÁTICA"],
  },
}
