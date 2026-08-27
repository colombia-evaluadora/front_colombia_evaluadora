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
  asignatura_id: number
  asignatura: string
  enfasis_nombre: string | null
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
    asignaturaId: row.asignatura_id,
    asignatura: row.enfasis_nombre ? `${row.asignatura} (${row.enfasis_nombre})` : row.asignatura,
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
  // Nombres en UPPER_SNAKE: el backend matchea los tokens `:BODY.*` contra
  // la llave literal del body (ver `fn_plan_listar` / use-assignment-teachers.ts).
  const body: Record<string, string> = {
    PAGE_INDEX: String(params.pageIndex),
    PAGE_SIZE: String(params.pageSize),
  }
  if (params.filters.asignatura) body.FILTRO = params.filters.asignatura
  if (primary) {
    body.SORTING_ID = primary.id
    body.SORTING_DESC = String(primary.desc)
  }

  // `/query` porque `POST /grados/:ID/plan-asignaturas` (sin sufijo) ya está
  // tomado por la creación de ítem (create-study-plan.ts).
  const raw: StudyPlanRawResponse = await api.post(
    `/eval-col/grados/${params.gradeId}/plan-asignaturas/query`,
    body,
  )
  const rows = (raw.rows ?? []).map(toStudyPlanItem)
  const totalCount = raw.rows?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / params.pageSize))
  return { rows, pageCount, totalCount }
}

export const studyPlansQueryKey = (params: UseStudyPlansQueryParams) => ["study-plans", params]

export function useStudyPlansQuery(params: UseStudyPlansQueryParams) {
  return useQuery({
    queryKey: studyPlansQueryKey(params),
    queryFn: () => fetchStudyPlans(params),
    placeholderData: (previous) => previous,
  })
}
