import type { EvaluationCriteria } from "@/features/establishment/academic-period/api/types/evaluation-criteria"

// Catálogos de Lista de Valores de los criterios de evaluación (Sección 5.6).
// Ids propios por categoría para que no choquen entre sí.
function catalog(base: number, nombres: string[]) {
  return nombres.map((nombre, i) => ({ id: base + i, nombre }))
}

export const EVALUATION_CRITERIA_CATALOGS = {
  ESCALA_VALORACION: catalog(901, ["Cada nivel tendrá su escala", "Una sola escala para el período"]),
  FORMATO_CALIFICACION: catalog(911, ["De cero a cinco", "De cero a diez", "De cero a cien"]),
  DESEMPENIOSUGERIR: catalog(921, ["Menor calificación posible", "No tener en cuenta"]),
  MODO_REDONDEAR: catalog(931, ["Hacia arriba", "Hacia abajo", "No redondear"]),
  MODO_RECUPERACION: catalog(941, ["Usar nota de recuperación", "Ponderar"]),
  ELEMENTO_CALCULO_DEF: catalog(951, ["Actividades", "Unidades temáticas"]),
  TIPO_CALCULO: catalog(961, ["Promediado", "Ponderado"]),
  CRITERIO_AREA: catalog(971, [
    "Cada asignatura tiene un porcentaje",
    "Proporcional a la intensidad horaria",
    "Promedio de las asignaturas del área",
  ]),
  CRITERIO_FINAL_PERACA: catalog(981, [
    "Equitativamente de acuerdo al número de períodos de evaluación",
    "De acuerdo al porcentaje de cada período de evaluación",
  ]),
} as const

const id = (categoria: keyof typeof EVALUATION_CRITERIA_CATALOGS, nombre: string) =>
  String(EVALUATION_CRITERIA_CATALOGS[categoria].find((o) => o.nombre === nombre)!.id)

// Registro único (Regla 44): el período nace con la columna "Predeterminado"
// del md.
export const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  ratingScaleMode: id("ESCALA_VALORACION", "Cada nivel tendrá su escala"),
  gradingFormat: id("FORMATO_CALIFICACION", "De cero a diez"),
  studentWithoutGradesPerformance: id("DESEMPENIOSUGERIR", "Menor calificación posible"),
  initialGrade: 1,
  maxRecoveryGrade: 9,
  roundingMode: id("MODO_REDONDEAR", "Hacia arriba"),
  recoveryMode: id("MODO_RECUPERACION", "Usar nota de recuperación"),
  recoveryPercentage: null,
  periodCalculationElements: id("ELEMENTO_CALCULO_DEF", "Actividades"),
  subjectGradeCriteria: id("TIPO_CALCULO", "Promediado"),
  areaGradeCriteria: id("CRITERIO_AREA", "Cada asignatura tiene un porcentaje"),
  finalGradeCriteria: id("CRITERIO_FINAL_PERACA", "Equitativamente de acuerdo al número de períodos de evaluación"),
}

export function evaluationCriteriaName(id: string | number | null | undefined): string | null {
  if (id == null || id === "") return null
  for (const options of Object.values(EVALUATION_CRITERIA_CATALOGS)) {
    const found = options.find((o) => o.id === Number(id))
    if (found) return found.nombre
  }
  return null
}

export const evaluationCriteriaDb: Record<number, EvaluationCriteria> = {}
