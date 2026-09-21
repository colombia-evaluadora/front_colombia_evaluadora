import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"

interface SubjectRow {
  id: number
  nombre_interno: string
  enfasis_nombre: string | null
  /** FK a `TAREA_ASIGNATURA` (catálogo general de ley) — `null` en una
   *  asignatura que el colegio creó libre, sin partir de ese catálogo. */
  asignatura_general_id: number | null
}
interface SubjectsResponse {
  rows: SubjectRow[]
}

export interface SubjectOption {
  id: number
  label: string
}

// `POST /eval-col/areas/asignaturas` (`fn_subject_periodo_listar`, id_query
// 100) — listado de asignaturas de todo el período (para el nodo curricular
// "AS" de criterios de promoción). Se selecciona por `id`, no por nombre: el
// nombre puede repetirse entre asignaturas de distinto énfasis (ver V143 en
// SSO), así que la etiqueta incluye el énfasis para diferenciarlas.
async function fetchSubjectRows(academicPeriodId?: number): Promise<SubjectRow[]> {
  if (academicPeriodId == null) return []
  const raw: SubjectsResponse = await api.query("/eval-col/areas/asignaturas", {
    FK_PERIODO: academicPeriodId,
    FILTRO: null,
    // 0-based (ver use-period-areas.ts); con 1 siempre volvía vacío.
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return raw.rows ?? []
}

export const subjectsQueryKey = (academicPeriodId?: number) => ["subjects", academicPeriodId]

/**
 * Acta 19-sep-2026: el selector de "Áreas/Asignaturas obligatorias" de
 * Criterios de promoción debe mostrar el nombre GENERAL de ley
 * (`TAREA_ASIGNATURA`), no el que el colegio personalizó (`TASIGNATURA.NOMBRE`,
 * acá `nombre_interno`) — ese nombre libre es el que sí corresponde mostrar en
 * Plan de estudio, que consume esta misma función por otro hook
 * (`use-subject-details-query.ts`) y no se toca.
 *
 * `asignatura_general_id` (ya lo devuelve `fn_subject_periodo_listar`, solo
 * que nadie lo leía) se resuelve contra el mismo catálogo que ya usa
 * Referente (`useGeneralAreasQuery`, `TAREA_ASIGNATURA`). Una asignatura
 * creada libre, sin equivalente general, cae a su nombre interno — nunca
 * queda sin rótulo.
 */
export function useSubjectsQuery(academicPeriodId?: number) {
  const { data: rows = [], ...rest } = useQuery({
    queryKey: subjectsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjectRows(academicPeriodId),
  })
  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const generalNameById = new Map(generalAreas.map((area) => [area.id, area.nombre]))

  const data: SubjectOption[] = rows.map((row) => ({
    id: row.id,
    label:
      (row.asignatura_general_id != null ? generalNameById.get(row.asignatura_general_id) : undefined) ??
      (row.enfasis_nombre ? `${row.nombre_interno} (${row.enfasis_nombre})` : row.nombre_interno),
  }))

  return { ...rest, data }
}
