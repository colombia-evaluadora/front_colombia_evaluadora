import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"

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

async function fetchDocenteGrupos(periodoId?: number, funcionario?: number): Promise<DocenteGrupo[]> {
  const query = new URLSearchParams()
  if (periodoId != null) query.set("periodo", String(periodoId))
  if (funcionario != null) query.set("funcionario", String(funcionario))
  const qs = query.toString()
  const rows = await evalCol.getRows<DocenteGrupoRow>(`/planeador/docentes/grupos${qs ? `?${qs}` : ""}`)
  return rows.map(toDocenteGrupo)
}

/** `funcionario` sale de `usePlaneadorDocenteScope` (`?docente=` de
 *  Actividades/Unidades); fuera de esas vistas es siempre el del token. */
export function useDocenteGruposQuery(periodoId?: number) {
  const { funcionario, consultasHabilitadas } = usePlaneadorDocenteScope()
  return useQuery({
    queryKey: planeadorKeys.docenteGrupos(periodoId, funcionario),
    queryFn: () => fetchDocenteGrupos(periodoId, funcionario),
    enabled: consultasHabilitadas,
    staleTime: 1000 * 60,
  })
}
