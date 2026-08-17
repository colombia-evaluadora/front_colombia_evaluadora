import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// Criterios por defecto que se le devuelven al cliente cuando todavía no
// guardó nada propio. La escala de valoración queda en blanco a propósito:
// depende de las rating scales creadas y se elige manualmente.
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  gradingFormat: "0 - 100",
  periodCalculationElements: "Actividades + examen",
  subjectGradeCriteria: "Promedio ponderado",
  finalGradeCriteria: "Promedio ponderado por peso",
  areaGradeCriteria: "Promedio de asignaturas",
  studentWithoutGradesPerformance: "No evaluado",
  maxRecoveryGrade: 3.0,
  roundingMode: "Redondear al más cercano",
  initialGrade: 1.0,
}

export const evaluationCriteriaDb: Record<number, EvaluationCriteria> = {}
