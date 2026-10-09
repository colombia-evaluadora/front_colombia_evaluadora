import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"

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

async function fetchDocenteGradoAsignatura(
  periodoId?: number,
  funcionario?: number,
): Promise<DocenteGradoAsignatura[]> {
  const query = new URLSearchParams()
  if (periodoId != null) query.set("periodo", String(periodoId))
  if (funcionario != null) query.set("funcionario", String(funcionario))
  const qs = query.toString()
  const rows = await evalCol.getRows<DocenteGradoAsignaturaRow>(
    `/planeador/docentes/grado-asignatura${qs ? `?${qs}` : ""}`,
  )
  return rows.map(toDocenteGradoAsignatura)
}

/** Mismo criterio de `funcionario` que `useDocenteGruposQuery`. */
export function useDocenteGradoAsignaturaQuery(periodoId?: number) {
  const { funcionario, consultasHabilitadas } = usePlaneadorDocenteScope()
  return useQuery({
    queryKey: planeadorKeys.docenteGradoAsignatura(periodoId, funcionario),
    queryFn: () => fetchDocenteGradoAsignatura(periodoId, funcionario),
    enabled: consultasHabilitadas,
    staleTime: 1000 * 60,
  })
}
