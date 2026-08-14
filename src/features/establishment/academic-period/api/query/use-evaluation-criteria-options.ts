import { useQuery } from "@tanstack/react-query"

import type { EvaluationCriteriaOptions } from "@/features/establishment/academic-period/api/types/evaluation-criteria"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Categorías de `TLISTA_VALOR` confirmadas leyendo el body de
// `fn_criterio_eval_actualizar` (cada `FK_TLV_*` de TCRITERIO_EVALUACION
// dice de qué categoría sale) — coincide con los ids por defecto que ya
// estaban anotados en memoria (academic-endpoints-pending). `roundingMode`,
// `initialGrade` y `maxRecoveryGrade` NO son catálogos de TLISTA_VALOR (los
// dos primeros son columnas NUMERIC planas en TCRITERIO_EVALUACION; el
// tercero no tiene columna en absoluto, ver use-evaluation-criteria.ts) —
// quedan como listas vacías, no hay categoría real que inventarles.
const CATEGORY_BY_FIELD = {
  gradingFormat: "FORMATO_CALIFICACION",
  periodCalculationElements: "ELEMENTO_CALCULO_DEF",
  subjectGradeCriteria: "MODIF_FINAL_PERACA",
  finalGradeCriteria: "CRITERIO_FINAL_PERACA",
  areaGradeCriteria: "CRITERIO_AREA",
  studentWithoutGradesPerformance: "DESEMPENIOSUGERIR",
} as const

async function fetchEvaluationCriteriaOptions(): Promise<EvaluationCriteriaOptions> {
  const entries = Object.entries(CATEGORY_BY_FIELD) as [
    keyof typeof CATEGORY_BY_FIELD,
    string,
  ][]
  const lists = await Promise.all(
    entries.map(([, categoria]) => fetchSelectCategory(categoria))
  )
  const result = {} as EvaluationCriteriaOptions
  entries.forEach(([field], index) => {
    result[field] = lists[index].map((row) => ({
      key: String(row.pk_lista_valor),
      label: row.nombre,
    }))
  })
  result.roundingMode = []
  result.initialGrade = []
  result.maxRecoveryGrade = []
  return result
}

export const evaluationCriteriaOptionsQueryKey = () => [
  "evaluation-criteria-options",
]

export function useEvaluationCriteriaOptionsQuery() {
  return useQuery({
    queryKey: evaluationCriteriaOptionsQueryKey(),
    queryFn: fetchEvaluationCriteriaOptions,
    staleTime: Infinity,
  })
}
