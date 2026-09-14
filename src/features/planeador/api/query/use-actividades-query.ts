import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import { normalizeActividad } from "@/features/planeador/lib/normalize-actividad"

const ACTIVIDAD_LIST_URL = "/planeador/actividades"

// El contrato real exige `size`/`offset` explícitos en la query string —
// omitirlos devuelve 500 (bug conocido del query-service). La UI todavía no
// pagina el listado, así que se manda un `size` grande de una sola vez en
// vez de armar el estado de paginación.
const PAGE_SIZE = 500

export const actividadesQueryKey = () =>
  ["planeador", "actividades"] as const

async function fetchActividades(): Promise<Actividad[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway.
  const rows = await evalCol.getRows<Actividad>(
    `${ACTIVIDAD_LIST_URL}?size=${PAGE_SIZE}&offset=0`,
  )
  return rows.map(normalizeActividad)
}

/**
 * `enabled` (default `true`) lo usa `DialogBibliotecaRecursos` para no
 * traer TODAS las actividades del docente (`size=500`) apenas se monta el
 * form de la actividad — el modal vive siempre montado (solo oculto) para
 * poder abrirse sin remontar, así que sin este gate el `GET .../actividades`
 * completo se disparaba en cada alta/edición aunque el docente nunca
 * abriera "Biblioteca de recursos".
 */
export function useActividadesQuery(enabled = true) {
  return useQuery({
    queryKey: actividadesQueryKey(),
    queryFn: fetchActividades,
    enabled,
    // Mantiene la lista anterior mientras se revalida — evita el flash a
    // "Sin actividades" cuando se navega de vuelta al listado.
    placeholderData: (previous) => previous,
    staleTime: 1000 * 30,
  })
}
