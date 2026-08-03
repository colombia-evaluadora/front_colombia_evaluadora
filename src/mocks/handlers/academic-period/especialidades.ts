import { http, HttpResponse, delay } from "msw"

import { especialidadesDb } from "../../db/academic-period/especialidades"
import { areaSubjectsDb } from "../../db/academic-period/area-subject"
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
    // Fusiona el catálogo con las especialidades ya en uso, dedup por `key`.
    const merged = new Map<string, EspecialidadOption>()
    for (const option of especialidadesDb) merged.set(option.key, option)
    for (const name of enUso) {
      if (!merged.has(name)) merged.set(name, { key: name, label: name })
    }
    return HttpResponse.json<EspecialidadOption[]>(Array.from(merged.values()))
  }),
]