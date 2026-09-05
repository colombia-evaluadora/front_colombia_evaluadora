import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { Actividad } from "@/features/planeador/api/types/actividad"

const ACTIVIDAD_LIST_URL = "/planeador/actividad/query"

export const actividadesQueryKey = () =>
  ["planeador", "actividades"] as const

function fetchActividades(): Promise<Actividad[]> {
  // `evalCol.getRows` desenvuelve el sobre `{rows: [...]}` del gateway.
  return evalCol.getRows<Actividad>(ACTIVIDAD_LIST_URL)
}

export function useActividadesQuery() {
  return useQuery({
    queryKey: actividadesQueryKey(),
    queryFn: fetchActividades,
    // Mantiene la lista anterior mientras se revalida — evita el flash a
    // "Sin actividades" cuando se navega de vuelta al listado.
    placeholderData: (previous) => previous,
    // `0`: cada vez que se entra a cualquier pantalla de Actividades (lista,
    // detalle, crear, editar) se revalida contra el backend en vez de
    // confiar en el cache por un rato — la lista se ve al toque gracias al
    // `placeholderData` de arriba, pero siempre se refresca detrás.
    staleTime: 0,
  })
}