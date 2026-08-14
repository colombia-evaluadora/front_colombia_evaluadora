import { http, HttpResponse, delay } from "msw"

import { generalAreasDb } from "@/mocks/db/academic-period/general-areas"

export const generalAreasHandlers = [
  http.get("/api/eval-col/areas/general", async () => {
    await delay(150)
    const rows = generalAreasDb.map((area) => ({
      id: area.id,
      nombre: area.nombre,
      especialidad_id: area.especialidadId,
    }))
    return HttpResponse.json({ rows })
  }),
]
