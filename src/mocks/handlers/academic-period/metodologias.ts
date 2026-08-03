import { http, HttpResponse, delay } from "msw"

import { metodologiasDb } from "../../db/academic-period/metodologias"
import type { MetodologiaOption } from "@/features/establishment/academic-period/api/types/metodologia"

export const metodologiasHandlers = [
  http.get("/api/metodologias", async () => {
    await delay(150)
    return HttpResponse.json<MetodologiaOption[]>(metodologiasDb)
  }),
]
