// @vitest-environment jsdom
import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { relacionesAlumnoGrupoHandlers } from "@/mocks/handlers/relaciones-alumno-grupo"

const server = setupServer(...relacionesAlumnoGrupoHandlers)
// jsdom da la URL base contra la que MSW resuelve las rutas relativas del handler.
const URL_BASE = new URL("/api/eval-col/relaciones-alumno-grupo", location.href).href
const enviar = (metodo: string, url: string, body?: unknown) =>
  fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })

beforeAll(() => server.listen())
afterAll(() => server.close())

describe("mock de relaciones alumno-grupo", () => {
  it("lista la semilla con niveles y zonas", async () => {
    const { rows } = await (await fetch(URL_BASE)).json()
    expect(rows[0].resultado.relaciones).toHaveLength(6)
    expect(rows[0].resultado.zonas).toHaveLength(2)
  })

  it("crea, rechaza el repetido, modifica y elimina", async () => {
    const alta = await enviar("POST", URL_BASE, { NIVEL: 4, ZONA: 101, MAXIMO: 40 })
    const pk = (await alta.json()).rows[0].resultado.pkRelacion
    expect((await enviar("POST", URL_BASE, { NIVEL: 4, ZONA: 101, MAXIMO: 30 })).status).toBe(409)
    expect((await enviar("PUT", `${URL_BASE}/${pk}`, { NIVEL: 4, ZONA: 101, MAXIMO: 100 })).status).toBe(400)
    expect((await enviar("PUT", `${URL_BASE}/${pk}`, { NIVEL: 4, ZONA: 101, MAXIMO: 38 })).status).toBe(200)
    expect((await enviar("PUT", `${URL_BASE}/${pk}/eliminar`)).status).toBe(200)
    expect((await enviar("PUT", `${URL_BASE}/${pk}/eliminar`)).status).toBe(404)
  })
})
