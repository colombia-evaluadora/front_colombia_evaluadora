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
