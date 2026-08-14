import { api } from "@/lib/api-client"

interface AvailableSubjectRow {
  id: number
  nombre: string
}
interface AvailableSubjectsResponse {
  rows: AvailableSubjectRow[]
}

// `fn_plan_agregar`/`fn_plan_actualizar` piden `FK_ASIGNATURA`, pero el
// selector de "asignatura" del plan de estudio trabaja por nombre (ver
// use-available-study-plan-subjects-query.ts). Al editar sin cambiar la
// asignatura, no se encuentra en "disponibles" (la excluye la consulta
// porque ya está asignada) y esto devuelve `null` — está bien: en
// `fn_plan_actualizar`, `FK_ASIGNATURA = NULL` significa "no tocar" (COALESCE
// con la actual), que es justo el caso de no haberla cambiado.
export async function resolvePlanAsignaturaId(
  gradeId: number,
  nombre: string
): Promise<number | null> {
  const raw: AvailableSubjectsResponse = await api.get(
    `/eval-col/grados/${gradeId}/plan-disponibles`
  )
  const match = (raw.rows ?? []).find((row) => row.nombre === nombre)
  return match ? match.id : null
}
