import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  HistorialAcademico,
  HistorialAcademicoOpciones,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/** `GET /estudiantes/:MATRICULA/historial-academico/opciones` → columna `datos`: años, matrículas, períodos y asignaturas. */
export function useHistorialAcademicoOpcionesQuery(matricula: number | undefined) {
  return useQuery({
    queryKey: prevencionKeys.historialAcademicoOpciones(matricula ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/estudiantes/${matricula}/historial-academico/opciones`)
        .then((r) => desenvolver<HistorialAcademicoOpciones>(r[0], "datos", "No se encontró el estudiante.")),
    enabled: matricula != null,
    retry: false,
  })
}

export interface HistorialAcademicoParams {
  matricula: number
  matriculaHistorica: number
  /** CSV de ids de período de evaluación; `FINAL` = Resultado final del Período Académico. */
  periodos: string
  asignatura: number | null
  /** Cada pulsación de «Consultar» es una consulta nueva (el backend la registra): distingue las claves. */
  consulta: number
}

/**
 * `GET /estudiantes/:MATRICULA/historial-academico`. Registra la consulta en el backend: nunca sale de la caché
 * ni se reconsulta al enfocar la ventana.
 */
export function useHistorialAcademicoQuery(params: HistorialAcademicoParams | null) {
  return useQuery({
    queryKey: prevencionKeys.historialAcademico(params),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(
          `${BASE_PREVENCION}/estudiantes/${params!.matricula}/historial-academico${queryString({
            MATRICULA_HISTORICA: params!.matriculaHistorica,
            PERIODOS: params!.periodos,
            ASIGNATURA: params!.asignatura,
          })}`,
        )
        .then((r) => desenvolver<HistorialAcademico>(r[0], "datos", "No se encontró el historial académico.")),
    enabled: params != null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
    gcTime: 0,
  })
}
