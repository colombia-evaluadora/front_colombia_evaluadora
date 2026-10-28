import { http, HttpResponse, delay } from "msw"

import {
  defaultPromotionCriteria,
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
// V73 — `OBLIGATORIAS` es un array plano de ids; `NODO_CURRICULAR` ("AS"|"AR")
// dice si son de TASIGNATURA o de TAREA.
function mandatorySubjectsFor(body: PromotionCriteriaWriteBody) {
  return body.OBLIGATORIAS.map((pk, i) => {
    if (body.NODO_CURRICULAR === "AS") {
      const subject = subjectsDb.find((s) => s.id === pk)
      return {
        id: i,
        type: "subject" as const,
        subjectId: pk,
        subjectName: subject?.nombreInterno ?? null,
        areaId: null,
        areaName: null,
      }
    }
    const area = areasDb.find((a) => a.id === pk)
    return {
      id: i,
      type: "area" as const,
      subjectId: null,
      subjectName: null,
      areaId: pk,
      areaName: area?.nombreInterno ?? null,
    }
  })
}

// Reglas 39, 40 y 105 tal como las aplicaría `fn_criterio_prom_guardar`.
function validate(body: PromotionCriteriaWriteBody): string | null {
  if (body.CANTIDAD_NIVELAR < 0 || body.CANTIDAD_NIVELAR > 20) {
    return "La cantidad máxima reprobadas para nivelar debe estar entre 0 y 20."
  }
  const percents = [body.MINIMO_INASISTENCIAS]
  if (body.APROBACION_PROMEDIO === "S") {
    percents.push(body.DESEMPENHO_MIN_GENERAL, body.DESEMPENHO_MINIMO)
  }
  if (percents.some((p) => p == null || p < 0 || p > 100)) {
    return "Los porcentajes deben estar entre 0 y 100."
  }
  const requisitos = (body.REQUISITOS_PROPIOS ?? []).map((r) => r.trim())
  if (requisitos.length > 10) return "Se pueden agregar hasta 10 requisitos propios."
  if (requisitos.some((r) => r.length < 3 || r.length > 80)) {
    return "Cada requisito debe tener entre 3 y 80 caracteres."
  }
  if (new Set(requisitos.map((r) => r.toLowerCase())).size !== requisitos.length) {
    return "Ya existe un requisito con ese nombre."
  }
  return null
}

export const promotionCriteriaHandlers = [
  // Restablecer: el grado deja de tener criterio propio y vuelve a leer el del período.
  http.put(
    "/api/eval-col/periodos/:academicPeriodId/criterio-promocion/restablecer",
    async ({ params, request }) => {
      await delay(300)
      const academicPeriodId = Number(params.academicPeriodId)
      const { FK_GRADO } = (await request.json()) as { FK_GRADO: number }
      delete promotionCriteriaDb[promotionCriteriaKey(academicPeriodId, FK_GRADO)]
      return HttpResponse.json({ rows: [{ id: FK_GRADO }] })
    }
  ),

  http.get(
    "/api/eval-col/periodos/:academicPeriodId/criterio-promocion",
    async ({ params, request }) => {
      await delay(200)
      const academicPeriodId = Number(params.academicPeriodId)
      const url = new URL(request.url)
      // Mismo nombre que manda `use-promotion-criteria.ts` en `params`.
      const fkGrado = url.searchParams.get("FK_GRADO")
      const gradeId = fkGrado ? Number(fkGrado) : undefined
      const stored = promotionCriteriaDb[promotionCriteriaKey(academicPeriodId, gradeId)]

      // El grado sin ajuste propio no tiene fila: el front cae al del período.
      if (!stored && gradeId != null) return HttpResponse.json({ rows: [] })
      const body = stored ?? defaultPromotionCriteria()

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
            requisito_complementaria: body.REQUISITO_COMPLEMENTARIA ?? "N",
            requisitos_norma: body.REQUISITOS_NORMA ?? null,
            requisitos_propios: body.REQUISITOS_PROPIOS ?? [],
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
      const error = validate(body)
      if (error) return HttpResponse.json({ status: "error", message: error }, { status: 409 })
      const gradeId = body.FK_GRADO ?? undefined
      promotionCriteriaDb[promotionCriteriaKey(academicPeriodId, gradeId)] = body
      return HttpResponse.json({ status: "ok", message: "Criterios de promoción guardados." })
    }
  ),
]
