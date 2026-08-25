export interface PromotionCriteria {
  curriculumNode: string
  maxFailedRecovery: number
  absencePercentage: number
  maxLeveledSubjects: number
  applyAverageApproval: boolean
  basePercentage: number
  minimumSubjectPercentage: number
  maxFailedForAverage: number
  requiredSubjects: number[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
