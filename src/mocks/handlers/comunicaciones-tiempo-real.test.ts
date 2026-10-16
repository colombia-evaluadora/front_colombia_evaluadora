import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { comunicacionesHandlers, comunicacionesMensajesHandlers } from "@/mocks/handlers/comunicaciones"
import {
  bandejaSalidaNotificacionesChat,
  notificacionesDeMensaje,
  registrarSinkNotificacionesChat,
} from "@/mocks/db/comunicaciones-notificaciones"

const server = setupServer(...comunicacionesHandlers, ...comunicacionesMensajesHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const base = "http://localhost/api/eval-col/comunicaciones"

async function enviar(conversacionId: number, body: Record<string, unknown>) {
  const res = await fetch(`${base}/conversaciones/${conversacionId}/mensajes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: res.status, mensaje: ((await res.json()) as { rows: Mensaje[] }).rows?.[0] }
}

describe("notificacionesDeMensaje", () => {
  const autor = { id: 1, nombre: "Andrés Gómez", enLinea: true }
  const base: Mensaje = {
    id: 1,
    conversacionId: 2,
    autor,
    esPropio: true,
    texto: "",
    fecha: "2026-01-01T00:00:00Z",
    adjunto: null,
    editado: false,
    fijado: false,
  }
  const miembros = [
    { id: 1, enLinea: true },
    { id: 2, enLinea: true },
    { id: 3, enLinea: false },
  ]

  it("mención > respuesta y nunca al autor", () => {
    const n = notificacionesDeMensaje(
      { ...base, menciones: [{ tipo: "USUARIO", usuarioId: 2, nombre: "D" }] },
      { conversacion: { id: 2, nombre: "x", tipo: "CANAL" }, miembros, autorRespuestaId: 2 },
    )
    expect(n.map((x) => [x.destinatarioId, x.tipo])).toEqual([[2, "MENCION"]])
  })

  it("@canal solo a conectados y DM al otro participante", () => {
    const canal = notificacionesDeMensaje(
      { ...base, menciones: [{ tipo: "CANAL", usuarioId: null, nombre: "canal" }] },
      { conversacion: { id: 2, nombre: "x", tipo: "CANAL" }, miembros },
    )
    expect(canal.map((x) => x.destinatarioId)).toEqual([2])
    const dm = notificacionesDeMensaje(base, {
      conversacion: { id: 9, nombre: "D", tipo: "DIRECTO" },
      miembros: miembros.slice(0, 2),
    })
    expect(dm).toMatchObject([{ destinatarioId: 2, tipo: "DIRECTO", url: "/app/comunicaciones/chat?canal=9&mensaje=1" }])
  })
})

describe("handler de mensajes", () => {
  it("valida menciones, guarda la respuesta citada y emite al sink", async () => {
    const recibidas: number[] = []
    const quitar = registrarSinkNotificacionesChat((n) => recibidas.push(n.destinatarioId))
    const antes = bandejaSalidaNotificacionesChat.length

    const original = await enviar(2, { TEXTO: "Primero" })
    // Sin token el mock asume docente: `@todos` está permitido por la política sugerida.
    const { status, mensaje } = await enviar(2, {
      TEXTO: "Hola <@2> y @todos",
      FK_MENSAJE_RESPUESTA: original.mensaje.id,
    })
    quitar()

    expect(status).toBe(200)
    expect(mensaje.respuestaA).toMatchObject({ id: original.mensaje.id, eliminado: false })
    expect(mensaje.menciones?.map((m) => m.tipo)).toEqual(["USUARIO", "TODOS"])
    expect(bandejaSalidaNotificacionesChat.length).toBeGreaterThan(antes)
    expect(recibidas).toContain(2)
    expect(recibidas).not.toContain(1)
  })

  it("rechaza responder a un mensaje inexistente", async () => {
    const { status } = await enviar(2, { TEXTO: "x", FK_MENSAJE_RESPUESTA: 999_999 })
    expect(status).toBe(404)
  })
})
