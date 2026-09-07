import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Actividad } from "@/features/planeador/api/types/actividad"

const ACTIVIDAD_LIST_URL = "/planeador/actividades"

// El contrato real exige `size`/`offset` explícitos en la query string —
// omitirlos devuelve 500 (bug conocido del query-service). La UI todavía no
// pagina el listado, así que se manda un `size` grande de una sola vez en
// vez de armar el estado de paginación.
const PAGE_SIZE = 500

export const actividadesQueryKey = () =>
  ["planeador", "actividades"] as const

function fetchActividades(): Promise<Actividad[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway.
  return evalCol.getRows<Actividad>(`${ACTIVIDAD_LIST_URL}?size=${PAGE_SIZE}&offset=0`)
}

export function useActividadesQuery() {
  return useQuery({
    queryKey: actividadesQueryKey(),
    queryFn: fetchActividades,
    // Mantiene la lista anterior mientras se revalida — evita el flash a
    // "Sin actividades" cuando se navega de vuelta al listado.
    placeholderData: (previous) => previous,
    staleTime: 1000 * 30,
  })
}
