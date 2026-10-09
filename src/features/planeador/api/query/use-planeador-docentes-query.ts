import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/**
 * `GET /planeador/docentes?sede=<pk>&periodo=<pk>` — docentes cuyo planeador
 * puede mirar el usuario (campo "Docente" del filtro avanzado de
 * Actividades/Unidades), los que dictan en esa sede / ese periodo académico:
 * - Super Admin: con la sede elegida (sin ella el backend devuelve 0 filas).
 * - Rector/Coordinador: sede y periodo opcionales; el backend acota siempre
 *   a su alcance (resuelto del token).
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

async function fetchPlaneadorDocentes(sede?: number, periodo?: number): Promise<PlaneadorDocente[]> {
  const query = new URLSearchParams()
  if (sede != null) query.set("sede", String(sede))
  if (periodo != null) query.set("periodo", String(periodo))
  const qs = query.toString()
  const rows = await evalCol.getRows<PlaneadorDocenteRow>(`/planeador/docentes${qs ? `?${qs}` : ""}`)
  return rows.map(toPlaneadorDocente)
}

export function usePlaneadorDocentesQuery({
  sede,
  periodo,
  enabled = true,
}: {
  sede?: number
  periodo?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: planeadorKeys.docentes(sede, periodo),
    queryFn: () => fetchPlaneadorDocentes(sede, periodo),
    enabled,
    // La planta docente no cambia dentro de una sesión de consulta.
    staleTime: 1000 * 60 * 5,
  })
}
