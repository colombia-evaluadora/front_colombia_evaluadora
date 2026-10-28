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
  // Requisitos de grado del último grado de la Media (Regla 105).
  complementaryRequired: boolean
  // Requisitos de la norma marcados (códigos de NORM_REQUIREMENTS).
  normRequirements: string[]
  ownRequirements: string[]
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
