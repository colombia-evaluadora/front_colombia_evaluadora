import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { desenvolver } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { reintegracionKeys } from "@/features/gestion-estudiantil/reintegracion/api/query-keys"
import { BASE_REINTEGRACION } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import type { IntervencionDetalle, IntervencionRow } from "@/features/gestion-estudiantil/reintegracion/api/types"

/** `GET /casos/:ID/intervenciones`: por fecha de realización (o programada) y luego id. */
export function useIntervencionesQuery(casoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: reintegracionKeys.intervenciones(casoId ?? "none"),
    queryFn: () => evalCol.getRows<IntervencionRow>(`${BASE_REINTEGRACION}/casos/${casoId}/intervenciones`),
    enabled: enabled && casoId != null,
    retry: false,
  })
}

/** `GET /casos/:ID/intervenciones/:INTERVENCION` → columna `datos`. */
export function useIntervencionQuery(casoId: number | undefined, intervencionId: number | undefined) {
  return useQuery({
    queryKey: reintegracionKeys.intervencion(casoId ?? "none", intervencionId ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_REINTEGRACION}/casos/${casoId}/intervenciones/${intervencionId}`)
        .then((r) => desenvolver<IntervencionDetalle>(r[0], "datos", "No se encontró la intervención del caso.")),
    enabled: casoId != null && intervencionId != null,
    retry: false,
  })
}
