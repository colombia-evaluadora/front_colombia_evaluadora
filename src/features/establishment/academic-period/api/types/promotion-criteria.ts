export interface PromotionCriteria {
  curriculumNode: string
  maxFailedRecovery: number
  absencePercentage: number
  maxLeveledSubjects: number
  maxFailedSubjects: number
  applyAverageApproval: boolean
  basePercentage: number
  minimumSubjectPercentage: number
  maxFailedForAverage: number
  requiredSubjects: string[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
