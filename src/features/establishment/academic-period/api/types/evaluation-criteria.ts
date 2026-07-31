// Criterios de evaluación de un periodo académico.
export interface EvaluationCriteria {
  gradingFormat: string
  // Opcional: la escala de valoración se elige entre los niveles de enseñanza
  // que tengan escalas creadas; si todavía no se creó ninguna, queda en blanco.
  gradingScale?: string
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
  Exclude<keyof EvaluationCriteria, "gradingScale">,
  string[]
>

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
