// Criterios de evaluación de un periodo académico. Todos los campos basados
// en TLISTA_VALOR almacenan el FK como string (PK_LISTA_VALOR) — es lo que
// espera `fn_criterio_eval_actualizar` (`:BODY.GRADING_FORMAT AS BIGINT`,
// etc.). El nombre se resuelve en el render del Select vía el `items` prop,
// que mapea FK → label del catálogo. `gradingScale` es opcional porque no
// todas las establecimientos tienen escala creada.
export interface EvaluationCriteria {
  gradingFormat: string
  gradingScale?: string
  periodCalculationElements: string
  subjectGradeCriteria: string
  finalGradeCriteria: string
  areaGradeCriteria: string
  studentWithoutGradesPerformance: string
  // Rango numérico dependiente del formato de calificación seleccionado
  // (0-5 / 0-10 / 0-100). V78: pasaron de selects a inputs numéricos.
  maxRecoveryGrade: number
  roundingMode: string
  initialGrade: number
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
