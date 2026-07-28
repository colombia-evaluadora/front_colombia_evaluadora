// Criterios de evaluación de un periodo académico.
export interface EvaluationCriteria {
  gradingFormat: string
  gradingScale: string
  periodCalculationElements: string
  subjectGradeCriteria: string
  finalGradeCriteria: string
  areaGradeCriteria: string
  studentWithoutGradesPerformance: string
  maxRecoveryGrade: string
  roundingMode: string
  initialGrade: string
}

export type EvaluationCriteriaOptions = Record<
  keyof EvaluationCriteria,
  string[]
>

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
