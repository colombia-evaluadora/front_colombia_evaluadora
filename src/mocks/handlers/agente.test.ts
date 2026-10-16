import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { RespuestaAgente } from "@/features/assistant/api/types"
import { leerSse } from "@/features/assistant/lib/sse"
import { agenteHandlers } from "@/mocks/handlers/agente"

const server = setupServer(...agenteHandlers)
beforeAll(() => server.listen())
afterAll(() => server.close())

const BASE = "http://localhost/api/ai/agente"

async function crear(): Promise<string> {
  const res = await fetch(`${BASE}/conversaciones`, { method: "POST" })
  expect(res.status).toBe(201)
  return ((await res.json()) as { conversationId: string }).conversationId
}

async function turno(id: string, texto: string) {
  const res = await fetch(`${BASE}/conversaciones/${id}/mensajes/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, contextoUi: { ruta: "/app/planeador/actividades" } }),
  })
  const eventos = []
  for await (const e of leerSse(res.body!)) eventos.push(e)
  return eventos
}

describe("mock del agente", () => {
  it("streaming: estados y una respuesta final", async () => {
    const id = await crear()
    const eventos = await turno(id, "¿Cuántas actividades tengo?")
    expect(eventos.slice(0, -1).every((e) => e.evento === "estado" || e.evento === "herramienta")).toBe(true)
    const herramientas = eventos.filter((e) => e.evento === "herramienta").map((e) => JSON.parse(e.datos))
    expect(herramientas.map((h) => h.fase)).toEqual(["INICIO", "FIN"])
    expect(herramientas[1]).toMatchObject({ id: "h1", etiqueta: "Consultando actividades", ok: true })
    const final = eventos.at(-1)!
    expect(final.evento).toBe("respuesta")
    expect((JSON.parse(final.datos) as RespuestaAgente).tipo).toBe("DATOS")
  }, 10_000)

  it("confirmación: se confirma una vez y la segunda da 409", async () => {
    const id = await crear()
    const eventos = await turno(id, "Crea una actividad para mañana")
    const respuesta = JSON.parse(eventos.at(-1)!.datos) as RespuestaAgente
    expect(respuesta.tipo).toBe("CONFIRMACION")
    const accionId = respuesta.accionPendiente!.id
    const ok = await fetch(`${BASE}/acciones/${accionId}/confirmar`, { method: "POST" })
    expect(ok.status).toBe(200)
    const otra = await fetch(`${BASE}/acciones/${accionId}/cancelar`, { method: "POST" })
    expect(otra.status).toBe(409)
    // El historial trae la respuesta estructurada con el estado ACTUAL de la acción.
    const detalle = await (await fetch(`${BASE}/conversaciones/${id}`)).json()
    const confirmacion = detalle.mensajes.find((m: { tipoRespuesta?: string }) => m.tipoRespuesta === "CONFIRMACION")
    expect(confirmacion.respuesta.accionPendiente).toMatchObject({ id: accionId, estado: "EJECUTADA" })
  }, 10_000)

  it("cancelar un turno en curso responde 'Cancelaste la petición.'", async () => {
    const id = await crear()
    const pendiente = turno(id, "hola")
    await new Promise((r) => setTimeout(r, 300))
    const cancelado = await (await fetch(`${BASE}/conversaciones/${id}/cancelar`, { method: "POST" })).json()
    expect(cancelado).toEqual({ cancelado: true })
    const eventos = await pendiente
    expect(JSON.parse(eventos.at(-1)!.datos)).toEqual({ tipo: "RESPUESTA", texto: "Cancelaste la petición." })
    const otra = await (await fetch(`${BASE}/conversaciones/${id}/cancelar`, { method: "POST" })).json()
    expect(otra).toEqual({ cancelado: false })
  }, 10_000)

  it("sugerencias por ruta, máximo 6", async () => {
    const res = await (await fetch(`${BASE}/sugerencias?ruta=/app/planeador/actividades`)).json()
    expect(res.pantalla.codigo).toBe("planeador")
    expect(res.sugerencias.length).toBeLessThanOrEqual(6)
    expect(res.capacidades.modulos).toContain("Planeador")
  })

  it("historial y archivado", async () => {
    const id = await crear()
    await turno(id, "hola")
    const detalle = await (await fetch(`${BASE}/conversaciones/${id}`)).json()
    expect(detalle.mensajes.map((m: { rol: string }) => m.rol)).toEqual(["USER", "ASSISTANT"])
    expect((await fetch(`${BASE}/conversaciones/${id}/archivar`, { method: "PUT" })).status).toBe(204)
    const lista = await (await fetch(`${BASE}/conversaciones`)).json()
    expect(lista.some((c: { id: string }) => c.id === id)).toBe(false)
  }, 10_000)
})
