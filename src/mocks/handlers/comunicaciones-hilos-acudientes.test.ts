import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { comunicacionesHilosAcudientesHandlers } from "@/mocks/handlers/comunicaciones-hilos-acudientes"

// Mismo contrato que comms-service: crear, encabezado, ocultar mensaje ajeno y silenciar con motivo.
const server = setupServer(...comunicacionesHilosAcudientesHandlers)
const BASE = "http://localhost/api/eval-col/comunicaciones/hilos-acudientes"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())

async function pedir(metodo: string, ruta: string, cuerpo?: unknown) {
  const r = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  return { status: r.status, body: (await r.json()) as { rows: Record<string, unknown>[]; message?: string } }
}

describe("hilo con acudientes (MSW)", () => {
  let id = 0

  it("lista las opciones del docente y crea el hilo", async () => {
    const op = await pedir("GET", "/opciones")
    expect(op.body.rows.map((o) => o.tipo)).toEqual(["GRUPO", "EJECUCION"])
    expect((await pedir("POST", "", { FK_TGRUPO: 999, ASUNTO: "a", TEXTO: "b" })).status).toBe(403)
    expect((await pedir("POST", "", { FK_TGRUPO: 601, ASUNTO: " ", TEXTO: "b" })).status).toBe(400)
    const creado = await pedir("POST", "", { FK_TGRUPO: 601, FK_TDOCENTE_ASIGNATURA: null, ASUNTO: "Salida", TEXTO: "Hola" })
    expect(creado.status).toBe(200)
    id = creado.body.rows[0].id as number
    const h = (await pedir("GET", `/${id}`)).body.rows[0]
    expect(h).toMatchObject({ asunto: "Salida", acudientes: 3, esModerador: true, soloLectura: false })
    expect((await pedir("GET", "")).body.rows.some((r) => r.conversacionId === id)).toBe(true)
  })

  it("silencia con motivo obligatorio y quita el silencio", async () => {
    expect((await pedir("POST", `/${id}/silencios`, { FK_USUARIO: 501, MOTIVO: " " })).status).toBe(400)
    const s = await pedir("POST", `/${id}/silencios`, { FK_USUARIO: 501, MOTIVO: "Ofensivo" })
    expect((s.body.rows[0].silenciados as unknown[]).length).toBe(1)
    expect((await pedir("POST", `/${id}/silencios`, { FK_USUARIO: 501, MOTIVO: "x" })).status).toBe(409)
    const q = await pedir("PATCH", `/${id}/silencios/501/quitar`)
    expect(q.body.rows[0].silenciados).toEqual([])
  })

  it("oculta un mensaje ajeno pero no uno propio", async () => {
    const { mensajes } = await import("@/mocks/db/comunicaciones")
    const ajeno = mensajes.find((m) => m.conversacionId === id && !m.esPropio)!
    const propio = mensajes.find((m) => m.conversacionId === id && m.esPropio)!
    expect((await pedir("PATCH", `/${id}/mensajes/${propio.id}/ocultar`)).status).toBe(400)
    const r = await pedir("PATCH", `/${id}/mensajes/${ajeno.id}/ocultar`)
    expect(r.body.rows[0]).toMatchObject({ ocultoPorModerador: true, texto: "" })
  })
})
