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

// Opción de un select de criterios: `key` es el valor que se guarda/manda,
// `label` el texto visible. Tal como lo entrega el backend.
export interface CriteriaOption {
  key: string
  label: string
}

export type EvaluationCriteriaOptions = Record<
  Exclude<keyof EvaluationCriteria, "gradingScale">,
  CriteriaOption[]
>

export interface MutationResult {
  status: "ok" | "error"
  message: string
}
