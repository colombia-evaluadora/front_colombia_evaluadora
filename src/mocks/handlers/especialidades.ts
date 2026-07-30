import { http, HttpResponse, delay } from "msw"

import { especialidadesDb } from "../db/especialidades"

export const especialidadesHandlers = [
  http.get("/api/especialidades", async () => {
    await delay(150)
    return HttpResponse.json<string[]>(especialidadesDb)
  }),
]