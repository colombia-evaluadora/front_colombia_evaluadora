import type { PlaneadorPeriodoEvaluacion } from "@/features/planeador/api/query/use-planeador-periodos-evaluacion-query"

/**
 * Periodos de evaluación que ofrece la cuarta columna del filtro de la
 * Planilla. `GET /planeador/periodos-evaluacion` devuelve los de TODOS los
 * periodos académicos que el usuario puede ver (otros años, otras jornadas o
 * sedes), así que sin filtrar aparecían "Periodo 1" repetidos con fechas
 * distintas (QA, más visible offline: sin sede/año/jornada en la URL el
 * alcance no resuelve periodo académico).
 *
 * - Con el periodo académico del filtro avanzado: solo los suyos.
 * - Sin él: el periodo académico vigente hoy (alguno de sus periodos contiene
 *   `hoy`); si ninguno lo está, el más reciente (mayor fecha de inicio).
 *   El grupo no trae su periodo académico en `docentes/grupos`, por eso la
 *   heurística; los grupos de esa lista son los del periodo vigente.
 * - Sin repetidos por id (por si la caché trae filas duplicadas).
 */
export function periodosDelGrupo(
  periodos: PlaneadorPeriodoEvaluacion[],
  periodoAcademicoId: number | undefined,
  hoy: string = new Date().toISOString().slice(0, 10),
): PlaneadorPeriodoEvaluacion[] {
  const unicos = [...new Map(periodos.map((p) => [p.id, p])).values()]
  if (periodoAcademicoId != null) {
    const delPeriodo = unicos.filter((p) => p.periodoAcademicoId === periodoAcademicoId)
    if (delPeriodo.length > 0) return delPeriodo
  }
  const academicos = new Set(unicos.map((p) => p.periodoAcademicoId))
  if (academicos.size <= 1) return unicos
  const vigentes = new Set(
    unicos.filter((p) => p.startDate <= hoy && hoy <= p.endDate).map((p) => p.periodoAcademicoId),
  )
  if (vigentes.size > 0) return unicos.filter((p) => vigentes.has(p.periodoAcademicoId))
  const reciente = unicos.reduce((a, b) => (b.startDate > a.startDate ? b : a))
  return unicos.filter((p) => p.periodoAcademicoId === reciente.periodoAcademicoId)
}
