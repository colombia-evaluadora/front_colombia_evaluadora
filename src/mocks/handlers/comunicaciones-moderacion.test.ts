import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import { comunicacionesModeracionHandlers } from "@/mocks/handlers/comunicaciones-moderacion"
import { chatSearchSchema } from "@/features/comunicaciones/chat/api/schema"

const rol = vi.hoisted(() => ({ actual: "CEVAL-RECTOR" }))
vi.mock("@/mocks/handlers/comunicaciones-elecciones", () => ({
  usuarioDe: () => ({ roles: [rol.actual] }),
}))

const server = setupServer(...comunicacionesModeracionHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

async function llamar(metodo: string, ruta: string, body?: unknown) {
  const res = await fetch(`http://localhost/api/eval-col/comunicaciones/${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as { rows?: Record<string, unknown>[]; message?: string }
  return { status: res.status, filas: json.rows ?? [] }
}

describe("moderación de la mensajería (mock)", () => {
  it("lista datos y un reporte nuevo llega a la bandeja", async () => {
    rol.actual = "CEVAL-COORDINADOR"
    const antes = (await llamar("GET", "moderacion/reportes")).filas.length
    expect(antes).toBeGreaterThan(0)
    rol.actual = "CEVAL-DOCENTE"
    expect((await llamar("POST", "conversaciones/1/reportar", { MOTIVO: " " })).status).toBe(400)
    expect((await llamar("POST", "conversaciones/1/reportar", { MOTIVO: "Insultos" })).status).toBe(200)
    expect((await llamar("GET", "moderacion/reportes")).status).toBe(403)
    rol.actual = "CEVAL-COORDINADOR"
    expect((await llamar("GET", "moderacion/reportes")).filas).toHaveLength(antes + 1)
  })

  it("solo el rector suspende, sin duplicar, y puede levantar", async () => {
    rol.actual = "CEVAL-COORDINADOR"
    expect((await llamar("POST", "moderacion/suspensiones", { FK_USUARIO: 2, MOTIVO: "x" })).status).toBe(403)
    rol.actual = "CEVAL-RECTOR"
    expect((await llamar("POST", "moderacion/suspensiones", { FK_USUARIO: 2 })).status).toBe(400)
    expect((await llamar("POST", "moderacion/suspensiones", { FK_USUARIO: 2, MOTIVO: "x" })).status).toBe(200)
    expect((await llamar("POST", "moderacion/suspensiones", { FK_USUARIO: 2, MOTIVO: "x" })).status).toBe(409)
    const [s] = (await llamar("GET", "moderacion/suspensiones")).filas
    expect((await llamar("PATCH", `moderacion/suspensiones/${s.id}/levantar`)).status).toBe(200)
    expect((await llamar("GET", "moderacion/suspensiones")).filas).toHaveLength(0)
  })

  it("guarda el horario y rechaza uno invertido", async () => {
    rol.actual = "CEVAL-RECTOR"
    const malo = { HORA_INICIO: "18:00", HORA_FIN: "06:00", INCLUYE_SABADO: "N" }
    expect((await llamar("PUT", "moderacion/configuracion", malo)).status).toBe(400)
    await llamar("PUT", "moderacion/configuracion", { HORA_INICIO: "07:00", HORA_FIN: "17:00", INCLUYE_SABADO: "S" })
    expect((await llamar("GET", "moderacion/configuracion")).filas[0]).toMatchObject({ horaInicio: "07:00", incluyeSabado: true })
  })
})

describe("deep link ?moderacion=", () => {
  it("acepta un id y descarta lo inválido sin tirar", () => {
    expect(chatSearchSchema.parse({ moderacion: "7" }).moderacion).toBe(7)
    expect(chatSearchSchema.parse({ moderacion: "abc" }).moderacion).toBeUndefined()
  })
})
