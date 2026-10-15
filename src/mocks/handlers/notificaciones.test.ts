import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { NotificacionesPageRow } from "@/features/notificaciones/api/types"
import { notificacionesHandlers } from "@/mocks/handlers/notificaciones"

const server = setupServer(...notificacionesHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE = "http://localhost/api/notificaciones"

async function getPage(query = ""): Promise<NotificacionesPageRow> {
  const res = await fetch(`${BASE}${query}`)
  expect(res.status).toBe(200)
  return res.json()
}

describe("mock de notificaciones", () => {
  it("pagina por cursor sin repetir ni saltar filas", async () => {
    const ids: string[] = []
    let cursor: string | null = null
    do {
      const page: NotificacionesPageRow = await getPage(
        `?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      )
      ids.push(...page.items.map((n) => n.id))
      cursor = page.next_cursor
    } while (cursor)
    expect(ids.length).toBeGreaterThan(20)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("marca leída, baja el contador y filtra por estado", async () => {
    const [primera] = (await getPage("?estado=no-leidas&limit=1")).items
    const antes = (await (await fetch(`${BASE}/contador`)).json()).no_leidas
    const res = await fetch(`${BASE}/${primera.id}/leida`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leida: true }),
    })
    expect(res.status).toBe(204)
    const despues = (await (await fetch(`${BASE}/contador`)).json()).no_leidas
    expect(despues).toBe(antes - 1)

    await fetch(`${BASE}/leer-todas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    expect((await (await fetch(`${BASE}/contador`)).json()).no_leidas).toBe(0)
    expect((await getPage("?estado=no-leidas")).items).toHaveLength(0)
  })

  it("rechaza cambiar un canal bloqueado por la institución", async () => {
    const prefs = await (await fetch(`${BASE}/preferencias`)).json()
    const bloqueado = prefs.tipos.find((t: { push_bloqueado: boolean }) => t.push_bloqueado)
    const res = await fetch(`${BASE}/preferencias`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipos: [{ tipo: bloqueado.tipo, push: !bloqueado.push, email: bloqueado.email }] }),
    })
    expect(res.status).toBe(409)
  })
})
