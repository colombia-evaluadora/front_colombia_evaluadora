import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * `GET /planeador/docentes?establecimiento=<pk>` — docentes cuyo planeador
 * puede mirar el usuario (selector de Actividades/Unidades):
 * - Super Admin: los del establecimiento elegido (obligatorio).
 * - Coordinador: sin `establecimiento`; el backend acota a las sedes del
 *   coordinador (resueltas del token).
 */
interface PlaneadorDocenteRow {
  pk_tfuncionario: number
  nombre_completo: string | null
  identificacion: string | null
}

export interface PlaneadorDocente {
  /** `PK_TFUNCIONARIO` — lo que viaja como `?funcionario=`. */
  id: number
  nombre: string
  identificacion: string
}

const toPlaneadorDocente = (row: PlaneadorDocenteRow): PlaneadorDocente => ({
  id: row.pk_tfuncionario,
  nombre: row.nombre_completo?.trim() || `Docente ${row.pk_tfuncionario}`,
  identificacion: row.identificacion ?? "",
})

async function fetchPlaneadorDocentes(establecimientoId?: number): Promise<PlaneadorDocente[]> {
  const query = establecimientoId != null ? `?establecimiento=${establecimientoId}` : ""
  const rows = await evalCol.getRows<PlaneadorDocenteRow>(`/planeador/docentes${query}`)
  return rows.map(toPlaneadorDocente)
}

export function usePlaneadorDocentesQuery({
  establecimientoId,
  enabled = true,
}: {
  establecimientoId?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: planeadorKeys.docentes(establecimientoId),
    queryFn: () => fetchPlaneadorDocentes(establecimientoId),
    enabled,
    // La planta docente no cambia dentro de una sesión de consulta.
    staleTime: 1000 * 60 * 5,
  })
}
