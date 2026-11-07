import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { administradoresTerritorialesHandlers } from "@/mocks/handlers/administradores-territoriales"

// Contrato del mock = el de V333–V353: `{ rows: [{ resultado }] }` y los mismos errores.
const server = setupServer(...administradoresTerritorialesHandlers)
beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen({ onUnhandledRequest: "error" })
})
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const BASE = "http://localhost/api/eval-col"
const leer = async (r: Response) => ((await r.json()) as { rows: [{ resultado: any }] }).rows[0].resultado
const enviar = (method: string, ruta: string, body: unknown) =>
  fetch(`${BASE}${ruta}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

const cuerpo = {
  TIPO_DOCUMENTO: 51860,
  NUMERO_DOCUMENTO: "1029384756",
  PRIMER_NOMBRE: "Paula",
  SEGUNDO_NOMBRE: null,
  PRIMER_APELLIDO: "León",
  SEGUNDO_APELLIDO: null,
  CORREO: "paula.leon@sem.gov.co",
  DEPENDENCIA: "Cobertura",
  ACTIVO: true,
}

describe("mock de Administradores territoriales", () => {
  it("lista los tres de la base, por nombre", async () => {
    const lista = await leer(await fetch(`${BASE}/administradores-territoriales`))
    expect(lista.map((a: any) => a.nombre)).toEqual([...lista.map((a: any) => a.nombre)].sort((a, b) => a.localeCompare(b, "es")))
    expect(lista.length).toBeGreaterThanOrEqual(3)
  })

  it("crea, invita y rechaza el documento repetido", async () => {
    const r = await leer(await enviar("POST", "/administradores-territoriales", cuerpo))
    expect(r.invitar).toBe(true)
    expect(r.administrador.pendienteActivacion).toBe(true)
    const otra = await enviar("POST", "/administradores-territoriales", { ...cuerpo, CORREO: "otra@sem.gov.co" })
    expect(otra.status).toBe(409)
    expect(((await otra.json()) as { message: string }).message).toContain("otro Administrador territorial")
  })

  it("400 con dependencia corta", async () => {
    const r = await enviar("POST", "/administradores-territoriales", {
      ...cuerpo,
      NUMERO_DOCUMENTO: "5647382910",
      CORREO: "corta@sem.gov.co",
      DEPENDENCIA: "AB",
    })
    expect(r.status).toBe(400)
  })

  it("modificar con otro correo devuelve correoAnterior", async () => {
    const r = await leer(
      await enviar("PUT", "/administradores-territoriales/601", {
        ...cuerpo,
        NUMERO_DOCUMENTO: "52345678",
        CORREO: "andrea.nueva@sem.gov.co",
      }),
    )
    expect(r.correoAnterior).toBe("andrea.castro@sem.gov.co")
  })

  it("inactiva y responde 404 si no existe", async () => {
    const r = await leer(await enviar("PUT", "/administradores-territoriales/602/estado", { ACTIVO: false }))
    expect(r.activo).toBe(false)
    expect((await fetch(`${BASE}/administradores-territoriales/999`)).status).toBe(404)
  })
})
