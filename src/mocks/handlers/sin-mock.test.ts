import { setupServer } from "msw/node"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { sinMockHandlers } from "@/mocks/handlers/sin-mock"

const server = setupServer(...sinMockHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

const BASE = "http://localhost/api/eval-col/modulo-sin-mock"

describe("red de seguridad de los mocks (sin-mock)", () => {
  it("una lectura sin mock responde vacía y no sale al backend", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const get = await fetch(`${BASE}/opciones/responsables`)
    expect(get.status).toBe(200)
    expect(await get.json()).toEqual({ rows: [] })
    const query = await fetch(`${BASE}/query`, { method: "POST", body: "{}" })
    expect(query.status).toBe(200)
    expect(await query.json()).toEqual({ rows: [] })
  })

  it("una escritura sin mock se rechaza con 501 y un mensaje claro", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const r = await fetch(`${BASE}/guardar`, { method: "POST", body: "{}" })
    expect(r.status).toBe(501)
    expect((await r.json()).message).toBe("Esta acción no tiene datos de prueba todavía.")
  })

  it("avisa en la consola qué mock falta", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await fetch(`${BASE}/catalogos`)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("GET /api/eval-col/modulo-sin-mock/catalogos"))
  })
})
