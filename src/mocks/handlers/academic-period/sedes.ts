import { http, HttpResponse, delay } from "msw"

import type { Sede } from "@/features/establishment/academic-period/api/types/sede"
import { sedesDb } from "../../db/academic-period/sedes"

export const sedesHandlers = [
  http.get("/api/sedes", async () => {
    await delay(150)
    return HttpResponse.json<Sede[]>(sedesDb)
  }),
]
