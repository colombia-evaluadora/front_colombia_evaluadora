import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/** Fila de `GET /planeador/actividades/estudiantes/:id/soportes` (V461). */
interface SoporteRow {
  pk_tactividad_soporte: number
  fk_tarchivo: number
  es_favorito?: boolean | null
}

export interface SoporteEstudiante {
  pk: number
  fkTarchivo: number
  /** A lo sumo una por observación. */
  esFavorito: boolean
}

export const soportesEstudianteQueryKey = (pkTactividadEstudiante: number) =>
  ["planeador", "actividad-estudiante", pkTactividadEstudiante, "soportes"] as const

async function fetchSoportesEstudiante(pkTactividadEstudiante: number): Promise<SoporteEstudiante[]> {
  const rows = await evalCol.getRows<SoporteRow>(
    `/planeador/actividades/estudiantes/${pkTactividadEstudiante}/soportes`,
  )
  return rows.map((r) => ({
    pk: r.pk_tactividad_soporte,
    fkTarchivo: r.fk_tarchivo,
    esFavorito: r.es_favorito === true,
  }))
}

/** Solo para saber cuál evidencia es la favorita: la planilla y `GET .../nota`
 *  no traen `es_favorito`. */
export function useSoportesEstudianteQuery(pkTactividadEstudiante: number | undefined) {
  return useQuery({
    queryKey:
      pkTactividadEstudiante != null
        ? soportesEstudianteQueryKey(pkTactividadEstudiante)
        : (["planeador", "actividad-estudiante", "none", "soportes"] as const),
    queryFn: () => fetchSoportesEstudiante(pkTactividadEstudiante!),
    enabled: pkTactividadEstudiante != null,
    staleTime: 1000 * 10,
  })
}
