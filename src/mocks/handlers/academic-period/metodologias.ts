import { http, HttpResponse, delay } from "msw"

import { metodologiasDb } from "../../db/academic-period/metodologias"

export const metodologiasHandlers = [
  http.get("/api/metodologias", async () => {
    await delay(150)
    return HttpResponse.json<string[]>(metodologiasDb)
  }),
]
