import { http, HttpResponse, delay } from "msw"

import { horarioDb, nextHorarioId, DIA_SEMANA_NAMES } from "@/mocks/db/academic-period/horario"
import { gradesDb } from "@/mocks/db/academic-period/grades"
import { gradeGroupsDb } from "@/mocks/db/academic-period/grade-groups"
import { studyPlansDb } from "@/mocks/db/academic-period/study-plans"

// `fn_horario_listar`/`fn_horario_guardar` (ids_query 80/79) — no tenían
// NINGÚN mock; la pestaña de Horario caía al mismo bug de logout que
// Criterio de promoción apenas se abría.
export const horarioHandlers = [
  http.get("/api/eval-col/horarios", async ({ request }) => {
    await delay(200)
    const gradeId = Number(new URL(request.url).searchParams.get("fkGrado"))
    const groupIds = new Set(
      gradeGroupsDb.filter((g) => g.gradeId === gradeId).map((g) => g.id)
    )
    const grade = gradesDb.find((g) => g.id === gradeId)

    const rows = horarioDb
      .filter((entry) => groupIds.has(entry.grupoId))
      .map((entry) => {
        const group = gradeGroupsDb.find((g) => g.id === entry.grupoId)
        const planItem = studyPlansDb.find((p) => p.codigo === entry.planItemId)
        return {
          id: entry.id,
          grado_id: gradeId,
          grado: grade?.nombre ?? "",
          grupo_id: entry.grupoId,
          grupo: group?.codigo ?? "",
          plan_item_id: entry.planItemId,
          asignatura_id: entry.planItemId,
          asignatura: planItem?.asignatura ?? "",
          dia_id: entry.diaId,
          dia: String(entry.diaId),
          dia_name: DIA_SEMANA_NAMES[entry.diaId] ?? "",
          bloque: entry.bloque,
        }
      })
    return HttpResponse.json({ rows })
  }),

  http.post("/api/eval-col/horarios", async ({ request }) => {
    await delay(400)
    const body = (await request.json()) as {
      FK_GRADO: number
      ENTRIES: { grupoId: number; planItemId: number; diaId: number; bloque: number }[]
    }
    const groupIds = new Set(
      gradeGroupsDb.filter((g) => g.gradeId === body.FK_GRADO).map((g) => g.id)
    )
    // Reemplazo total: borra todo el horario actual de los grupos del grado
    // y reinserta las entradas nuevas (igual que `fn_horario_guardar` real).
    for (let i = horarioDb.length - 1; i >= 0; i--) {
      if (groupIds.has(horarioDb[i].grupoId)) horarioDb.splice(i, 1)
    }
    for (const entry of body.ENTRIES ?? []) {
      horarioDb.push({ id: nextHorarioId(), ...entry })
    }
    return HttpResponse.json({ rows: [{ fn_horario_guardar: body.ENTRIES?.length ?? 0 }] })
  }),
]
