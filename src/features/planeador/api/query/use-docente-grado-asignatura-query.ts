import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/docentes/grado-asignatura` (`fn_docente_grado_asignatura_listar`,
 * V242, ver colección Postman `planeador-planilla`). Pares (grado, asignatura)
 * distintos que el DOCENTE autenticado dicta en el periodo — mismo criterio
 * de resolución de `p_fk_tfuncionario` que `use-docente-grupos-query.ts`.
 */
export interface DocenteGradoAsignatura {
  gradoId: number
  gradoCodigo: string
  gradoNombre: string
  asignaturaId: number
  asignaturaCodigo: string
  asignaturaNombre: string
}

interface DocenteGradoAsignaturaRow {
  grado_id: number
  grado_codigo: string
  grado_nombre: string
  asignatura_id: number
  asignatura_codigo: string
  asignatura_nombre: string
}

function toDocenteGradoAsignatura(row: DocenteGradoAsignaturaRow): DocenteGradoAsignatura {
  return {
    gradoId: row.grado_id,
    gradoCodigo: row.grado_codigo,
    gradoNombre: row.grado_nombre,
    asignaturaId: row.asignatura_id,
    asignaturaCodigo: row.asignatura_codigo,
    asignaturaNombre: row.asignatura_nombre,
  }
}

async function fetchDocenteGradoAsignatura(periodoId?: number): Promise<DocenteGradoAsignatura[]> {
  const query = periodoId != null ? `?periodo=${periodoId}` : ""
  const rows = await evalCol.getRows<DocenteGradoAsignaturaRow>(
    `/planeador/docentes/grado-asignatura${query}`,
  )
  return rows.map(toDocenteGradoAsignatura)
}

export const docenteGradoAsignaturaQueryKey = (periodoId?: number) =>
  ["planeador", "docente-grado-asignatura", periodoId ?? null] as const

export function useDocenteGradoAsignaturaQuery(periodoId?: number) {
  return useQuery({
    queryKey: docenteGradoAsignaturaQueryKey(periodoId),
    queryFn: () => fetchDocenteGradoAsignatura(periodoId),
    staleTime: 1000 * 60,
  })
}
