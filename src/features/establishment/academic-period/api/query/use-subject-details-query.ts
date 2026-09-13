import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

interface SubjectDetailRow {
  id: number
  codigo: string
  nombre_interno: string
  area_id: number
  area_nombre: string
  asignatura_general_id: number | null
  enfasis_nombre: string | null
  color: string | null
  orden_reportes: number
}
interface SubjectDetailsResponse {
  rows: SubjectDetailRow[]
}

export interface SubjectDetail {
  id: number
  abreviacion: string
  nombreInterno: string
  areaId: number
  areaNombre: string
  asignaturaGeneralId: number | null
  especialidad: string | null
  color: string | null
  ordenReportes: number
}

// `POST /eval-col/areas/asignaturas` (`fn_subject_periodo_listar`, id_query
// 100) — mismo endpoint que `use-subjects.ts`, pero sin descartar los campos
// que ese hook no necesita (abreviación, área, color, orden). Se usa para
// mostrar el detalle completo de una asignatura ya seleccionada, sin tener
// que abrir el diálogo de edición de área/asignatura solo para verla.
async function fetchSubjectDetails(academicPeriodId?: number): Promise<SubjectDetail[]> {
  if (academicPeriodId == null) return []
  const raw: SubjectDetailsResponse = await api.query("/eval-col/areas/asignaturas", {
    FK_PERIODO: academicPeriodId,
    FILTRO: null,
    // 0-based (ver use-period-areas.ts); con 1 siempre volvía vacío.
    PAGE_INDEX: 0,
    PAGE_SIZE: 200,
    SORT_BY: null,
    SORT_DIR: null,
  })
  return (raw.rows ?? []).map((row) => ({
    id: row.id,
    abreviacion: row.codigo,
    nombreInterno: row.nombre_interno,
    areaId: row.area_id,
    areaNombre: row.area_nombre,
    asignaturaGeneralId: row.asignatura_general_id,
    especialidad: row.enfasis_nombre,
    color: row.color,
    ordenReportes: row.orden_reportes,
  }))
}

export const subjectDetailsQueryKey = (academicPeriodId?: number) => [
  "subject-details",
  academicPeriodId,
]

export function useSubjectDetailsQuery(academicPeriodId?: number) {
  return useQuery({
    queryKey: subjectDetailsQueryKey(academicPeriodId),
    queryFn: () => fetchSubjectDetails(academicPeriodId),
  })
}
