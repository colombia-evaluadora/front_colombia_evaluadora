import { http, HttpResponse, delay } from "msw"

import { nextId } from "@/mocks/db/next-id"
import { nivelesDb, relacionesDb, zonasDb } from "@/mocks/db/relaciones-alumno-grupo"

// Misma forma y errores que `fn_relalumnogrupo_*`: 404 nivel/zona/relación,
// 400 máximo fuera de 1-99 y 409 nivel y zona repetidos.
const resultado = (data: unknown) => HttpResponse.json({ rows: [{ resultado: data }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })

interface Body {
  NIVEL?: number
  ZONA?: number
  MAXIMO?: number
}

function guardar(pk: number | null, b: Body) {
  const nivel = nivelesDb.find((n) => n.pkNivel === Number(b.NIVEL))
  const zona = zonasDb.find((z) => z.pkZona === Number(b.ZONA))
  if (!nivel || !zona) return error(404, "No existe el nivel educativo o la zona")
  const maximo = Number(b.MAXIMO)
  if (!(maximo >= 1 && maximo <= 99)) return error(400, "El máximo debe ser de 1 a 99.")
  if (relacionesDb.some((r) => r.pkRelacion !== pk && r.pkNivel === nivel.pkNivel && r.pkZona === zona.pkZona)) {
    return error(409, "Ya existe un máximo para ese nivel y zona.")
  }
  const fila = { ...nivel, ...zona, maximo, pkRelacion: pk ?? nextId(relacionesDb.map((r) => r.pkRelacion), 1) }
  const i = relacionesDb.findIndex((r) => r.pkRelacion === pk)
  if (i >= 0) relacionesDb[i] = fila
  else relacionesDb.push(fila)
  relacionesDb.sort((a, b) => a.pkNivel - b.pkNivel || a.pkZona - b.pkZona)
  return resultado({ pkRelacion: fila.pkRelacion, pkNivel: fila.pkNivel, pkZona: fila.pkZona, maximo })
}

export const relacionesAlumnoGrupoHandlers = [
  http.get("/api/eval-col/relaciones-alumno-grupo", async () => {
    await delay(200)
    return resultado({ relaciones: relacionesDb, niveles: nivelesDb, zonas: zonasDb })
  }),

  http.post("/api/eval-col/relaciones-alumno-grupo", async ({ request }) => {
    await delay(200)
    return guardar(null, (await request.json()) as Body)
  }),

  http.put("/api/eval-col/relaciones-alumno-grupo/:id", async ({ params, request }) => {
    await delay(200)
    const pk = Number(params.id)
    if (!relacionesDb.some((r) => r.pkRelacion === pk)) return error(404, "No existe la relación alumno-grupo")
    return guardar(pk, (await request.json()) as Body)
  }),

  http.put("/api/eval-col/relaciones-alumno-grupo/:id/eliminar", async ({ params }) => {
    await delay(200)
    const i = relacionesDb.findIndex((r) => r.pkRelacion === Number(params.id))
    if (i < 0) return error(404, "No existe la relación alumno-grupo")
    const [fila] = relacionesDb.splice(i, 1)
    return resultado({ pkRelacion: fila.pkRelacion })
  }),
]
