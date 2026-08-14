import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
}

// TODO: la query real (GET /establecimientos/sedes/:ID, fn_sed_buscar_por_pk)
// devuelve columnas crudas de TSEDE (PK_TSEDE, CODIGO, NOMBRE, FK_TLV_ZONA
// como id suelto sin resolver, etc.), envueltas en `{ rows: [...] }` — no
// el `{ status, campus }` que espera este hook. Falta el adaptador que
// traduzca esa fila a `Campus` (y resuelva `zone` a `CatalogItem`, hoy
// solo viaja el id). Se deja señalado, no se resolvió en esta sesión.
function fetchCampus(id: number): Promise<CampusQueryResult> {
  return api.get(apiPath(`/establishments/campuses/${id}`, `/establecimientos/sedes/${id}`))
}

export function useCampusQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["campuses", id],
    queryFn: () => fetchCampus(id as number),
    enabled: enabled && Boolean(id),
  })
}