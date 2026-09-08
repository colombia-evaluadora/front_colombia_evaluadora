import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ActividadExportada,
  ExportarActividadesFiltro,
} from "@/features/planeador/api/types/actividad-intercambio"

const EXPORTAR_URL = "/eval-col/planeador/actividades/exportar"

/**
 * El sobre real varía según cómo resolvió el gateway esta función (ver el
 * test script de la colección Postman, que contempla las tres formas: bare
 * array, `{actividades:[...]}` o `{rows:[{actividades:[...]}]}`) — se
 * tolera cualquiera en vez de asumir una sola.
 */
function resolveActividadesArray(body: unknown): ActividadExportada[] {
  if (Array.isArray(body)) return body as ActividadExportada[]
  const asObject = body as
    | { actividades?: unknown; rows?: { actividades?: unknown }[] }
    | null
    | undefined
  if (Array.isArray(asObject?.actividades)) {
    return asObject.actividades as ActividadExportada[]
  }
  const fromRows = asObject?.rows?.[0]?.actividades
  return Array.isArray(fromRows) ? (fromRows as ActividadExportada[]) : []
}

/** Solo se manda la clave si el filtro aplica: el binder real rechaza un
 *  `FK_*` opcional mandado como cadena vacía. */
function buildFiltroBody(filtro: ExportarActividadesFiltro): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (filtro.ids && filtro.ids.length > 0) body.IDS = filtro.ids
  if (filtro.unidadId != null) body.PK_TUNIDAD = filtro.unidadId
  if (filtro.asignaturaId != null) body.FK_TASIGNATURA = filtro.asignaturaId
  if (filtro.grupoId != null) body.FK_TGRUPO = filtro.grupoId
  return body
}

/**
 * `POST /planeador/actividades/exportar` (confirmado real, colección
 * Postman `planeador-actividades-exportar-importar`). Una actividad y varias
 * son el MISMO endpoint — `IDS` con un elemento es el caso de una sola.
 *
 * Hace falta al menos un filtro (`IDS`/`PK_TUNIDAD`/`FK_TASIGNATURA`/
 * `FK_TGRUPO`) — el backend responde `22023` sin ninguno, así que este
 * mismo mensaje del interceptor de `api` ya lo tostea si el llamador se
 * olvida de armar el filtro.
 */
async function exportarActividades(
  filtro: ExportarActividadesFiltro,
): Promise<ActividadExportada[]> {
  const body = await api.post(EXPORTAR_URL, buildFiltroBody(filtro))
  return resolveActividadesArray(body)
}

interface UseExportarActividadesJsonOptions {
  mutationConfig?: MutationConfig<typeof exportarActividades>
}

export function useExportarActividadesJson({
  mutationConfig,
}: UseExportarActividadesJsonOptions = {}) {
  return useMutation({
    mutationFn: exportarActividades,
    ...mutationConfig,
  })
}
