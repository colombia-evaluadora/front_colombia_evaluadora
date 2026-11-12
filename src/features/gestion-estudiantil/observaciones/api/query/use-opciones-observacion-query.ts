import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { observacionesKeys } from "@/features/gestion-estudiantil/observaciones/api/query-keys"
import { BASE_OBSERVACIONES } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import type {
  OpcionEstudianteObservacion,
  OpcionGrupoObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"

/**
 * `GET /observaciones-sugerencias/opciones/grupos`. `REGISTRAR`: los grupos que el usuario dirige (el
 * selector del formulario); `FILTRO`: los de su alcance de lectura.
 */
export function useOpcionesGruposObservacionQuery(para: "REGISTRAR" | "FILTRO", enabled = true) {
  return useQuery({
    queryKey: observacionesKeys.opciones.grupos(para),
    queryFn: () =>
      evalCol.getRows<OpcionGrupoObservacion>(`${BASE_OBSERVACIONES}/opciones/grupos${queryString({ PARA: para })}`),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/**
 * `GET /observaciones-sugerencias/opciones/estudiantes`: matrículas Cursando de los grupos elegidos (CSV)
 * que el usuario dirige. Sin límite, para que «Seleccionar todos» por grupo tenga la lista completa; la
 * búsqueda por nombre o documento se hace en el combo.
 */
export function useOpcionesEstudiantesObservacionQuery(grupos: number[], enabled = true) {
  return useQuery({
    queryKey: observacionesKeys.opciones.estudiantes(grupos),
    queryFn: () =>
      evalCol.getRows<OpcionEstudianteObservacion>(
        `${BASE_OBSERVACIONES}/opciones/estudiantes${queryString({ FK_TGRUPOS: grupos.join(",") })}`,
      ),
    enabled: enabled && grupos.length > 0,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
