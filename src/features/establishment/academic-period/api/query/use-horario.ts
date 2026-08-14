import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ScheduleEntry } from "@/features/establishment/academic-period/api/types/grade-config"

// Fila cruda de `GET /eval-col/horarios/:FK_GRADO` (`fn_horario_listar`,
// id_query 80 — V77: FK_GRADO pasó de `:QUERY.fkGrado` a `:PARAM.FK_GRADO`
// en path, y se agregó `:QUERY.FK_GRUPO` opcional para filtrar por grupo).
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
  // Path param `:FK_GRADO` (V77); antes iba como `?fkGrado=` en query string
  // y bindeaba a `:QUERY.fkGrado` — el SQL nuevo lo castea desde path.
  // `:QUERY.FK_GRUPO` queda opcional (axios omite `null`/`undefined` de la
  // URL, así que el back recibe NULL y lista todos los grupos del grado —
  // es lo que `ScheduleBuilder` quiere para hidratar la grilla completa).
  const raw: HorarioResponse = await api.get(
    `/eval-col/horarios/${gradeId}`,
    {
      params: {
        FK_GRUPO: null,
      },
    }
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
