import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { InstrumentoTipo, PlanillaColumna } from "@/features/planeador/api/types/planilla"

/** `GET /planeador/planilla/columnas` (confirmado real, ver colección
 *  Postman `planeador-planilla-flujo-completo`, paso 2.1). */
interface PlanillaColumnaRow {
  orden_columna: number
  pk_tactividad: number
  titulo: string
  fk_tunidad: number | null
  unidad: string | null
  fk_tlv_instrumento_evaluacion: number | null
  instrumento: InstrumentoTipo | null
  instrumento_nombre: string | null
  ponderacion: number | null
  nota_maxima: number | null
  es_evaluativa: "S" | "N"
  /** Boolean de verdad (V450 lo calcula con fn_actividad_es_formativa), a
   *  diferencia de `es_evaluativa`, que es el bool_sn de la columna. */
  es_formativa: boolean | "S" | "N" | null
  metodo_valoracion: string | null
  // Datetime ISO completo, no `yyyy-MM-dd` (mismo patrón confirmado en
  // `/actividades/mias` — se normaliza acá igual).
  fecha_inicio: string
  fecha_cierre: string
  estudiantes_asignados: number
  estudiantes_calificados: number
}

function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

function toPlanillaColumna(row: PlanillaColumnaRow): PlanillaColumna {
  return {
    ordenColumna: row.orden_columna,
    pkTactividad: row.pk_tactividad,
    titulo: row.titulo,
    fkTunidad: row.fk_tunidad,
    unidad: row.unidad,
    instrumento: row.instrumento,
    instrumentoNombre: row.instrumento_nombre,
    ponderacion: row.ponderacion,
    notaMaxima: row.nota_maxima,
    esEvaluativa: row.es_evaluativa === "S",
    esFormativa: row.es_formativa === true || row.es_formativa === "S",
    metodoValoracion: row.metodo_valoracion ?? null,
    fechaInicio: toDateOnly(row.fecha_inicio),
    fechaCierre: toDateOnly(row.fecha_cierre),
    estudiantesAsignados: row.estudiantes_asignados,
    estudiantesCalificados: row.estudiantes_calificados,
  }
}

export interface UsePlanillaColumnasParams {
  grupoId: number
  asignaturaId: number
  gradoId?: number
}

export const planillaColumnasQueryKey = (params: UsePlanillaColumnasParams) =>
  ["planeador", "planilla", "columnas", params] as const

async function fetchPlanillaColumnas(
  params: UsePlanillaColumnasParams,
): Promise<PlanillaColumna[]> {
  const query = new URLSearchParams({
    grupo: String(params.grupoId),
    asignatura: String(params.asignaturaId),
  })
  if (params.gradoId != null) query.set("grado", String(params.gradoId))
  const rows = await evalCol.getRows<PlanillaColumnaRow>(`/planeador/planilla/columnas?${query}`)
  return rows.map(toPlanillaColumna)
}

/**
 * Columnas de la Planilla (una por actividad del grupo/asignatura elegidos)
 * — reemplaza el hack de filtrar `useActividadesQuery()` en el cliente por
 * `grado`/`grupo`/`asignatura`/rango de fechas: el endpoint real ya hace ese
 * cruce del lado del servidor.
 */
export function usePlanillaColumnasQuery(params: UsePlanillaColumnasParams | null) {
  return useQuery({
    queryKey: params
      ? planillaColumnasQueryKey(params)
      : (["planeador", "planilla", "columnas", "none"] as const),
    queryFn: () => fetchPlanillaColumnas(params!),
    enabled: params !== null,
    staleTime: 1000 * 15,
  })
}
