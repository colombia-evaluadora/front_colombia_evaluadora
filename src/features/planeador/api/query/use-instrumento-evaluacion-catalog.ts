import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

// Catálogo global `INSTRUMENTO_EVALUACION` de `TLISTA_VALOR`
// (`GET /eval-col/select/INSTRUMENTO_EVALUACION`) — resuelve
// `FK_TLV_INSTRUMENTO_EVALUACION` (V226/V240, colección Postman
// `planeador-instrumentos`). Mismo patrón que `use-grados-catalog.ts`.
//
// El resto del Planeador compara `instrumento` contra strings fijos
// ("Otro", "Rúbrica", "Lista de cotejo", "Escala de valoración" — ver
// `InstrumentoEvaluacionSection` en form-editar-actividad.tsx), así que acá
// se resuelve por `valor` (código estable de TLISTA_VALOR) y no por
// `nombre`: el backend real ya devuelve `nombre: "Otro (personalizado)"`
// para `valor: "OTRO"` en vez del "Otro" que asumía el mock, y confiar en
// el label rompía esa comparación (el form caía siempre a `RubricasSection`
// sin mostrar la sección de instrumento personalizado).
const INSTRUMENTO_EVALUACION_POR_CODIGO: Record<string, string> = {
  RUBRICA: "Rúbrica",
  LISTA_COTEJO: "Lista de cotejo",
  ESCALA_VALORACION: "Escala de valoración",
  OTRO: "Otro",
}

async function fetchInstrumentoEvaluacionCatalog(): Promise<string[]> {
  const rows = await fetchSelectCategory("INSTRUMENTO_EVALUACION")
  return rows.map((row) => INSTRUMENTO_EVALUACION_POR_CODIGO[row.valor] ?? row.nombre)
}

export const instrumentoEvaluacionCatalogQueryKey = () => ["instrumento-evaluacion-catalog"]

export function useInstrumentoEvaluacionCatalogQuery() {
  return useQuery({
    queryKey: instrumentoEvaluacionCatalogQueryKey(),
    queryFn: fetchInstrumentoEvaluacionCatalog,
    staleTime: Infinity,
  })
}

export interface InstrumentoEvaluacionOption {
  id: number
  nombre: string
}

/** No es un hook: se llama directo desde las mutaciones de crear/editar
 *  actividad y definir instrumento, que necesitan el `id` real al armar el
 *  body — mismo criterio que `resolveCalculoDefinitivaId`. */
async function fetchInstrumentoEvaluacionOptions(): Promise<InstrumentoEvaluacionOption[]> {
  const rows = await fetchSelectCategory("INSTRUMENTO_EVALUACION")
  return rows.map((row) => ({
    id: row.pk_lista_valor,
    nombre: INSTRUMENTO_EVALUACION_POR_CODIGO[row.valor] ?? row.nombre,
  }))
}

/**
 * Resuelve `FK_TLV_INSTRUMENTO_EVALUACION` (al crear/editar la actividad) y
 * `metodoValoracion` del instrumento "Otro" (`PUT .../instrumento`, colección
 * Postman `planeador-instrumentos-tipos-completo`, 5.3 — restringido a
 * RUBRICA|LISTA_COTEJO|ESCALA_VALORACION, el front nunca pide "Otro" acá).
 */
export async function resolveInstrumentoEvaluacionId(nombre: string): Promise<number | undefined> {
  const options = await fetchInstrumentoEvaluacionOptions()
  return options.find((o) => o.nombre === nombre)?.id
}
