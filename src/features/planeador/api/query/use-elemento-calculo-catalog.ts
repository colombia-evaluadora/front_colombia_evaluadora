import { useQuery } from "@tanstack/react-query"

import type { SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

/** Las dos únicas formas de agrupar columnas que entiende la Planilla —
 *  el resto de valores que pueda traer el catálogo (se reusa también en
 *  `use-evaluation-criteria-options.ts` para otro campo) se ignoran acá.
 *
 *  CONFIRMADO en vivo: el catálogo trae "Instrumentos" (valor `"1"`) y
 *  "Actividades" (valor `"2"`) — no "Actividad"/"Unidad" como se asumió al
 *  principio. "Instrumentos" agrupa las columnas de la grilla por el
 *  instrumento de evaluación de cada actividad (`PlanillaColumna.instrumentoNombre`),
 *  "Actividades" las deja sin agrupar. */
export type ElementoCalculoKey = "actividad" | "instrumento"

export interface ElementoCalculoOption {
  key: ElementoCalculoKey
  label: string
}

function toKey(row: SelectCategoryRow): ElementoCalculoKey | null {
  // `valor` es el código estable ("1"/"2"); el nombre es solo lo que se
  // muestra y podría no repetirse igual entre entornos.
  if (row.valor === "2") return "actividad"
  if (row.valor === "1") return "instrumento"
  const nombre = row.nombre.trim().toLowerCase()
  if (nombre.startsWith("activ")) return "actividad"
  if (nombre.startsWith("instru")) return "instrumento"
  return null
}

/**
 * Catálogo `ELEMENTO_CALCULO_DEF` de `TLISTA_VALOR` — resuelve el "Ver por"
 * de la Planilla de calificación, antes hardcodeado como `VER_POR_OPTIONS`.
 * Mismo patrón que `use-instrumento-evaluacion-catalog.ts`.
 */
async function fetchElementoCalculoOptions(): Promise<ElementoCalculoOption[]> {
  const rows = await fetchSelectCategory("ELEMENTO_CALCULO_DEF")
  const options: ElementoCalculoOption[] = []
  for (const row of rows) {
    const key = toKey(row)
    if (key && !options.some((o) => o.key === key)) {
      options.push({ key, label: row.nombre })
    }
  }
  return options
}

export const elementoCalculoOptionsQueryKey = () => ["elemento-calculo-def-options"]

export function useElementoCalculoOptionsQuery() {
  return useQuery({
    queryKey: elementoCalculoOptionsQueryKey(),
    queryFn: fetchElementoCalculoOptions,
    staleTime: Infinity,
  })
}
