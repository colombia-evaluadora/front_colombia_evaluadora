import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

export interface ReportFilterOption {
  id: number
  nombre: string
}

interface GradeRow {
  id: number
  nombre: string
}
interface GradesRawResponse {
  rows: GradeRow[]
}

// Mismo endpoint que `use-grades.ts` (`fn_grado_listar`), pero solo para
// alimentar el multi-select de "Grado" del reporte de plan de estudio —
// necesita el `id` que el hook de la tabla descarta en su propio mapeo.
async function fetchGradeOptions(academicPeriodId?: number): Promise<ReportFilterOption[]> {
  if (academicPeriodId == null) return []
  const raw: GradesRawResponse = await api.query(`/eval-col/grados/query/${academicPeriodId}`, {
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORTING_ID: null,
    SORTING_DESC: null,
  })
  return (raw.rows ?? []).map((row) => ({ id: row.id, nombre: row.nombre }))
}

export const gradeOptionsQueryKey = (academicPeriodId?: number) => [
  "study-plan-report",
  "grade-options",
  academicPeriodId,
]

export function useGradeOptionsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: gradeOptionsQueryKey(academicPeriodId),
    queryFn: () => fetchGradeOptions(academicPeriodId),
  })
}

interface SubjectRow {
  id: number
  nombre_interno: string
}
interface SubjectsRawResponse {
  rows: SubjectRow[]
}

// Mismo endpoint que `use-subjects.ts` (`fn_subject_periodo_listar`), pero
// conservando el `id` (el hook original lo descarta porque su multi-select
// trabaja por nombre).
async function fetchSubjectOptions(academicPeriodId?: number): Promise<ReportFilterOption[]> {
  if (academicPeriodId == null) return []
  const raw: SubjectsRawResponse = await api.query("/eval-col/areas/asignaturas", {
    FK_PERIODO: academicPeriodId,
    FILTRO: null,
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return (raw.rows ?? []).map((row) => ({ id: row.id, nombre: row.nombre_interno }))
}

export const subjectOptionsQueryKey = (academicPeriodId?: number) => [
  "study-plan-report",
  "subject-options",
  academicPeriodId,
]

export function useSubjectOptionsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: subjectOptionsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjectOptions(academicPeriodId),
  })
}
