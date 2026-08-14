import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ScheduleEntry } from "@/features/establishment/academic-period/api/types/grade-config"

// Fila cruda de `GET /eval-col/horarios` (`fn_horario_listar`, id_query 80).
interface HorarioRow {
  id: number
  grado_id: number
  grado: string
  grupo_id: number
  grupo: string
  plan_item_id: number | null
  asignatura_id: number
  asignatura: string
  dia_id: number
  dia: string
  dia_name: string
  bloque: number
}
interface HorarioResponse {
  rows: HorarioRow[]
}

function toScheduleEntry(row: HorarioRow): ScheduleEntry | null {
  // Sin `plan_item_id` (renglón de plan borrado/fuera del plan actual) no hay
  // forma de ubicarlo en la grilla (que indexa por asignatura del plan) — se
  // descarta, igual que si la celda nunca hubiera existido.
  if (row.plan_item_id == null) return null
  return {
    grupoId: row.grupo_id,
    planItemId: row.plan_item_id,
    diaId: row.dia_id,
    bloque: row.bloque,
  }
}

async function fetchHorario(gradeId: number): Promise<ScheduleEntry[]> {
  const raw: HorarioResponse = await api.get(
    `/eval-col/horarios?fkGrado=${gradeId}`
  )
  return (raw.rows ?? [])
    .map(toScheduleEntry)
    .filter((entry): entry is ScheduleEntry => entry != null)
}

export const horarioQueryKey = (gradeId?: number) => ["horario", gradeId]

export function useHorarioQuery(gradeId?: number) {
  return useQuery({
    queryKey: horarioQueryKey(gradeId),
    queryFn: () => fetchHorario(gradeId as number),
    enabled: gradeId != null,
  })
}
