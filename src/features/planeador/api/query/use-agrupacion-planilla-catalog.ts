import { useQuery } from "@tanstack/react-query"

import type { SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/** Las dos únicas formas de agrupar columnas que entiende la Planilla —
 *  "Actividades" las deja sueltas, "Unidad" las agrupa bajo la unidad
 *  temática de cada actividad (`PlanillaColumna.unidad`). */
export type AgrupacionPlanillaKey = "actividad" | "unidad"

export interface AgrupacionPlanillaOption {
  key: AgrupacionPlanillaKey
  label: string
}

/**
 * Confirmado real (colección Postman `planeador-delta-cambios`, punto 7):
 * `valor` es exactamente `"ACTIVIDAD"` / `"UNIDAD"`, estable entre bases —
 * la propia colección advierte comparar por acá y no por `pk_lista_valor`
 * (los pks no son estables). Antes se emparejaba por prefijo del `nombre`
 * (el label), el mismo tipo de fragilidad que rompió "Otro (personalizado)"
 * en `use-instrumento-evaluacion-catalog.ts` cuando el label cambió sin
 * avisar y el código seguía comparando contra el texto viejo.
 */
function toKey(row: SelectCategoryRow): AgrupacionPlanillaKey | null {
  const valor = row.valor.trim().toUpperCase()
  if (valor === "ACTIVIDAD") return "actividad"
  if (valor === "UNIDAD") return "unidad"
  return null
}

/**
 * Catálogo `AGRUPACION_PLANILLA` de `TLISTA_VALOR` — resuelve el "Ver por"
 * de la Planilla de calificación, antes hardcodeado como `VER_POR_OPTIONS`.
 * Mismo patrón que `use-instrumento-evaluacion-catalog.ts`.
 *
 * OJO: no confundir con `ELEMENTO_CALCULO_DEF` (otro catálogo real, que
 * resuelve un campo de Periodos Académicos sin relación con el Planeador —
 * ver `use-evaluation-criteria-options.ts`) — coincidencia de nombres de
 * opciones la vez pasada llevó a cablear el "Ver por" contra ese catálogo
 * equivocado.
 */
async function fetchAgrupacionPlanillaOptions(): Promise<AgrupacionPlanillaOption[]> {
  const rows = await fetchSelectCategory("AGRUPACION_PLANILLA")
  const options: AgrupacionPlanillaOption[] = []
  for (const row of rows) {
    const key = toKey(row)
    if (key && !options.some((o) => o.key === key)) {
      options.push({ key, label: row.nombre })
    }
  }
  return options
}

export const agrupacionPlanillaOptionsQueryKey = () => ["agrupacion-planilla-options"]

export function useAgrupacionPlanillaOptionsQuery() {
  return useQuery({
    queryKey: agrupacionPlanillaOptionsQueryKey(),
    queryFn: fetchAgrupacionPlanillaOptions,
    staleTime: Infinity,
  })
}
