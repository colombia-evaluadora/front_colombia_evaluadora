import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/docentes/grupos` (`fn_docente_grupos_listar`, V242, ver
 * colección Postman `planeador-planilla`). Grupos donde el DOCENTE
 * autenticado dicta al menos una asignatura en el periodo — `p_fk_tfuncionario`
 * se resuelve del token en el backend, no se manda desde acá. Responde `200`
 * con lista vacía si el usuario no es funcionario activo (NULL-safe).
 */
export interface DocenteGrupo {
  grupoId: number
  grupoCodigo: string
  grupoNombre: string
  gradoId: number
  gradoCodigo: string
  gradoNombre: string
  nivelEnsenanzaId: number
  nivelEnsenanzaNombre: string
}

interface DocenteGrupoRow {
  grupo_id: number
  grupo_codigo: string
  grupo_nombre: string
  grado_id: number
  grado_codigo: string
  grado_nombre: string
  nivel_ensenanza_id: number
  nivel_ensenanza_nombre: string
}

function toDocenteGrupo(row: DocenteGrupoRow): DocenteGrupo {
  return {
    grupoId: row.grupo_id,
    grupoCodigo: row.grupo_codigo,
    grupoNombre: row.grupo_nombre,
    gradoId: row.grado_id,
    gradoCodigo: row.grado_codigo,
    gradoNombre: row.grado_nombre,
    nivelEnsenanzaId: row.nivel_ensenanza_id,
    nivelEnsenanzaNombre: row.nivel_ensenanza_nombre,
  }
}

async function fetchDocenteGrupos(periodoId?: number): Promise<DocenteGrupo[]> {
  const query = periodoId != null ? `?periodo=${periodoId}` : ""
  const rows = await evalCol.getRows<DocenteGrupoRow>(`/planeador/docentes/grupos${query}`)
  return rows.map(toDocenteGrupo)
}

export const docenteGruposQueryKey = (periodoId?: number) =>
  ["planeador", "docente-grupos", periodoId ?? null] as const

export function useDocenteGruposQuery(periodoId?: number) {
  return useQuery({
    queryKey: docenteGruposQueryKey(periodoId),
    queryFn: () => fetchDocenteGrupos(periodoId),
    staleTime: 1000 * 60,
  })
}
