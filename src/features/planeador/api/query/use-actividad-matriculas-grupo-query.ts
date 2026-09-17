import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/**
 * `GET /planeador/actividades/estudiantes-grupo?grupo=` (confirmado real,
 * probado end-to-end contra el servidor de test) — el padrón de matrículas
 * activas de un grupo, para el checklist de "Estudiantes" del form de
 * Actividad. `fn_actividad_crear`/`fn_actividad_actualizar` ya aceptan
 * `FK_TMATRICULAS` (array de `pk_tmatricula`, no de `pk_testudiante`) para
 * asignar la actividad a estudiantes puntuales en vez de todo el grupo —
 * este endpoint es de dónde sale esa lista.
 */
interface MatriculaGrupoRow {
  fk_tmatricula: number
  fk_testudiante: number
  estudiante: string
  documento: string
}

export interface MatriculaGrupo {
  /** `PK_TMATRICULA` — lo que viaja en `FK_TMATRICULAS` al crear/editar. */
  id: number
  estudianteId: number
  nombre: string
  documento: string
}

function toMatriculaGrupo(row: MatriculaGrupoRow): MatriculaGrupo {
  return {
    id: row.fk_tmatricula,
    estudianteId: row.fk_testudiante,
    nombre: row.estudiante,
    documento: row.documento,
  }
}

async function fetchMatriculasGrupo(grupoId: number): Promise<MatriculaGrupo[]> {
  const rows = await evalCol.getRows<MatriculaGrupoRow>(
    `/planeador/actividades/estudiantes-grupo?grupo=${grupoId}`,
  )
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
