import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

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
        ? planeadorKeys.actividadEstudiante.soportes(pkTactividadEstudiante)
        : planeadorKeys.actividadEstudiante.soportes("none"),
    queryFn: () => fetchSoportesEstudiante(pkTactividadEstudiante!),
    enabled: pkTactividadEstudiante != null,
    staleTime: 1000 * 10,
  })
}
