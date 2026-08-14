import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  AcademicPeriodDetail,
  AcademicPeriodStatus,
} from "@/features/establishment/academic-period/api/types/academic-period"

// Fila cruda de `GET /eval-col/periodos-academicos/:ID` (`fn_periodo_detalle`,
// id_query 22) — snake_case, envuelta en `{rows: [...]}` como todo lo demás
// en este catálogo (confirmado con una llamada de prueba real: este hook
// antes NO desenvolvía ni mapeaba nada, así que `detail` llegaba siendo
// `{rows: [...]}` en vez del objeto esperado — rompía todo lo que depende de
// `academicPeriod` en toda la app).
interface AcademicPeriodDetailRow {
  id: number
  sede_id: number
  sede_name: string
  school_year_id: number
  school_year_name: string
  status_id: number
  status: string
  status_name: string
  start_date: string
  end_date: string
  enrollment_deadline: string
  name: string
  jornada_id: number
  jornada: string
  jornada_name: string
  reserva: "S" | "N"
  default_blocks_count: number | null
  schedule_start_time: string | null
  schedule_end_time: string | null
  // Ya viene camelCase desde el backend (jsonb_build_object arma las llaves
  // así directamente) — el único campo de toda la fila que no es snake_case.
  descansos: { startTime: string; endTime: string }[]
  // Agregado en V71 — antes `fn_periodo_detalle` no lo devolvía aunque
  // create/update sí lo guardaban.
  previous_period_id: number | null
}

interface AcademicPeriodDetailResponse {
  rows: AcademicPeriodDetailRow[]
}

function toAcademicPeriodDetail(row: AcademicPeriodDetailRow): AcademicPeriodDetail {
  return {
    id: row.id,
    sedeId: String(row.sede_id),
    sedeName: row.sede_name,
    previousPeriodId: row.previous_period_id,
    schoolYearId: row.school_year_id,
    status: row.status as AcademicPeriodStatus,
    statusId: row.status_id,
    statusName: row.status_name,
    startDate: row.start_date.slice(0, 10),
    endDate: row.end_date.slice(0, 10),
    enrollmentDeadline: row.enrollment_deadline.slice(0, 10),
    minAbsences: null,
    weeksCount: null,
    minFailedSubjects: null,
    name: row.name,
    isPrincipal: false,
    config: {
      academicPeriodId: row.id,
      jornadaId: row.jornada_id,
      reservationEnabled: row.reserva === "S",
      defaultBlocksCount: row.default_blocks_count,
      scheduleStartTime: row.schedule_start_time,
      scheduleEndTime: row.schedule_end_time,
      breaks: row.descansos ?? [],
    },
  }
}

async function fetchAcademicPeriod(id: number): Promise<AcademicPeriodDetail> {
  const raw: AcademicPeriodDetailResponse = await api.get(
    `/eval-col/periodos-academicos/${id}`
  )
  const row = raw.rows?.[0]
  if (!row) throw new Error("Periodo académico no encontrado.")
  return toAcademicPeriodDetail(row)
}

export const academicPeriodQueryKey = (id: number) => ["academic-period", id]

export function useAcademicPeriodQuery(id: number | undefined) {
  return useQuery({
    queryKey: academicPeriodQueryKey(id ?? 0),
    queryFn: () => fetchAcademicPeriod(id as number),
    enabled: id != null,
  })
}
