import { http, HttpResponse, delay } from "msw"

import type { EspecialidadEnfasisRow } from "@/features/establishment/academic-period/api/types/especialidad"
import { especialidadesDb } from "@/mocks/db/academic-period/especialidades"
import { areaSubjectsDb } from "@/mocks/db/academic-period/area-subject"
import type { EspecialidadOption } from "@/features/establishment/academic-period/api/types/especialidad"

export const especialidadesHandlers = [
  http.get("/api/especialidades", async ({ request }) => {
    await delay(150)
    const url = new URL(request.url)
    const periodParam = url.searchParams.get("academicPeriodId")
    const periodId = periodParam ? Number(periodParam) : null
    const scoped =
      periodId == null
        ? areaSubjectsDb
        : areaSubjectsDb.filter((row) => row.academicPeriodId === periodId)
    const enUso = scoped.flatMap((area) =>
      area.subjects
        .map((subject) => subject.especialidad)
        .filter((esp): esp is string => Boolean(esp))
    )
    // Catálogo (ESPECIALIDAD) + las ya en uso como énfasis (ENFASIS), dedup por
    // nombre. Simula `fn_especialidad_enfasis_listar`.
    const merged = new Map<string, EspecialidadEnfasisRow>()
    for (const row of especialidadesDb) merged.set(row.nombre, row)
    let nextId = especialidadesDb.reduce((max, row) => Math.max(max, row.id), 0)
    for (const name of enUso) {
      if (!merged.has(name)) {
        nextId += 1
        merged.set(name, {
          id: nextId,
          nombre: name,
          codigo: name.slice(0, 30),
          origen: "ENFASIS",
        })
      }
    }
    return HttpResponse.json<EspecialidadEnfasisRow[]>(
      Array.from(merged.values())
    )
  }),
]