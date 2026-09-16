import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type {
  CeldaPlanilla,
  EstadoCeldaPlanilla,
  FilaPlanilla,
} from "@/features/academic-management/reports/api/types"

/** Las celdas llegan en camelCase aunque el resto de la fila sea snake_case
 *  —mismo caso que `/planeador/planilla/calificaciones`—. */
interface CeldaRow {
  orden: number
  pkTactividad: number
  titulo: string
  pkTactividadEstudiante: number | null
  estado: EstadoCeldaPlanilla
  porcentaje: number | null
  nota: number | null
  valoracion: string | null
  observacion: string | null
  esEvaluativa: boolean | null
  ponderacion: number | null
  notaMaxima: number | null
  instrumento: string | null
  fechaInicio: string | null
  fechaCierre: string | null
}

interface FilaPlanillaRow {
  fk_tmatricula: number
  fk_testudiante: number
  estudiante: string
  definitiva_guardada_homologada: number | null
  definitiva_proyectada_homologada: number | null
  actividades: CeldaRow[] | null
}

function toCelda(row: CeldaRow): CeldaPlanilla {
  return {
    orden: row.orden,
    actividadId: row.pkTactividad,
    titulo: row.titulo,
    actividadEstudianteId: row.pkTactividadEstudiante,
    estado: row.estado,
    porcentaje: row.porcentaje,
    nota: row.nota,
    valoracion: row.valoracion,
    observacion: row.observacion,
    esEvaluativa: row.esEvaluativa ?? true,
    ponderacion: row.ponderacion,
    notaMaxima: row.notaMaxima,
    instrumento: row.instrumento,
    fechaInicio: row.fechaInicio,
    fechaCierre: row.fechaCierre,
  }
}

function toFila(row: FilaPlanillaRow): FilaPlanilla {
  return {
    matriculaId: row.fk_tmatricula,
    estudianteId: row.fk_testudiante,
    nombreCompleto: row.estudiante,
    definitivaGuardada: row.definitiva_guardada_homologada,
    definitivaProyectada: row.definitiva_proyectada_homologada,
    actividades: (row.actividades ?? []).map(toCelda),
  }
}

export interface PlanillaInformeParams {
  grupoId: number
  asignaturaId: number
  periodoId: number
  search?: string
}

export const planillaInformeQueryKey = (params: PlanillaInformeParams) =>
  ["informes", "planilla", params] as const

export const planillaInformeQueryKeyPrefix = () => ["informes", "planilla"] as const

/** `POST /informes/planilla`. No es `/planeador/planilla/*`: esta acota por
 *  período de evaluación y su línea base sale de `TASIGNATURA_NOTA`.
 *  `SEARCH` filtra filas o columnas según dónde haya coincidencia. */
export function usePlanillaInformeQuery(params: PlanillaInformeParams | null) {
  return useQuery({
    queryKey: params ? planillaInformeQueryKey(params) : (["informes", "planilla", "none"] as const),
    queryFn: async () => {
      const rows = await evalCol.postRows<FilaPlanillaRow>("/informes/planilla", {
        FK_TGRUPO: params!.grupoId,
        FK_TASIGNATURA: params!.asignaturaId,
        FK_TPERIODO_EVALUACION: params!.periodoId,
        SEARCH: params!.search?.trim() || null,
      })
      return rows.map(toFila)
    },
    enabled: params !== null,
    staleTime: 1000 * 10,
  })
}
