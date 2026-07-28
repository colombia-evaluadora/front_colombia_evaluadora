import type { EvaluationCriteria } from "@/features/establishment/api/types/academic-period/evaluation-criteria"

export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  gradingFormat: "",
  gradingScale: "",
  periodCalculationElements: "",
  subjectGradeCriteria: "",
  finalGradeCriteria: "",
  areaGradeCriteria: "",
  studentWithoutGradesPerformance: "",
  maxRecoveryGrade: "",
  roundingMode: "",
  initialGrade: "",
}

export const evaluationCriteriaDb: Record<number, EvaluationCriteria> = {
  1: {
    gradingFormat: "Numérico",
    gradingScale: "Escala nacional (1.0 - 5.0)",
    periodCalculationElements: "Actividades + examen",
    subjectGradeCriteria: "Promedio ponderado",
    finalGradeCriteria: "Promedio ponderado por peso",
    areaGradeCriteria: "Promedio de asignaturas",
    studentWithoutGradesPerformance: "No evaluado",
    maxRecoveryGrade: "3.0",
    roundingMode: "Redondear al más cercano",
    initialGrade: "1.0",
  },
  2: {
    gradingFormat: "Cualitativo",
    gradingScale: "Cualitativa (Bajo/Básico/Alto/Superior)",
    periodCalculationElements: "Ponderado por competencias",
    subjectGradeCriteria: "Promedio",
    finalGradeCriteria: "Promedio de los períodos",
    areaGradeCriteria: "Promedio ponderado",
    studentWithoutGradesPerformance: "Pendiente",
    maxRecoveryGrade: "3.5",
    roundingMode: "Truncar",
    initialGrade: "0.0",
  },
}
