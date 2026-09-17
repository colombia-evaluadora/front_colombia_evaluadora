import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

import type { GrupoPeriodo } from "@/features/academic-management/reports/api/types"

interface GrupoPeriodoRow {
  grupo_id: number
  grupo_codigo: string | null
  grupo_nombre: string
  grupo_etiqueta: string
  capacidad: number | null
  estudiantes: number | null
  jornada_id: number | null
  jornada_nombre: string | null
  grado_id: number
  grado_codigo: string | null
  grado_nombre: string
  nivel_ensenanza_id: number | null
  nivel_ensenanza_nombre: string | null
  director_id: number | null
  director_nombre: string | null
  fk_tperiodo_academico: number
}

function toGrupo(row: GrupoPeriodoRow): GrupoPeriodo {
  return {
    grupoId: row.grupo_id,
    grupoCodigo: row.grupo_codigo,
    grupoNombre: row.grupo_nombre,
    grupoEtiqueta: row.grupo_etiqueta,
    capacidad: row.capacidad,
    estudiantes: row.estudiantes ?? 0,
    jornadaId: row.jornada_id,
    jornadaNombre: row.jornada_nombre,
    gradoId: row.grado_id,
    gradoCodigo: row.grado_codigo,
    gradoNombre: row.grado_nombre,
    nivelEnsenanzaId: row.nivel_ensenanza_id,
    nivelEnsenanzaNombre: row.nivel_ensenanza_nombre,
    directorId: row.director_id,
    directorNombre: row.director_nombre,
    periodoAcademicoId: row.fk_tperiodo_academico,
  }
}

export interface GruposPeriodoParams {
  sedeId: number | null
  anio: number | null
  jornadaId: number | null
  search?: string
}

export const gruposPeriodoQueryKey = (params: GruposPeriodoParams) =>
  ["informes", "grupos-periodo", params] as const

/** `POST /informes/grupos-periodo`. Reemplaza a `/planeador/docentes/grupos`,
 *  que exigía permiso de PLANEADOR y solo listaba los grupos donde el docente
 *  dicta — un rector o un coordinador no veía ninguno. */
export function useGruposPeriodoQuery(params: GruposPeriodoParams) {
  return useQuery({
    queryKey: gruposPeriodoQueryKey(params),
    queryFn: async (): Promise<GrupoPeriodo[]> => {
      const rows = await evalCol.postRows<GrupoPeriodoRow>("/informes/grupos-periodo", {
        FK_TSEDE: params.sedeId,
        ANIO: params.anio,
        FK_TLV_JORNADA: params.jornadaId,
        SEARCH: params.search?.trim() || null,
      })
      return rows.map(toGrupo)
    },
    enabled: params.sedeId != null && params.anio != null && params.jornadaId != null,
    staleTime: 1000 * 60,
  })
}
