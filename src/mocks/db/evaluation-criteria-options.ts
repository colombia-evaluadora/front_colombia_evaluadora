import type { EvaluationCriteriaOptions } from "@/features/establishment/api/types/academic-period/evaluation-criteria"

export const evaluationCriteriaOptionsDb: EvaluationCriteriaOptions = {
  gradingScale: [
    "Escala nacional (1.0 - 5.0)",
    "Escala (0 - 100)",
    "Cualitativa (Bajo/Básico/Alto/Superior)",
  ],
  gradingFormat: ["Numérico", "Cualitativo", "Mixto"],
  studentWithoutGradesPerformance: ["Bajo", "No evaluado", "Pendiente"],
  initialGrade: ["0.0", "1.0"],
  maxRecoveryGrade: ["3.0", "3.5", "4.0", "5.0"],
  roundingMode: [
    "Redondear al más cercano",
    "Redondear hacia arriba",
    "Redondear hacia abajo",
    "Truncar",
  ],
  periodCalculationElements: [
    "Solo actividades",
    "Actividades + examen",
    "Ponderado por competencias",
  ],
  subjectGradeCriteria: ["Promedio", "Promedio ponderado", "Última nota"],
  areaGradeCriteria: [
    "Promedio de asignaturas",
    "Promedio ponderado",
    "Asignatura de mayor intensidad",
  ],
  finalGradeCriteria: [
    "Promedio de los períodos",
    "Promedio ponderado por peso",
    "Último período",
  ],
}
