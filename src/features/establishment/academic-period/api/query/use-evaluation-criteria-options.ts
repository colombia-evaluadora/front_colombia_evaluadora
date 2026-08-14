import { useQuery } from "@tanstack/react-query"

import type { EvaluationCriteriaOptions } from "@/features/establishment/academic-period/api/types/evaluation-criteria"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Categorías de `TLISTA_VALOR` confirmadas leyendo el body de
// `fn_criterio_eval_actualizar` (cada `FK_TLV_*` de TCRITERIO_EVALUACION
// dice de qué categoría sale) — actualizado con V78: `roundingMode` ahora
// sale de `MODO_REDONDEAR` (antes columna NUMERIC plana, ahora FK a
// catálogo) y `subjectGradeCriteria` usa `TIPO_CALCULO` (antes
// `MODIF_FINAL_PERACA`, que era de otro campo y nunca matcheaba).
// `initialGrade` y `maxRecoveryGrade` NO son catálogos — quedan como listas
// vacías (el primero es columna NUMERIC, el segundo no tiene columna
// todavía, ver use-evaluation-criteria.ts).
const CATEGORY_BY_FIELD = {
  gradingFormat: "FORMATO_CALIFICACION",
  periodCalculationElements: "ELEMENTO_CALCULO_DEF",
  subjectGradeCriteria: "TIPO_CALCULO",
  finalGradeCriteria: "CRITERIO_FINAL_PERACA",
  areaGradeCriteria: "CRITERIO_AREA",
  studentWithoutGradesPerformance: "DESEMPENIOSUGERIR",
  roundingMode: "MODO_REDONDEAR",
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
    // Las opciones son `Record<fk, label>` — el form guarda el FK (string) y
    // el `items` prop del Select lo usa para mostrar el nombre en el trigger.
    // El save envía el FK como `:BODY.GRADING_FORMAT` etc. (BIGINT en el
    // back — ver error "se declaró como BIGINT pero el cliente envió String"
    // cuando se mandaba el nombre en V78).
    result[field] = lists[index].map((row) => ({
      key: String(row.pk_lista_valor),
      label: row.nombre,
    }))
  })
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
