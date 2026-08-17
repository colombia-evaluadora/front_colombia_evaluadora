import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

interface SubjectRow {
  id: number
  nombre_interno: string
}
interface SubjectsResponse {
  rows: SubjectRow[]
}

// `POST /eval-col/areas/asignaturas` (`fn_subject_periodo_listar`, id_query
// 100) — listado de asignaturas de todo el período (para el nodo curricular
// "AS" de criterios de promoción). Se descartan `id` acá porque el
// multi-select trabaja por nombre; `resolve-required-subjects.ts` vuelve a
// pedir esta misma lista para resolver nombre→id al guardar.
async function fetchSubjects(academicPeriodId?: number): Promise<string[]> {
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
  return (raw.rows ?? []).map((row) => row.nombre_interno)
}

export const subjectsQueryKey = (academicPeriodId?: number) => ["subjects", academicPeriodId]

export function useSubjectsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: subjectsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjects(academicPeriodId),
  })
}
