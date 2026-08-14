import { http, HttpResponse, delay } from "msw"

import {
  promotionCriteriaDb,
  promotionCriteriaKey,
  type PromotionCriteriaWriteBody,
} from "@/mocks/db/academic-period/promotion-criteria"
import { areasDb } from "@/mocks/db/academic-period/areas"
import { subjectsDb } from "@/mocks/db/academic-period/subjects"

// `fn_criterio_prom_obtener`/`fn_criterio_prom_guardar` — el path/body reales
// (ver `use-promotion-criteria.ts`/`update-promotion-criteria.ts`), no el
// `/api/promotion-criteria/:id` viejo que este mock tenía antes. Al no
// interceptarse la ruta real, la request caía sin match de MSW y pasaba de
// largo por el proxy de Vite hasta el gateway real, que rechazaba el JWT de
// mock con 401 — el interceptor de `api-client.ts` trata cualquier 401 como
// sesión vencida y desloguea. Por eso entrar a "Criterio de promoción" con
// mocks activos mandaba directo a login.
function mandatorySubjectsFor(body: PromotionCriteriaWriteBody) {
  return body.OBLIGATORIAS.map((o, i) => {
    if (o.asignaturaId != null) {
      const subject = subjectsDb.find((s) => s.id === o.asignaturaId)
      return {
        id: i,
        type: "subject" as const,
        subjectId: o.asignaturaId,
        subjectName: subject?.nombreInterno ?? null,
        areaId: null,
        areaName: null,
      }
    }
    const area = areasDb.find((a) => a.id === o.areaId)
    return {
      id: i,
      type: "area" as const,
      subjectId: null,
      subjectName: null,
      areaId: o.areaId,
      areaName: area?.nombreInterno ?? null,
    }
  })
}

export const promotionCriteriaHandlers = [
  http.get(
    "/api/eval-col/periodos/:academicPeriodId/criterio-promocion",
    async ({ params, request }) => {
      await delay(200)
      const academicPeriodId = Number(params.academicPeriodId)
      const url = new URL(request.url)
      const fkGrado = url.searchParams.get("fkGrado")
      const gradeId = fkGrado ? Number(fkGrado) : undefined
      const body = promotionCriteriaDb[promotionCriteriaKey(academicPeriodId, gradeId)]

      // Sin fila = todavía no se configuró — el front lo trata como "no
      // error", no como 404 (ver `fetchPromotionCriteria`).
      if (!body) return HttpResponse.json({ rows: [] })

      return HttpResponse.json({
        rows: [
          {
            id: academicPeriodId,
            academic_period_id: academicPeriodId,
            grade_id: gradeId ?? null,
            curriculum_node: body.NODO_CURRICULAR,
            max_failed_recovery: body.CANTIDAD_NIVELAR,
            asignatura_obligatoria: body.ASIGNATURA_OBLIGATORIA,
            apply_average_approval: body.APROBACION_PROMEDIO,
            base_percentage: body.DESEMPENHO_MIN_GENERAL,
            minimum_subject_percentage: body.DESEMPENHO_MINIMO,
            max_failed_for_average: body.MAX_ASIG_PROMEDIO,
            absence_percentage: body.MINIMO_INASISTENCIAS,
            max_leveled_subjects: body.MAX_ASIG_NIVELAR_PROM,
            mandatory_subjects: mandatorySubjectsFor(body),
          },
        ],
      })
    }
  ),

  http.put(
    "/api/eval-col/periodos/:academicPeriodId/criterio-promocion",
    async ({ params, request }) => {
      await delay(400)
      const academicPeriodId = Number(params.academicPeriodId)
      const body = (await request.json()) as PromotionCriteriaWriteBody
      const gradeId = body.FK_GRADO ?? undefined
      promotionCriteriaDb[promotionCriteriaKey(academicPeriodId, gradeId)] = body
      return HttpResponse.json({ status: "ok", message: "Criterios de promoción guardados." })
    }
  ),
]
