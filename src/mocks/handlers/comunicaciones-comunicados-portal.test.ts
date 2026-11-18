import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { setupServer } from "msw/node"

import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import type { PaginaComunicados } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { comunicacionesComunicadosHandlers } from "@/mocks/handlers/comunicaciones-comunicados"
import { comunicados } from "@/mocks/db/comunicaciones-comunicados"

const server = setupServer(...comunicacionesComunicadosHandlers)

beforeAll(() => {
  // Los handlers usan rutas relativas: MSW las resuelve contra location.
  vi.stubGlobal("location", new URL("http://localhost/"))
  server.listen()
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllGlobals()
})

const base = "http://localhost/api/eval-col/comunicaciones"

async function filas<T>(ruta: string) {
  const res = await fetch(`${base}/${ruta}`)
  const json = (await res.json().catch(() => ({}))) as { rows?: T[] }
  return { status: res.status, rows: json.rows ?? [] }
}

// Recibidos por estudiantes y acudientes (3.1 "Consulta"): solo lo que les llegó, sin destinatarios.
const recibido = (id: number, extra: Partial<Comunicado>): Comunicado => ({
  conversacionId: id,
  titulo: `Recibido ${id}`,
  descripcion: "",
  audiencia: ["PADRES"],
  publicarEn: "2026-01-10T13:00:00.000Z",
  publicadoPor: "Rectoría",
  esCreador: false,
  contenidoHtml: "<p>Hola</p>",
  ...extra,
})

describe("bandeja de comunicados de estudiantes y acudientes (mock de comms-service)", () => {
  beforeAll(() => {
    comunicados.push(
      recibido(9001, { visibleHasta: "2026-01-20" }),
      recibido(9002, { estado: "ANULADO" }),
    )
  })

  it("Recibidos trae los publicados con establecimiento y sin la cantidad de destinatarios", async () => {
    const { rows } = await filas<PaginaComunicados>("comunicados/gestion?pestana=RECIBIDOS&page=0&pageSize=50")
    const items = rows[0].items
    expect(items.map((c) => c.id)).toContain(8)
    expect(items.map((c) => c.id)).not.toContain(9001)
    expect(items.map((c) => c.id)).not.toContain(9002)
    for (const c of items) {
      expect(c.destinatarios).toBeNull()
      expect(c.establecimiento).toBeTruthy()
    }
  })

  it("los vencidos van a Anteriores y los anulados no se muestran", async () => {
    const { rows } = await filas<PaginaComunicados>("comunicados/gestion?pestana=ANTERIORES&page=0&pageSize=50")
    const ids = rows[0].items.map((c) => c.id)
    expect(ids).toContain(9001)
    expect(ids).not.toContain(9002)
  })

  it("el detalle del acudiente trae el estudiante por el que lo recibe y no los conteos", async () => {
    const { rows } = await filas<Comunicado>("conversaciones/8/comunicado")
    expect(rows[0].paraEstudiantes).toEqual(["Sofía Gil Rojas"])
    expect(rows[0].establecimiento).toBeTruthy()
    expect(rows[0].leidos ?? null).toBeNull()
  })

  it("el registro de recepción ya no existe: el leído sale solo de /seguimiento", async () => {
    const rutas = comunicacionesComunicadosHandlers.map((h) => String(h.info.header))
    expect(rutas.some((r) => r.includes("comunicado/recepcion"))).toBe(false)
    expect((await filas("conversaciones/8/comunicado/seguimiento")).status).toBe(403)
  })
})
