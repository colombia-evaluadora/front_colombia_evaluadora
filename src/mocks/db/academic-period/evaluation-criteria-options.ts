import type {
  CriteriaOption,
  EvaluationCriteriaOptions,
} from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// En el mock el `key` y el `label` coinciden (el back real podría mandar un
// código distinto del texto). Centraliza el armado de las opciones.
const opt = (values: string[]): CriteriaOption[] =>
  values.map((value) => ({ key: value, label: value }))

export const evaluationCriteriaOptionsDb: EvaluationCriteriaOptions = {
  // El formato de calificación define el rango de la nota mínima y máxima.
  // La base es 0 - 100; los demás son variantes comunes.
  gradingFormat: opt(["0 - 100", "0 - 10", "0 - 5", "1 - 5"]),
  studentWithoutGradesPerformance: opt(["Bajo", "No evaluado", "Pendiente"]),
  initialGrade: opt(["0.0", "1.0"]),
  maxRecoveryGrade: opt(["3.0", "3.5", "4.0", "5.0"]),
  roundingMode: opt([
    "Redondear al más cercano",
    "Redondear hacia arriba",
    "Redondear hacia abajo",
    "Truncar",
  ]),
  periodCalculationElements: opt([
    "Solo actividades",
    "Actividades + examen",
    "Ponderado por competencias",
  ]),
  subjectGradeCriteria: opt(["Promedio", "Promedio ponderado", "Última nota"]),
  areaGradeCriteria: opt([
    "Promedio de asignaturas",
    "Promedio ponderado",
    "Asignatura de mayor intensidad",
  ]),
  finalGradeCriteria: opt([
    "Promedio de los períodos",
    "Promedio ponderado por peso",
    "Último período",
  ]),
}
