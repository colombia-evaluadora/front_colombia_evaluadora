import { http, HttpResponse, delay } from "msw"

import {
  DEFAULT_EVALUATION_CRITERIA,
  evaluationCriteriaDb,
} from "../../db/academic-period/evaluation-criteria"
import { evaluationCriteriaOptionsDb } from "../../db/academic-period/evaluation-criteria-options"
import type {
  EvaluationCriteria,
  EvaluationCriteriaOptions,
  MutationResult,
} from "@/features/establishment/academic-period/api/types/evaluation-criteria"

export const evaluationCriteriaHandlers = [
  http.get("/api/evaluation-criteria/options", async () => {
    await delay(150)
    return HttpResponse.json<EvaluationCriteriaOptions>(
      evaluationCriteriaOptionsDb
    )
  }),

  http.get("/api/evaluation-criteria/:academicPeriodId", async ({ params }) => {
    await delay(200)
    const id = Number(params.academicPeriodId)
    const criteria = evaluationCriteriaDb[id] ?? DEFAULT_EVALUATION_CRITERIA
    return HttpResponse.json<EvaluationCriteria>(criteria)
  }),

  http.patch(
    "/api/evaluation-criteria/:academicPeriodId",
    async ({ params, request }) => {
      await delay(400)
      const id = Number(params.academicPeriodId)
      const body = (await request.json()) as EvaluationCriteria
      evaluationCriteriaDb[id] = body
      return HttpResponse.json<MutationResult>({
        status: "ok",
        message: "Criterios de evaluación guardados.",
      })
    }
  ),
]
