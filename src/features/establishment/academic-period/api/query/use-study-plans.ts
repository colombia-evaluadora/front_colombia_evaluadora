import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  StudyPlanItem,
  StudyPlanQueryRequest,
  StudyPlanQueryResponse,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface UseStudyPlansQueryParams {
  filters: StudyPlanQueryRequest["filters"]
  sorting: StudyPlanQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
  academicPeriodId?: number
  gradeId?: number
}

// Fila cruda de `GET /eval-col/grados/:ID/plan-asignaturas` (`fn_plan_listar`,
// id_query 76). `formato_calificacion`/`criterio_nota` vienen SIEMPRE
// resueltos (override del renglón o heredado del criterio de evaluación del
// periodo); `personalizado` dice cuál de los dos es.
interface StudyPlanRow {
  codigo: number
  asignatura: string
  intensidad_horaria: number
  influencia_area: number
  numero_creditos: number
  influye_desempeno: boolean
  matricula_obligatoria: boolean
  aprobacion_obligatoria: boolean
  formato_calificacion: number
  criterio_nota: number
  personalizado: boolean
  total_count: number
}
interface StudyPlanRawResponse {
  rows: StudyPlanRow[]
}

function toStudyPlanItem(row: StudyPlanRow): StudyPlanItem {
  return {
    codigo: row.codigo,
    asignatura: row.asignatura,
    intensidadHoraria: row.intensidad_horaria,
    influenciaArea: row.influencia_area,
    numeroCreditos: row.numero_creditos,
    influyeDesempeno: row.influye_desempeno,
    matriculaObligatoria: row.matricula_obligatoria,
    aprobacionObligatoria: row.aprobacion_obligatoria,
    // Solo se exponen como override cuando el renglón lo personalizó — si no,
    // el diálogo debe mostrar el heredado del periodo, no este valor
    // resuelto (ver dialog-create-study-plan.tsx: `item.formatoCalificacion
    // ?? formatoHeredado`).
    formatoCalificacion: row.personalizado ? String(row.formato_calificacion) : undefined,
    criterioNota: row.personalizado ? String(row.criterio_nota) : undefined,
    personalizado: row.personalizado,
  }
}

async function fetchStudyPlans(
  params: UseStudyPlansQueryParams
): Promise<StudyPlanQueryResponse> {
  if (params.gradeId == null) return { rows: [], pageCount: 1, totalCount: 0 }
  const [primary] = params.sorting
  const query = new URLSearchParams({
    pageIndex: String(params.pageIndex),
    pageSize: String(params.pageSize),
  })
  if (params.filters.asignatura) query.set("filtro", params.filters.asignatura)
  if (primary) {
    query.set("sortingId", primary.id)
    query.set("sortingDesc", String(primary.desc))
  }

  const raw: StudyPlanRawResponse = await api.get(
    `/eval-col/grados/${params.gradeId}/plan-asignaturas?${query.toString()}`
  )
  const rows = (raw.rows ?? []).map(toStudyPlanItem)
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const studyPlansQueryKey = (params: UseStudyPlansQueryParams) => [
  "study-plans",
  params,
]

export function useStudyPlansQuery(params: UseStudyPlansQueryParams) {
  return useQuery({
    queryKey: studyPlansQueryKey(params),
    queryFn: () => fetchStudyPlans(params),
    placeholderData: (previous) => previous,
  })
}
