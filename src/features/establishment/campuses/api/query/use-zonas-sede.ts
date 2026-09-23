import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

/** `valor` de "Urbana y Rural" en la categoría ZONA. */
const ZONA_MIXTA = "3"

interface ZonaRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

/**
 * `GET /establecimientos/sedes/zonas` — las zonas que una **sede** puede
 * tener, que no son las mismas que el catálogo ZONA completo.
 *
 * Endpoint propio y no `GET /select/ZONA?ESTABLECIMIENTO=`: esa forma existió
 * entre V414 y V478 y metía una regla de negocio de sedes dentro del catálogo
 * genérico, que usan ~15 pantallas que no tienen nada que ver.
 *
 * Dos reglas, las dos del backend:
 *
 * - **"Urbana y Rural" nunca sale**, haya o no establecimiento: describe un
 *   conjunto de sedes —que es lo que el establecimiento es—, no un edificio.
 * - **Con establecimiento**, las opciones se acotan a su zona: Urbana si es
 *   Urbana, Rural si es Rural, las dos si es mixto o no declaró zona. Es la
 *   misma regla que valida `fn_sed_crear` al guardar, así que la lista no
 *   ofrece nada que después vaya a ser rechazado.
 */
async function fetchZonasSede(establishmentId: number | null): Promise<CatalogItem[]> {
  if (env.ENABLE_API_MOCKING) {
    // El mock no conoce la zona de cada establecimiento, así que no puede
    // acotar por EE; sí aplica la regla que no depende de él.
    const zonas = await getCatalog<CatalogItem>(CATALOGS.ZONES)
    return zonas.filter((zona) => zona.code !== ZONA_MIXTA)
  }

  // Query string solo cuando hay establecimiento: sin él la URL es estable y
  // comparte caché de red entre todas las altas que aún no lo eligieron.
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

/**
 * `establishmentId` es opcional porque en el alta el selector de
 * establecimiento arranca vacío: mientras no haya uno elegido se ofrecen
 * Urbana y Rural, y al elegirlo la lista se reduce sola —el id entra en la
 * `queryKey`, así que cambiarlo vuelve a pedirla.
 */
export function useZonasSedeQuery(establishmentId: number | null) {
  return useQuery({
    queryKey: ["zonas-sede", establishmentId],
    queryFn: () => fetchZonasSede(establishmentId),
  })
}
