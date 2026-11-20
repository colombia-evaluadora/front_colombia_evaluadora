import { http, HttpResponse, delay } from "msw"

import { generalAreasDb } from "@/mocks/db/academic-period/general-areas"
import { teachingLevelsDb } from "@/mocks/db/academic-period/rating-scales"

type GeneralAreaMock = (typeof generalAreasDb)[number]

// Mismo catálogo servido como Áreas oficiales (V317). `generalAreasDb` trae
// filas de relleno que no son áreas ("Primaria", "No aplica"): se omiten acá
// y no allá, porque otros mocks dependen de sus ids. "Preescolar" (id 1) hace
// de «Dimensiones», como DIMENSIONES en el catálogo real. Crear, modificar, estado y
// eliminar trabajan sobre una copia en memoria (`areasOficialesDb`), así la vista
// se prueba entera sin llegar al backend.
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

type AreaOficialMock = ReturnType<typeof toAreaOficial>

let areasOficialesDb: AreaOficialMock[] | null = null
const areasOficiales = () => (areasOficialesDb ??= areasOficialesMock.map(toAreaOficial))

const nivelesDe = (pks: number[]) =>
  pks.map((pk) => ({
    pkNivel: pk,
    codigo: String(pk),
    nombre: teachingLevelsDb.find((level) => level.id === pk)?.nombre ?? "",
  }))

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()

function nombreRepetido(nombre: string, excepto?: number) {
  return areasOficiales().some(
    (a) => a.pkAreaOficial !== excepto && normalizar(a.nombre) === normalizar(nombre),
  )
}

const repetido = () =>
  HttpResponse.json(
    { message: "Ya existe un área oficial con ese nombre.", code: "23505" },
    { status: 409 },
  )
const noExiste = () =>
  HttpResponse.json({ message: "No existe el área oficial solicitada." }, { status: 404 })

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
    return HttpResponse.json({ rows: [{ resultado: areasOficiales() }] })
  }),
  http.post("/api/eval-col/areas-oficiales", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as { NOMBRE: string; NIVELES: number[] }
    if (nombreRepetido(body.NOMBRE)) return repetido()
    const area: AreaOficialMock = {
      pkAreaOficial: Math.max(0, ...areasOficiales().map((a) => a.pkAreaOficial)) + 1,
      nombre: body.NOMBRE,
      habilitada: true,
      esDimensionTransversal: false,
      especialidad: null,
      niveles: nivelesDe(body.NIVELES),
      usos: { planesEstudio: 0, referentes: 0 },
      enUso: false,
    }
    areasOficiales().push(area)
    return HttpResponse.json({ rows: [{ resultado: area }] })
  }),
  http.put("/api/eval-col/areas-oficiales/:id/estado", async ({ request, params }) => {
    await delay(150)
    const area = areasOficiales().find((a) => a.pkAreaOficial === Number(params.id))
    if (!area) return noExiste()
    const body = (await request.json()) as { HABILITADA: boolean }
    area.habilitada = body.HABILITADA
    return HttpResponse.json({ rows: [{ resultado: area }] })
  }),
  http.put("/api/eval-col/areas-oficiales/:id/eliminar", async ({ params }) => {
    await delay(150)
    const lista = areasOficiales()
    const i = lista.findIndex((a) => a.pkAreaOficial === Number(params.id))
    if (i < 0) return noExiste()
    if (lista[i].enUso)
      return HttpResponse.json(
        { message: "El área oficial está en uso: inactívela en lugar de eliminarla." },
        { status: 409 },
      )
    lista.splice(i, 1)
    return HttpResponse.json({ rows: [{ resultado: true }] })
  }),
  http.put("/api/eval-col/areas-oficiales/:id", async ({ request, params }) => {
    await delay(200)
    const area = areasOficiales().find((a) => a.pkAreaOficial === Number(params.id))
    if (!area) return noExiste()
    const body = (await request.json()) as { NOMBRE: string; NIVELES: number[] }
    if (nombreRepetido(body.NOMBRE, area.pkAreaOficial)) return repetido()
    area.nombre = body.NOMBRE
    area.niveles = nivelesDe(body.NIVELES)
    return HttpResponse.json({ rows: [{ resultado: area }] })
  }),
]
