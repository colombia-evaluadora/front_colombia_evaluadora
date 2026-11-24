import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import { desenvolver, queryString } from "@/features/gestion-estudiantil/commons/api/jsonb"
import { prevencionKeys } from "@/features/gestion-estudiantil/prevencion/api/query-keys"
import { BASE_PREVENCION } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import type {
  OpcionEstrategia,
  OpcionEstudiante,
  OpcionGrupo,
  OpcionMotivoRetiro,
  OpcionPeriodo,
  OpcionPeriodoAcademico,
  OpcionesEstadosAcomp,
  OpcionResponsable,
  OpcionSedeJornada,
} from "@/features/gestion-estudiantil/prevencion/api/types"

export interface OpcionesEstudiantesParams {
  establecimiento: number | null
  sede?: number | null
  jornada?: number | null
  grupo?: number | null
  search?: string
  /** Selector del reporte de salud mental: `/opciones/estudiantes-salud-mental` (otro alcance). */
  saludMental?: boolean
}

/** `GET /opciones/estudiantes` (hasta 50; el texto va al servidor). */
export function useOpcionesEstudiantesQuery(params: OpcionesEstudiantesParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.estudiantes(params),
    queryFn: () =>
      evalCol.getRows<OpcionEstudiante>(
        `${BASE_PREVENCION}/opciones/${params.saludMental ? "estudiantes-salud-mental" : "estudiantes"}${queryString({
          ESTABLECIMIENTO: params.establecimiento,
          SEDE: params.sede,
          JORNADA: params.jornada,
          GRUPO: params.grupo,
          SEARCH: params.search?.trim() || null,
          PAGESIZE: 50,
        })}`,
      ),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export interface OpcionesResponsablesParams {
  establecimiento: number | null
  search?: string
}

export const fetchOpcionesResponsables = (params: OpcionesResponsablesParams) =>
  evalCol.getRows<OpcionResponsable>(
    `${BASE_PREVENCION}/opciones/responsables${queryString({
      ESTABLECIMIENTO: params.establecimiento,
      SEARCH: params.search?.trim() || null,
      PAGESIZE: 50,
    })}`,
  )

/** `GET /opciones/responsables`: la fila con `es_usuario_actual` es el valor por defecto. */
export function useOpcionesResponsablesQuery(params: OpcionesResponsablesParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.responsables(params),
    queryFn: () => fetchOpcionesResponsables(params),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

/** `GET /acompanamientos/opciones/estados`: estados de Embarazo, Consumo y Reportes recibidos (una fila con `datos`). */
export function useOpcionesEstadosAcompQuery(establecimiento: number | null) {
  return useQuery({
    queryKey: prevencionKeys.opciones.acompEstados(establecimiento ?? "none"),
    queryFn: () =>
      evalCol
        .getRows<Record<string, unknown>>(`${BASE_PREVENCION}/acompanamientos/opciones/estados${queryString({ ESTABLECIMIENTO: establecimiento })}`)
        .then((r) => desenvolver<OpcionesEstadosAcomp>(r[0], "datos", "No se pudieron cargar los estados.")),
    enabled: establecimiento != null,
    staleTime: 60_000,
  })
}

export interface OpcionesGruposParams {
  establecimiento: number | null
  sede?: number | null
  jornada?: number | null
}

export const fetchOpcionesGruposPrevencion = (params: OpcionesGruposParams) =>
  evalCol.getRows<OpcionGrupo>(
    `${BASE_PREVENCION}/opciones/grupos${queryString({
      ESTABLECIMIENTO: params.establecimiento,
      SEDE: params.sede,
      JORNADA: params.jornada,
    })}`,
  )

/** `GET /opciones/grupos`: grupos del alcance con su sede y jornada. */
export function useOpcionesGruposQuery(params: OpcionesGruposParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.grupos(params),
    queryFn: () => fetchOpcionesGruposPrevencion(params),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
  })
}

export interface OpcionesPeriodosParams {
  establecimiento: number | null
  periodoAcademico?: number | null
}

export const fetchOpcionesPeriodos = (params: OpcionesPeriodosParams) =>
  evalCol.getRows<OpcionPeriodo>(
    `${BASE_PREVENCION}/opciones/periodos${queryString({
      ESTABLECIMIENTO: params.establecimiento,
      PERIODO_ACADEMICO: params.periodoAcademico,
    })}`,
  )

/** `GET /opciones/periodos`: períodos de evaluación (el vigente trae `es_vigente`). */
export function useOpcionesPeriodosQuery(params: OpcionesPeriodosParams, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.periodos(params),
    queryFn: () => fetchOpcionesPeriodos(params),
    enabled: enabled && params.establecimiento != null,
    staleTime: 60_000,
  })
}

export const fetchOpcionesPeriodosAcademicos = (establecimiento: number | null) =>
  evalCol.getRows<OpcionPeriodoAcademico>(
    `${BASE_PREVENCION}/opciones/periodos-academicos${queryString({ ESTABLECIMIENTO: establecimiento })}`,
  )

/** `GET /opciones/periodos-academicos` (filtros de Indicadores). */
export function useOpcionesPeriodosAcademicosQuery(establecimiento: number | null, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.periodosAcademicos(establecimiento ?? "none"),
    queryFn: () => fetchOpcionesPeriodosAcademicos(establecimiento),
    enabled: enabled && establecimiento != null,
    staleTime: 60_000,
  })
}

export const fetchOpcionesMotivosRetiro = () =>
  evalCol.getRows<OpcionMotivoRetiro>(`${BASE_PREVENCION}/opciones/motivos-retiro`)

/** `GET /opciones/motivos-retiro` (filtros de Indicadores). */
export function useOpcionesMotivosRetiroQuery(enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.motivosRetiro,
    queryFn: fetchOpcionesMotivosRetiro,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export const fetchOpcionesSedesJornadas = (establecimiento: number | null) =>
  evalCol.getRows<OpcionSedeJornada>(
    `${BASE_PREVENCION}/opciones/sedes-jornadas${queryString({ ESTABLECIMIENTO: establecimiento })}`,
  )

/**
 * `GET /opciones/sedes-jornadas`: sin ESTABLECIMIENTO devuelve las sedes y jornadas de todos los
 * establecimientos al alcance de quien consulta, así que no espera a conocer el establecimiento.
 */
export function useOpcionesSedesJornadasQuery(establecimiento: number | null = null, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.sedesJornadas(establecimiento ?? "todos"),
    queryFn: () => fetchOpcionesSedesJornadas(establecimiento),
    enabled,
    staleTime: 60_000,
  })
}

/** `GET /opciones/estrategias`: estrategias En ejecución del período de la matrícula (campo opcional de la acción). */
export function useOpcionesEstrategiasQuery(matricula: number | undefined, enabled = true) {
  return useQuery({
    queryKey: prevencionKeys.opciones.estrategias(matricula ?? "none"),
    queryFn: () =>
      evalCol.getRows<OpcionEstrategia>(`${BASE_PREVENCION}/opciones/estrategias${queryString({ MATRICULA: matricula })}`),
    enabled: matricula != null && enabled,
    retry: false,
    staleTime: 60_000,
  })
}
