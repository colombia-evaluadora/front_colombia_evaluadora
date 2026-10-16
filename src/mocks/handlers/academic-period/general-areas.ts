import { http, HttpResponse, delay } from "msw"

import { generalAreasDb } from "@/mocks/db/academic-period/general-areas"

// Mismo catálogo servido como Áreas oficiales (V317): todas activas, sin
// niveles ni usos. Solo lectura; las escrituras no tienen mock.
const toAreaOficial = (area: (typeof generalAreasDb)[number]) => ({
  pkAreaOficial: area.id,
  nombre: area.nombre,
  habilitada: true,
  esDimensionTransversal: area.nombre.toUpperCase() === "DIMENSIONES",
  especialidad: null,
  niveles: [],
  usos: { planesEstudio: 0, referentes: 0 },
  enUso: false,
})

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
  http.get("/api/eval-col/catalogos/areas-oficiales", async () => {
    await delay(150)
    const resultado = generalAreasDb.map(({ id, nombre }) => ({
      pkAreaOficial: id,
      nombre,
      esDimensionTransversal: nombre.toUpperCase() === "DIMENSIONES",
    }))
    return HttpResponse.json({ rows: [{ resultado }] })
  }),
  http.get("/api/eval-col/areas-oficiales", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [{ resultado: generalAreasDb.map(toAreaOficial) }] })
  }),
]
