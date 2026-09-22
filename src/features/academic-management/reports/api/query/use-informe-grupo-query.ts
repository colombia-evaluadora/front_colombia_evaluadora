import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  AsignaturaInforme,
  EstadoNota,
  FilaInforme,
  FormatoPeriodo,
  ModoPeriodo,
  ObservacionEstado,
} from "@/features/academic-management/reports/api/types"

interface AsignaturaRow {
  asignatura: number
  nombre: string
  abreviacion: string | null
  area: string | null
  orden: number | null
  estado: EstadoNota
  es_numerico: boolean | null
  nota: number | null
  nota_propuesta: number | null
  valoracion: string | null
  simbolo: string | null
  aprobada: boolean | null
  ya_asegurado: boolean | null
  alcanzable: boolean | null
}

interface FilaInformeRow {
  fk_tmatricula: number
  estudiante: string
  documento: string | null
  fk_tperiodo_evaluacion: number
  periodo_nombre: string
  periodo_abreviacion: string | null
  modo_periodo: ModoPeriodo
  formato: FormatoPeriodo
  es_cualitativo: boolean | null
  consolidado: boolean | null
  promedio_guardado: number | null
  promedio_proyectado: number | null
  puesto: number | null
  aprobadas: number | null
  reprobadas: number | null
  asignaturas: AsignaturaRow[] | null
  observacion: string | null
  observacion_estado: ObservacionEstado | null
  observacion_desactualizada: boolean | null
  tiene_cambios_propuestos: boolean | null
  evidencias: number | null
}

function toAsignatura(row: AsignaturaRow): AsignaturaInforme {
  return {
    asignaturaId: row.asignatura,
    nombre: row.nombre,
    abreviacion: row.abreviacion ?? row.nombre.slice(0, 3).toUpperCase(),
    area: row.area,
    orden: row.orden ?? 0,
    estado: row.estado,
    esNumerico: row.es_numerico ?? false,
    nota: row.nota,
    notaPropuesta: row.nota_propuesta,
    valoracion: row.valoracion,
    simbolo: row.simbolo,
    aprobada: row.aprobada,
    yaAsegurado: row.ya_asegurado ?? false,
    alcanzable: row.alcanzable ?? true,
  }
}

function toFila(row: FilaInformeRow): FilaInforme {
  return {
    matriculaId: row.fk_tmatricula,
    nombreCompleto: row.estudiante,
    documento: row.documento ?? "",
    periodoId: row.fk_tperiodo_evaluacion,
    periodoNombre: row.periodo_nombre,
    periodoAbreviacion: row.periodo_abreviacion,
    modoPeriodo: row.modo_periodo,
    formato: row.formato,
    esCualitativo: row.es_cualitativo ?? row.formato === "cualitativo",
    consolidado: row.consolidado ?? false,
    promedioGuardado: row.promedio_guardado,
    promedioProyectado: row.promedio_proyectado,
    puesto: row.puesto,
    aprobadas: row.aprobadas ?? 0,
    reprobadas: row.reprobadas ?? 0,
    asignaturas: (row.asignaturas ?? []).map(toAsignatura),
    observacion: row.observacion,
    observacionEstado: row.observacion_estado,
    observacionDesactualizada: row.observacion_desactualizada ?? false,
    tieneCambiosPropuestos: row.tiene_cambios_propuestos ?? false,
    evidencias: row.evidencias ?? 0,
  }
}

export interface InformeGrupoParams {
  grupoId: number
  /** Vacío = todos los del período académico del grupo, sin el Final. Para
   *  pedir el Final va `PERIODO_FINAL_ID` dentro de este mismo arreglo. */
  periodos?: number[]
  search?: string
}

async function fetchInformeGrupo(params: InformeGrupoParams): Promise<FilaInforme[]> {
  const rows = await evalCol.postRows<FilaInformeRow>("/informes/grupo", {
    FK_TGRUPO: params.grupoId,
    PERIODOS: params.periodos?.length ? params.periodos : null,
    SEARCH: params.search?.trim() || null,
  })
  return rows.map(toFila)
}

export const informeGrupoQueryKey = (params: InformeGrupoParams) =>
  ["informes", "grupo", params] as const

export const informeGrupoQueryKeyPrefix = () => ["informes", "grupo"] as const

/** `POST /informes/grupo`. Una fila por (estudiante, período): con dos
 *  períodos marcados, cada estudiante ocupa dos filas. Sin paginación —
 *  paginar rompería el puesto, que se calcula sobre el grupo entero. */
export function useInformeGrupoQuery(params: InformeGrupoParams | null) {
  return useQuery({
    queryKey: params ? informeGrupoQueryKey(params) : (["informes", "grupo", "none"] as const),
    queryFn: () => fetchInformeGrupo(params!),
    enabled: params !== null,
    staleTime: 1000 * 10,
  })
}
