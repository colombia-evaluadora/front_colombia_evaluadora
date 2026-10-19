import { catalogoMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { campusKeys } from "@/features/establishment/campuses/api/query-keys"

/** `valor` de "Urbana y Rural" en la categoría ZONA. */
const ZONA_MIXTA = "3"

interface ZonaRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

// Zonas válidas para una sede: nunca "Urbana y Rural"; con EE se acotan a su
// zona (misma regla que valida `fn_sed_crear`).
async function fetchZonasSede(establishmentId: number | null): Promise<CatalogItem[]> {
  if (env.ENABLE_API_MOCKING) {
    // El mock no conoce la zona del EE; solo quita "Urbana y Rural".
    const zonas = await getCatalog<CatalogItem>(CATALOGS.ZONES)
    return zonas.filter((zona) => zona.code !== ZONA_MIXTA)
  }

  // Sin EE la URL es estable y comparte caché.
  const search = establishmentId == null ? "" : `?ESTABLECIMIENTO=${encodeURIComponent(establishmentId)}`

  try {
    const response = (await api.get(`/eval-col/establecimientos/sedes/zonas${search}`)) as unknown as
      | { rows: ZonaRow[] }
      | ZonaRow[]
    return unwrapRows<ZonaRow>(response).map((row) => ({
      id: row.pk_lista_valor,
      code: row.valor,
      name: row.nombre,
    }))
  } catch {
    throw new Error("No fue posible obtener las zonas")
  }
}

export function useZonasSedeQuery(establishmentId: number | null) {
  return useQuery({
    queryKey: campusKeys.zonas(establishmentId),
    meta: catalogoMeta(),
    queryFn: () => fetchZonasSede(establishmentId),
  })
}
