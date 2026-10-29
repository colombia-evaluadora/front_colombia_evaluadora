import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type {
  ScheduleCellCause,
  ScheduleEntry,
} from "@/features/establishment/academic-period/api/types/grade-config"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { proveedorMeta } from "@/lib/offline/query-meta"

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
  // Regla 74 (fn_horario_celdas_afectadas_interno).
  afectado?: boolean
  causa?: ScheduleCellCause | null
}
interface HorarioResponse {
  rows: HorarioRow[]
}

// Regla 74: las celdas afectadas (también las de una asignatura que salió del
// plan, sin `plan_item_id`) se conservan y se marcan hasta que se corrigen.
function toScheduleEntry(row: HorarioRow): ScheduleEntry {
  return {
    grupoId: row.grupo_id,
    planItemId: row.plan_item_id,
    diaId: row.dia_id,
    bloque: row.bloque,
    horarioId: row.id,
    afectado: Boolean(row.afectado),
    causa: row.causa ?? null,
    asignatura: row.asignatura,
  }
}

export async function fetchHorario(gradeId: number): Promise<ScheduleEntry[]> {
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
  return (raw.rows ?? []).map(toScheduleEntry)
}

export function useHorarioQuery(gradeId?: number) {
  return useQuery({
    meta: proveedorMeta(),
    queryKey: academicPeriodKeys.horario.byGrade(gradeId),
    queryFn: () => fetchHorario(gradeId as number),
    enabled: gradeId != null,
  })
}
