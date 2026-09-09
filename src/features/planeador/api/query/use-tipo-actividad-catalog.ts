import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import type { ActividadTipo } from "@/features/planeador/api/types/actividad"

// Catálogo global `TIPO_ACTIVIDAD` de `TLISTA_VALOR`
// (`GET /eval-col/select/TIPO_ACTIVIDAD`) — resuelve `FK_TLV_TIPO_ACTIVIDAD`
// en `fn_actividad_crear`/`_actualizar` (V224, colección Postman
// `planeador-actividad`). Mismo patrón que `use-grados-catalog.ts`.
async function fetchTipoActividadCatalog(): Promise<ActividadTipo[]> {
  const rows = await fetchSelectCategory("TIPO_ACTIVIDAD")
  return rows.map((row) => row.nombre as ActividadTipo)
}

export const tipoActividadCatalogQueryKey = () => ["tipo-actividad-catalog"]

export function useTipoActividadCatalogQuery() {
  return useQuery({
    queryKey: tipoActividadCatalogQueryKey(),
    queryFn: fetchTipoActividadCatalog,
    staleTime: Infinity,
  })
}

/** No es un hook: se llama directo desde `create-actividad.ts`/
 *  `update-actividad.ts`, que necesitan el `pk_lista_valor` real
 *  (`FK_TLV_TIPO_ACTIVIDAD`) en el momento de armar el body, no en el
 *  render del form (que solo usa el nombre para el `<Select>`). */
export async function resolveTipoActividadId(tipo: ActividadTipo): Promise<number | undefined> {
  const rows = await fetchSelectCategory("TIPO_ACTIVIDAD")
  return rows.find((row) => row.nombre === tipo)?.pk_lista_valor
}
