import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { configuracionKeys } from "@/features/gestion-estudiantil/configuracion/api/query-keys"
import type { AccesoConfiguracion, NivelesConvivencia } from "@/features/gestion-estudiantil/configuracion/api/types"

export const BASE_CONFIGURACION = "/gestion-estudiantil/configuracion"

/** `GET /configuracion/acceso`: qué puede el usuario en las pestañas de Configuración (403 sin CONFIGURACION_GE/VER). */
export function useAccesoConfiguracionQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.acceso(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<AccesoConfiguracion>(`${BASE_CONFIGURACION}/acceso${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => r[0] ?? null),
    enabled: establecimiento != null,
    retry: false,
    staleTime: 60_000,
  })
}

/** `GET /configuracion/niveles-convivencia` (§3.6). */
export function useNivelesConvivenciaQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: configuracionKeys.niveles(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<NivelesConvivencia>(
          `${BASE_CONFIGURACION}/niveles-convivencia${queryString({ ESTABLECIMIENTO: establecimiento })}`,
        )
        .then((r) => r[0] ?? null),
    enabled: establecimiento != null,
    retry: false,
  })
}
