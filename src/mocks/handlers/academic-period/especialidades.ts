import { http, HttpResponse, delay } from "msw"

import { especialidadesDb } from "../../db/academic-period/especialidades"
import { areaSubjectsDb } from "../../db/academic-period/area-subject"

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
    const especialidades = Array.from(new Set([...especialidadesDb, ...enUso]))
    return HttpResponse.json<string[]>(especialidades)
  }),
]