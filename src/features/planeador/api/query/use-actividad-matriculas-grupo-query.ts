import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/estudiantes?GRUPO=` (`fn_planeador_estudiantes_candidatos_
 * listar`, V422) — el padrón de matrículas activas de un grupo, para el
 * checklist de "Estudiantes" del form de Actividad. `fn_actividad_crear`/
 * `fn_actividad_actualizar` ya aceptan `FK_TMATRICULAS` (array de
 * `pk_tmatricula`, no de `pk_testudiante`) para asignar la actividad a
 * estudiantes puntuales en vez de todo el grupo — este endpoint es de dónde
 * sale esa lista.
 *
 * Reemplaza a `/planeador/actividades/estudiantes-grupo` (endpoint propio,
 * nunca llegó a mergearse): V422 trajo un endpoint oficial equivalente y más
 * completo — con `ASIGNATURA`/`ACTIVIDAD` opcionales devuelve además
 * `asignado`/`pk_tactividad_estudiante` por fila —, así que no hace falta
 * mantener uno redundante. Acá solo se pide `GRUPO`: `ASIGNATURA` "no
 * recorta la lista" (todos los matriculados del grupo cursan la
 * asignatura, según la documentación del endpoint) y `ACTIVIDAD` es para el
 * caso de EDITAR una actividad ya creada, que este hook no cubre todavía.
 */
interface EstudianteGrupoRow {
  pk_tmatricula: number
  fk_testudiante: number
  estudiante: string
}

export interface MatriculaGrupo {
  /** `PK_TMATRICULA` — lo que viaja en `FK_TMATRICULAS` al crear/editar. */
  id: number
  estudianteId: number
  nombre: string
}

function toMatriculaGrupo(row: EstudianteGrupoRow): MatriculaGrupo {
  return {
    id: row.pk_tmatricula,
    estudianteId: row.fk_testudiante,
    nombre: row.estudiante,
  }
}

async function fetchMatriculasGrupo(grupoId: number): Promise<MatriculaGrupo[]> {
  const rows = await evalCol.getRows<EstudianteGrupoRow>(`/planeador/estudiantes?GRUPO=${grupoId}`)
  return rows.map(toMatriculaGrupo)
}

export const matriculasGrupoQueryKey = (grupoId: number) =>
  ["planeador", "matriculas-grupo", grupoId] as const

/**
 * `grupoId` en `undefined` deshabilita la consulta — mismo criterio que
 * `useReferenteCurricularQuery`: el campo "Estudiantes" está deshabilitado
 * hasta elegir Grado/Grupo (y Asignatura), así que no tiene sentido pedir
 * el padrón antes de eso.
 */
export function useActividadMatriculasGrupoQuery(grupoId: number | undefined) {
  return useQuery({
    queryKey: grupoId != null ? matriculasGrupoQueryKey(grupoId) : (["planeador", "matriculas-grupo", "none"] as const),
    queryFn: () => fetchMatriculasGrupo(grupoId!),
    enabled: grupoId != null,
    staleTime: 1000 * 60,
  })
}
