import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  EstadoCelda,
  PlanillaCelda,
  PlanillaFila,
} from "@/features/planeador/api/types/planilla"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import type { EstadoResultado } from "@/features/planeador/api/types/calificacion"

/** `GET /planeador/planilla/calificaciones` (confirmado real, ver colección
 *  Postman `planeador-planilla-flujo-completo`, paso 2.2).
 *
 *  OJO: a diferencia del resto del sobre (snake_case), el backend devuelve
 *  las CELDAS ya en camelCase — confirmado contra la respuesta real, no es
 *  un error de tipeo acá. */
interface PlanillaCeldaRow {
  ordenColumna: number
  pkTactividad: number
  pkTunidad: number | null
  pkTactividadEstudiante: number
  estado: EstadoCelda
  calificacion: number | null
  recuperacion: number | null
  definitiva: number | null
  nota: number | null
  notaHomologada: number | null
  calificable: "S" | "N" | null
  observacion: string | null
  esFormativa?: boolean | "S" | "N" | null
  fechaAsistencia?: string | null
  tieneAsistencia?: boolean | null
  estadoResultado?: EstadoResultado | null
  solicitudPendiente?: boolean | null
  notaPropuestaHomologada?: number | null
  calificacionPropuesta?: unknown
  evidencias?: CeldaEvidenciaRow[] | null
}

interface CeldaEvidenciaRow {
  pk: number
  fkTarchivo: number
  nombre?: string | null
  fecha?: string | null
}

interface PlanillaFilaRow {
  pk_tmatricula: number
  pk_testudiante: number
  nombre_estudiante: string
  definitiva_proyectada: number | null
  definitiva_proyectada_homologada: number | null
  definitiva_registrada: number | null
  tendencia: number | null
  nota_maxima?: number | null
  es_numerico?: boolean | null
  definitiva_propuesta_homologada?: number | null
  celdas: PlanillaCeldaRow[]
  total_count: number
}

function toCelda(row: PlanillaCeldaRow): PlanillaCelda {
  const { esFormativa, fechaAsistencia, tieneAsistencia, evidencias, ...resto } = row
  return {
    ...resto,
    esFormativa: esFormativa === true || esFormativa === "S",
    fechaAsistencia: fechaAsistencia ? fechaAsistencia.slice(0, 10) : null,
    tieneAsistencia: tieneAsistencia !== false,
    evidencias: (evidencias ?? []).map((e) => ({
      pk: e.pk,
      fkTarchivo: e.fkTarchivo,
      nombre: e.nombre ?? null,
      fecha: e.fecha ?? null,
    })),
  }
}

function toFila(row: PlanillaFilaRow): PlanillaFila {
  return {
    pkTmatricula: row.pk_tmatricula,
    pkTestudiante: row.pk_testudiante,
    nombreEstudiante: row.nombre_estudiante,
    definitivaProyectada: row.definitiva_proyectada,
    definitivaProyectadaHomologada: row.definitiva_proyectada_homologada,
    definitivaRegistrada: row.definitiva_registrada,
    tendencia: row.tendencia,
    notaMaxima: row.es_numerico ? (row.nota_maxima ?? null) : null,
    definitivaPropuestaHomologada: row.definitiva_propuesta_homologada ?? null,
    celdas: row.celdas.map(toCelda),
  }
}

export interface UsePlanillaCalificacionesParams {
  grupoId: number
  asignaturaId: number
  gradoId?: number
  /** Sin él, el backend usa el periodo vigente. */
  periodoId?: number
  size?: number
  offset?: number
}

interface PlanillaCalificacionesResult {
  rows: PlanillaFila[]
  totalCount: number
}

async function fetchPlanillaCalificaciones(
  params: UsePlanillaCalificacionesParams,
): Promise<PlanillaCalificacionesResult> {
  const query = new URLSearchParams({
    grupo: String(params.grupoId),
    asignatura: String(params.asignaturaId),
    size: String(params.size ?? 200),
    offset: String(params.offset ?? 0),
  })
  if (params.gradoId != null) query.set("grado", String(params.gradoId))
  if (params.periodoId != null) query.set("periodo", String(params.periodoId))
  const rawRows = await evalCol.getRows<PlanillaFilaRow>(
    `/planeador/planilla/calificaciones?${query}`,
  )
  return {
    rows: rawRows.map(toFila),
    totalCount: rawRows[0]?.total_count ?? rawRows.length,
  }
}

export function usePlanillaCalificacionesQuery(params: UsePlanillaCalificacionesParams | null) {
  return useQuery({
    queryKey: params
      ? planeadorKeys.planilla.calificaciones.lista(params)
      : planeadorKeys.planilla.calificaciones.lista("none"),
    queryFn: () => fetchPlanillaCalificaciones(params!),
    enabled: params !== null,
    staleTime: 1000 * 10,
  })
}
