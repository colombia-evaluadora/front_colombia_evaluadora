import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  CambioPendiente,
  PlanillaPendiente,
} from "@/features/academic-management/reports/api/types"

interface AlertaRow {
  fk_tgrupo: number
  grupo: string
  fk_tasignatura: number
  asignatura: string
  fk_tperiodo_evaluacion: number
  periodo: string
  fk_tfuncionario: number | null
  docente: string | null
  docentes_asignados: number | null
  actividades: number | null
  estudiantes_afectados: number | null
}

function toPlanillaPendiente(row: AlertaRow): PlanillaPendiente {
  return {
    grupoId: row.fk_tgrupo,
    grupoNombre: row.grupo,
    asignaturaId: row.fk_tasignatura,
    asignaturaNombre: row.asignatura,
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo,
    funcionarioId: row.fk_tfuncionario,
    docente: row.docente,
    actividades: row.actividades ?? 0,
    docentesAsignados: row.docentes_asignados ?? 1,
  }
}

function toCambioPendiente(row: AlertaRow): CambioPendiente {
  return {
    grupoId: row.fk_tgrupo,
    grupoNombre: row.grupo,
    asignaturaId: row.fk_tasignatura,
    asignaturaNombre: row.asignatura,
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo,
    funcionarioId: row.fk_tfuncionario,
    docente: row.docente,
    estudiantesAfectados: row.estudiantes_afectados ?? 0,
    docentesAsignados: row.docentes_asignados ?? 1,
  }
}

export interface AlertasParams {
  /** Obligatorio. Números, no strings: el binder valida cada elemento del
   *  arreglo. Un grupo fuera de alcance hace fallar la llamada entera. */
  grupos: number[]
  periodos?: number[]
}

function body(params: AlertasParams) {
  return {
    GRUPOS: params.grupos,
    PERIODOS: params.periodos?.length ? params.periodos : null,
  }
}

export const planillasPendientesQueryKey = (params: AlertasParams) =>
  ["informes", "planillas-pendientes", params] as const

export const cambiosPendientesQueryKey = (params: AlertasParams) =>
  ["informes", "cambios-pendientes", params] as const

/** `POST /informes/planillas-pendientes` (alerta roja). El backend solo mira
 *  períodos ya terminados: dentro del plazo no hay nada pendiente. */
export function usePlanillasPendientesQuery(params: AlertasParams) {
  return useQuery({
    queryKey: planillasPendientesQueryKey(params),
    queryFn: async () =>
      (await evalCol.postRows<AlertaRow>("/informes/planillas-pendientes", body(params))).map(
        toPlanillaPendiente,
      ),
    enabled: params.grupos.length > 0,
    staleTime: 1000 * 30,
  })
}

/** `POST /informes/cambios-pendientes` (alerta naranja). Solo cuentan las
 *  asignaturas ya consolidadas: sin consolidar no hay nada que aprobar. */
export function useCambiosPendientesQuery(params: AlertasParams) {
  return useQuery({
    queryKey: cambiosPendientesQueryKey(params),
    queryFn: async () =>
      (await evalCol.postRows<AlertaRow>("/informes/cambios-pendientes", body(params))).map(
        toCambioPendiente,
      ),
    enabled: params.grupos.length > 0,
    staleTime: 1000 * 30,
  })
}
