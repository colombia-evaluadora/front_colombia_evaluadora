import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { configuracionGeHandlers } from "@/mocks/handlers/configuracion-ge"

const server = setupServer(...configuracionGeHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const URL_BASE = "http://localhost/api/eval-col/gestion-estudiantil"
const json = (method: string, path: string, body?: unknown) =>
  fetch(`${URL_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })

describe("mock de Configuración de Gestión estudiantil", () => {
  it("rechaza un código de anotación repetido", async () => {
    const r = await json("POST", "/catalogo-anotaciones", {
      FK_ESTABLECIMIENTO: 1,
      CODIGO: "n07",
      DESCRIPCION: "Otra agresión verbal",
      FK_TLV_TIPO: 8402,
      FK_TLV_SITUACION: 8412,
      HABILITADO: true,
    })
    expect(r.status).toBe(409)
    expect((await r.json()).message).toBe("El código N07 ya existe en el catálogo.")
  })

  it("no elimina un código ni una sanción en uso", async () => {
    const codigo = await json("PATCH", "/catalogo-anotaciones/3/eliminar", {})
    expect(codigo.status).toBe(400)

    const sancion = await json("PATCH", "/proceso-disciplinario/sanciones/1/eliminar", {})
    expect(sancion.status).toBe(400)
    expect((await sancion.json()).message).toBe(
      "No se puede eliminar la sanción Amonestación escrita porque ya se usó en procesos disciplinarios. Puede inactivarla.",
    )
  })

  it("elimina una clasificación sin uso y la quita del listado", async () => {
    expect((await json("PATCH", "/proceso-disciplinario/clasificaciones/3/eliminar", {})).status).toBe(200)
    const r = await json("POST", "/proceso-disciplinario/clasificaciones/query", { FILTERS: {}, PAGEINDEX: 0, PAGESIZE: 200 })
    const { rows } = await r.json()
    expect(rows.map((c: { nombre: string }) => c.nombre)).toEqual(["Leve", "Grave"])
    expect(rows[0].total_count).toBe(2)
  })

  it("exige duración en Suspensión de asistencia y nombre único en sanciones", async () => {
    const base = { FK_ESTABLECIMIENTO: 1, DESCRIPCION: null, FK_INSTANCIA: 8422, HABILITADO: true }
    const sinDuracion = await json("POST", "/proceso-disciplinario/sanciones", {
      ...base,
      NOMBRE: "Suspensión corta",
      TIENE_DURACION: false,
      FK_EFECTO: 8453,
    })
    expect(sinDuracion.status).toBe(400)
    const repetida = await json("POST", "/proceso-disciplinario/sanciones", {
      ...base,
      NOMBRE: "suspensión de clases",
      TIENE_DURACION: true,
      FK_EFECTO: 8453,
    })
    expect(repetida.status).toBe(409)
  })

  it("devuelve causas reservadas y servicio social en la columna datos", async () => {
    const causas = (await (await json("GET", "/prevencion/parametros/causas-reservadas?ESTABLECIMIENTO=1")).json()).rows[0].datos
    expect(causas.fijas).toEqual(["C03", "C04", "C06", "C10"])
    const servicio = (await (await json("GET", "/servicio-social/parametros?ESTABLECIMIENTO=1")).json()).rows[0].datos
    expect(servicio.grados.map((g: { nombre: string }) => g.nombre)).toEqual(["Décimo", "Undécimo"])
  })
})
