import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { supervisoresTerritorialesHandlers } from "@/mocks/handlers/supervisores-territoriales"

// Contrato del mock = el de V328–V329.1: `{ rows: [{ resultado }] }` y los mismos errores.
const server = setupServer(...supervisoresTerritorialesHandlers)
beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen({ onUnhandledRequest: "error" })
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const BASE = "http://localhost/api/eval-col"
const json = { "Content-Type": "application/json" }
const leer = async (r: Response) => ((await r.json()) as { rows: [{ resultado: any }] }).rows[0].resultado

const cuerpo = {
  TIPO_DOCUMENTO: 51860,
  NUMERO_DOCUMENTO: "1122334455",
  PRIMER_NOMBRE: "Mario",
  SEGUNDO_NOMBRE: null,
  PRIMER_APELLIDO: "Pérez",
  SEGUNDO_APELLIDO: null,
  CORREO: "mario.perez@sem.gov.co",
  DEPENDENCIA: "Núcleo 2",
  TODOS_ESTABLECIMIENTOS: false,
  ESTABLECIMIENTOS: [1],
  ACTIVO: true,
}
const enviar = (method: string, ruta: string, body: unknown) =>
  fetch(`${BASE}${ruta}`, { method, headers: json, body: JSON.stringify(body) })

describe("mock de Supervisores territoriales", () => {
  it("lista con la columna de establecimientos: cantidad o Todos, y el inactivo a cargo", async () => {
    const lista = await leer(await fetch(`${BASE}/supervisores-territoriales`))
    const sandra = lista.find((s: any) => s.pkSupervisor === 501)
    expect(sandra.establecimientos.map((e: any) => e.activo)).toContain(false)
    expect(lista.find((s: any) => s.pkSupervisor === 502).todosEstablecimientos).toBe(true)
  })

  it("crea, invita y rechaza el documento repetido", async () => {
    const r = await leer(await enviar("POST", "/supervisores-territoriales", cuerpo))
    expect(r.invitar).toBe(true)
    expect(r.supervisor.establecimientos).toHaveLength(1)
    const otra = await enviar("POST", "/supervisores-territoriales", { ...cuerpo, CORREO: "otro@sem.gov.co" })
    expect(otra.status).toBe(409)
    expect(((await otra.json()) as { message: string }).message).toContain("otro Supervisor territorial")
  })

  it("400 sin establecimientos y Todos apagado", async () => {
    const r = await enviar("POST", "/supervisores-territoriales", {
      ...cuerpo,
      NUMERO_DOCUMENTO: "5566778899",
      CORREO: "sin.alcance@sem.gov.co",
      ESTABLECIMIENTOS: [],
    })
    expect(r.status).toBe(400)
  })

  it("modificar conserva el inactivo ya a cargo y devuelve correoAnterior al cambiar el correo", async () => {
    const r = await leer(
      await enviar("PUT", "/supervisores-territoriales/501", {
        ...cuerpo,
        NUMERO_DOCUMENTO: "1098765432",
        CORREO: "sandra.nueva@sem.gov.co",
        ESTABLECIMIENTOS: [1, 6],
      }),
    )
    expect(r.correoAnterior).toBe("sandra.vargas@sem.gov.co")
    expect(r.supervisor.establecimientos.map((e: any) => e.pk).sort()).toEqual([1, 6])
  })

  it("inactiva y responde 404 si no existe", async () => {
    expect((await leer(await enviar("PUT", "/supervisores-territoriales/502/estado", { ACTIVO: false }))).activo).toBe(
      false,
    )
    expect((await fetch(`${BASE}/supervisores-territoriales/999`)).status).toBe(404)
  })
})
