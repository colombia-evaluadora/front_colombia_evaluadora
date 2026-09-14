import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { RecursoTipo } from "@/features/planeador/api/types/actividad"

/**
 * Catálogo `TIPO_RECURSO` de `TLISTA_VALOR` (`GET /eval-col/select/:CATEGORIA`)
 * — resuelve el `tipoRecurso` que pide `PUT /planeador/actividades/:id/materiales`
 * (confirmado real, colección Postman `planeador-guia-completa`, 4.7:
 * `{"tipoRecurso":"{{tipoRecursoUrlId}}", ...}`, con `tipoRecursoUrlId`
 * documentado como "PK TLISTA_VALOR categoría TIPO_RECURSO (variante URL)").
 *
 * Mismo criterio de match por substring en `nombre` que
 * `use-calculo-definitiva-catalog.ts` (no tenemos confirmado el texto/`valor`
 * exacto de cada variante, solo que "URL" es una de ellas) — `nombre` es más
 * estable para matchear en texto libre que `valor`, que en este módulo ya
 * viene con casos no obvios (ver `INSTRUMENTO_EVALUACION_POR_CODIGO`).
 */
function toRecursoTipo(nombre: string): RecursoTipo | undefined {
  const lower = nombre.toLowerCase()
  if (lower.includes("url") || lower.includes("sitio web")) return "URL"
  if (lower.includes("archivo")) return "Archivo"
  if (lower.includes("virtual") || lower.includes("repositorio")) return "Unidad virtual"
  return undefined
}

export interface TipoRecursoOption {
  id: number
  tipo: RecursoTipo
}

/** No es un hook (no usa caché de React Query): se llama directo desde la
 *  mutación de materiales, que necesita el `id` real al armar el body, no en
 *  el render del form — mismo criterio que `fetchCalculoDefinitivaOptions`. */
export async function fetchTipoRecursoOptions(): Promise<TipoRecursoOption[]> {
  const rows = await fetchSelectCategory("TIPO_RECURSO")
  return rows
    .map((row) => {
      const tipo = toRecursoTipo(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoRecursoOption => option != null)
}

export async function resolveTipoRecursoId(tipo: RecursoTipo): Promise<number | undefined> {
  const options = await fetchTipoRecursoOptions()
  return options.find((o) => o.tipo === tipo)?.id
}
