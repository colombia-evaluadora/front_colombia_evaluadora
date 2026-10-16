import { http, HttpResponse, delay } from "msw"

import { generalAreasDb } from "@/mocks/db/academic-period/general-areas"
import { teachingLevelsDb } from "@/mocks/db/academic-period/rating-scales"

type GeneralAreaMock = (typeof generalAreasDb)[number]

// Mismo catálogo servido como Áreas oficiales (V317). `generalAreasDb` trae
// filas de relleno que no son áreas ("Primaria", "No aplica"): se omiten acá
// y no allá, porque otros mocks dependen de sus ids. "Preescolar" (id 1) hace
// de «Dimensiones», como DIMENSIONES en el catálogo real. Solo lectura.
const NO_SON_AREAS = new Set([2, 22])
const SOLO_MEDIA = new Set([17, 18, 19, 20])

/** Niveles verosímiles (pks de `teachingLevelsDb`): 1 Preescolar … 4 Media. */
function nivelesMock(area: GeneralAreaMock): number[] {
  if (area.id === 1) return [1]
  if (area.especialidadId === 2 || SOLO_MEDIA.has(area.id)) return [4]
  if ([12, 14, 15].includes(area.id)) return [1, 2, 3, 4]
  return [2, 3, 4]
}

const areasOficialesMock = generalAreasDb
  .filter((area) => !NO_SON_AREAS.has(area.id))
  .map((area) => (area.id === 1 ? { ...area, nombre: "Dimensiones" } : area))

const toAreaOficial = (area: GeneralAreaMock) => ({
  pkAreaOficial: area.id,
  nombre: area.nombre,
  habilitada: true,
  esDimensionTransversal: area.id === 1,
  especialidad: null,
  niveles: nivelesMock(area).map((pk) => ({
    pkNivel: pk,
    codigo: String(pk),
    nombre: teachingLevelsDb.find((level) => level.id === pk)?.nombre ?? "",
  })),
  // Matemáticas en uso: así se ve el aviso en lugar de "Eliminar".
  usos: { planesEstudio: area.id === 15 ? 3 : 0, referentes: area.id === 15 ? 1 : 0 },
  enUso: area.id === 15,
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
    const resultado = areasOficialesMock.map(({ id, nombre }) => ({
      pkAreaOficial: id,
      nombre,
      esDimensionTransversal: id === 1,
    }))
    return HttpResponse.json({ rows: [{ resultado }] })
  }),
  http.get("/api/eval-col/areas-oficiales", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [{ resultado: areasOficialesMock.map(toAreaOficial) }] })
  }),
]
