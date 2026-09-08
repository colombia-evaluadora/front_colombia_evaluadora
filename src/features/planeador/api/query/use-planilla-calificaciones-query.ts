import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  EstadoCelda,
  PlanillaCelda,
  PlanillaFila,
} from "@/features/planeador/api/types/planilla"

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
  calificable: "S" | "N" | null
  observacion: string | null
}

interface PlanillaFilaRow {
  pk_tmatricula: number
  pk_testudiante: number
  nombre_estudiante: string
  definitiva_proyectada: number | null
  definitiva_registrada: number | null
  tendencia: number | null
  celdas: PlanillaCeldaRow[]
  total_count: number
}

function toCelda(row: PlanillaCeldaRow): PlanillaCelda {
  return { ...row }
}

function toFila(row: PlanillaFilaRow): PlanillaFila {
  return {
    pkTmatricula: row.pk_tmatricula,
    pkTestudiante: row.pk_testudiante,
    nombreEstudiante: row.nombre_estudiante,
    definitivaProyectada: row.definitiva_proyectada,
    definitivaRegistrada: row.definitiva_registrada,
    tendencia: row.tendencia,
    celdas: row.celdas.map(toCelda),
  }
}

export interface UsePlanillaCalificacionesParams {
  grupoId: number
  asignaturaId: number
  gradoId?: number
  size?: number
  offset?: number
}

interface PlanillaCalificacionesResult {
  rows: PlanillaFila[]
  totalCount: number
}

export const planillaCalificacionesQueryKey = (params: UsePlanillaCalificacionesParams) =>
  ["planeador", "planilla", "calificaciones", params] as const

/** Prefijo común de la query key — se usa para invalidar TODAS las páginas
 *  de calificaciones (cualquier filtro) después de una mutación de
 *  calificar, sin tener que reconstruir los params exactos con los que se
 *  pidió cada una. */
export const planillaCalificacionesQueryKeyPrefix = () =>
  ["planeador", "planilla", "calificaciones"] as const

async function fetchPlanillaCalificaciones(
  params: UsePlanillaCalificacionesParams,
): Promise<PlanillaCalificacionesResult> {
  const query = new URLSearchParams({
    grupo: String(params.grupoId),
    asignatura: String(params.asignaturaId),
    // El endpoint pagina de verdad — la grilla de la Planilla todavía no
    // tiene paginador propio, así que se pide una página grande de una sola
    // vez (mismo criterio que `use-actividades-query.ts`).
    size: String(params.size ?? 200),
    offset: String(params.offset ?? 0),
  })
  if (params.gradoId != null) query.set("grado", String(params.gradoId))
  const rawRows = await evalCol.getRows<PlanillaFilaRow>(
    `/planeador/planilla/calificaciones?${query}`,
  )
  return {
    rows: rawRows.map(toFila),
    totalCount: rawRows[0]?.total_count ?? rawRows.length,
  }
}

/**
 * Cuerpo de la grilla de la Planilla: una fila por estudiante con sus
 * celdas ya resueltas (estado, calificación, definitiva) — reemplaza pedir
 * `calificacionesQueryOptions` por cada actividad filtrada con `useQueries`
 * y calcular el porcentaje en el cliente: acá el backend ya lo trae
 * calculado.
 */
export function usePlanillaCalificacionesQuery(params: UsePlanillaCalificacionesParams | null) {
  return useQuery({
    queryKey: params
      ? planillaCalificacionesQueryKey(params)
      : (["planeador", "planilla", "calificaciones", "none"] as const),
    queryFn: () => fetchPlanillaCalificaciones(params!),
    enabled: params !== null,
    staleTime: 1000 * 10,
  })
}
