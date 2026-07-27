// Criterios de evaluación de un periodo académico.
export interface EvaluationCriteria {
  gradingFormat: string
  gradingScale: string
  periodCalculationElements: string
  finalGradeCriteria: string
  areaGradeCriteria: string
  studentWithoutGradesPerformance: string
  maxRecoveryGrade: string
  roundingMode: string
  initialGrade: string
}

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
