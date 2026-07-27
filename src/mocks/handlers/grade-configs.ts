import { http, HttpResponse, delay } from "msw"

import { gradeConfigsDb } from "../db/grade-configs"
import type {
  GradeConfig,
  MutationResult,
} from "@/features/establishment/api/types/academic-period/grade-config"

export const gradeConfigsHandlers = [
  http.get("/api/grades/:gradeId/config", async ({ params }) => {
    await delay(200)
    const id = Number(params.gradeId)
    return HttpResponse.json<GradeConfig>(gradeConfigsDb[id] ?? {})
  }),

  http.patch("/api/grades/:gradeId/config", async ({ params, request }) => {
    await delay(400)
    const id = Number(params.gradeId)
    const patch = (await request.json()) as GradeConfig
    gradeConfigsDb[id] = { ...gradeConfigsDb[id], ...patch }
    return HttpResponse.json<MutationResult>({
      status: "ok",
      message: "Configuración del grado guardada.",
    })
  }),
]
