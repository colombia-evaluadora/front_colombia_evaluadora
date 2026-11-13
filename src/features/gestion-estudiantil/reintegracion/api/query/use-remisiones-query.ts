import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import type {
  PlazoRemisiones,
  RemisionExternaDetalle,
  RemisionRow,
} from "@/features/gestion-estudiantil/reintegracion/api/types"

export const BASE_COMUN = "/gestion-estudiantil"

/** `GET /casos/:ID/remisiones` (§10.4): `puede_gestionar` es el mismo para todas las filas del caso. */
export function useRemisionesQuery(casoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.remisiones(casoId ?? "none"),
    queryFn: () => evalCol.getRows<RemisionRow>(`${BASE_REINTEGRACION}/casos/${casoId}/remisiones`),
    enabled: enabled && casoId != null,
    retry: false,
  })
}

/** `GET /remisiones-externas/:ID` (común, V669) → columna `datos`. */
export function useRemisionExternaQuery(remisionId: number | undefined) {
  return useQuery({
    queryKey: reintegracionKeys.remisionExterna(remisionId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_COMUN}/remisiones-externas/${remisionId}`)
        .then((r) => desenvolver<RemisionExternaDetalle>(r[0], "datos", "No se encontró la remisión.")),
    enabled: remisionId != null,
    retry: false,
  })
}

/** `GET /configuracion-remisiones/plazo` (común, V669): plazo de seguimiento en días hábiles. */
export function usePlazoRemisionesQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: reintegracionKeys.plazo(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<PlazoRemisiones>(
          `${BASE_COMUN}/configuracion-remisiones/plazo${queryString({ ESTABLECIMIENTO: establecimiento })}`,
        )
        .then((r) => r[0] ?? null),
    enabled: establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}
