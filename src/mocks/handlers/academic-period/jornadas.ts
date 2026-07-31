import { http, HttpResponse, delay } from "msw"

import type { Jornada } from "@/features/establishment/academic-period/api/types/jornada"
import { jornadasDb } from "../../db/academic-period/jornadas"

export const jornadasHandlers = [
  http.get("/api/jornadas", async () => {
    await delay(150)
    return HttpResponse.json<Jornada[]>(jornadasDb)
  }),
]
