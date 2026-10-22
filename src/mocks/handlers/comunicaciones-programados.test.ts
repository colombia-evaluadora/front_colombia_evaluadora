import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { Borrador, BorradorActividad } from "@/features/comunicaciones/chat/api/types"
import { instanteABogota } from "@/features/comunicaciones/chat/lib/programacion"
import {
  comunicacionesArchivosHandlers,
  comunicacionesHandlers,
  enviarProgramadosVencidos,
} from "@/mocks/handlers/comunicaciones"
import {
  comunicacionesBorradoresActividadHandlers,
  consumirBorradorActividad,
} from "@/mocks/handlers/comunicaciones-borradores-actividad"
import { borradores, mensajes } from "@/mocks/db/comunicaciones"

const server = setupServer(
  ...comunicacionesHandlers,
  ...comunicacionesArchivosHandlers,
  ...comunicacionesBorradoresActividadHandlers,
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const base = "http://localhost/api/eval-col/comunicaciones"

async function llamar<T>(metodo: string, ruta: string, body?: unknown) {
  const res = await fetch(`${base}/${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as { rows?: T[]; message?: string }
  return { status: res.status, fila: json.rows?.[0], filas: json.rows ?? [], message: json.message }
}

describe("mensajes programados (mock de comms-service)", () => {
  it("programa en hora de Bogotá, valida la hora y envía una sola vez", async () => {
    const pasado = await llamar<Borrador>("POST", "conversaciones/3/programados", {
      TEXTO: "Hola",
      PROGRAMADO_PARA: instanteABogota(Date.now() - 60_000),
    })
    expect(pasado.status).toBe(400)

    const cuando = instanteABogota(Date.now() + 5 * 60_000)
    const r = await llamar<Borrador>("POST", "conversaciones/3/programados", {
      TEXTO: "Recordatorio programado",
      PROGRAMADO_PARA: cuando,
    })
    expect(r.status).toBe(200)
    expect(r.fila).toMatchObject({ estado: "PROGRAMADO", texto: "Recordatorio programado" })
    expect(instanteABogota(r.fila!.programadoPara!)).toBe(cuando)

    const antes = mensajes.filter((m) => m.texto === "Recordatorio programado").length
    expect(enviarProgramadosVencidos(Date.now())).toBe(0)
    // Llega la hora: se envía; una segunda pasada no lo repite.
    const despues = Date.parse(r.fila!.programadoPara!) + 1
    expect(enviarProgramadosVencidos(despues)).toBeGreaterThanOrEqual(1)
    expect(enviarProgramadosVencidos(despues)).toBe(0)
    expect(mensajes.filter((m) => m.texto === "Recordatorio programado").length).toBe(antes + 1)
    expect(borradores.find((b) => b.id === r.fila!.id)?.estado).toBe("ENVIADO")

    const otraVez = await llamar<Borrador>("PATCH", `borradores/${r.fila!.id}/enviar`)
    expect(otraVez.status).toBe(409)
  })

  it("reprograma, cancela (vuelve a Borradores) y envía ahora", async () => {
    const r = await llamar<Borrador>("POST", "conversaciones/4/programados", {
      TEXTO: "Para cancelar",
      PROGRAMADO_PARA: new Date(Date.now() + 10 * 60_000).toISOString(),
    })
    const id = r.fila!.id
    const editado = await llamar<Borrador>("PATCH", `borradores/${id}/programar`, {
      TEXTO: "Texto corregido",
      PROGRAMADO_PARA: instanteABogota(Date.now() + 20 * 60_000),
    })
    expect(editado.fila).toMatchObject({ estado: "PROGRAMADO", texto: "Texto corregido" })
    const cancelado = await llamar<Borrador>("PATCH", `borradores/${id}/cancelar`)
    expect(cancelado.fila).toMatchObject({ estado: "BORRADOR", programadoPara: null })
    const ahora = await llamar<Borrador>("PATCH", `borradores/${id}/enviar`)
    expect(ahora.fila?.estado).toBe("ENVIADO")
  })
})

describe("borradores de actividades (mock de comms-service)", () => {
  it("crea, autoguarda, lista sin datos y se elimina al publicar desde él", async () => {
    const creado = await llamar<BorradorActividad>("POST", "borradores-actividad", {
      TIPO: "ENCUESTA",
      TITULO: "Encuesta borrador",
      DATOS: { nombre: "Encuesta borrador" },
    })
    expect(creado.fila).toMatchObject({
      tipo: "ENCUESTA",
      titulo: "Encuesta borrador",
      datos: null,
    })
    const id = creado.fila!.id
    await llamar("PUT", `borradores-actividad/${id}`, {
      TITULO: "Encuesta final",
      DATOS: { nombre: "Encuesta final" },
    })
    const detalle = await llamar<BorradorActividad>("GET", `borradores-actividad/${id}`)
    expect(detalle.fila?.datos).toEqual({ nombre: "Encuesta final" })
    const lista = await llamar<BorradorActividad>("GET", "borradores-actividad")
    expect(lista.filas.find((b) => b.id === id)).toMatchObject({
      titulo: "Encuesta final",
      datos: null,
    })

    const malo = await llamar("POST", "borradores-actividad", { TIPO: "OTRO", DATOS: {} })
    expect(malo.status).toBe(400)

    // Publicar con `?borrador=<id>` (los handlers de creación llaman a esto tras crear el canal).
    consumirBorradorActividad(new Request(`${base}/encuestas?borrador=${id}`, { method: "POST" }))
    const despues = await llamar<BorradorActividad>("GET", `borradores-actividad/${id}`)
    expect(despues.status).toBe(404)
  })
})

describe("resultados disponibles (mock de comms-service)", () => {
  it("avisa una sola vez por actividad con el tipo de su catálogo", async () => {
    const { notificarResultados } = await import("@/mocks/db/comunicaciones-notificaciones-puente")
    const { notificacionesDb, preferenciasTiposDb } = await import("@/mocks/db/notificaciones")
    expect(notificarResultados(9001, "ELECCION", "Personero")).toBe(true)
    expect(notificarResultados(9001, "ELECCION", "Personero")).toBe(false)
    expect(notificarResultados(9002, "ENCUESTA", "Satisfacción")).toBe(true)
    const avisos = notificacionesDb.filter(
      (n) => n.deep_link?.endsWith("canal=9001") || n.deep_link?.endsWith("canal=9002"),
    )
    expect(avisos.map((n) => n.tipo).sort()).toEqual([
      "CHAT_RESULTADOS_ELECCION",
      "CHAT_RESULTADOS_ENCUESTA",
    ])
    expect(preferenciasTiposDb.map((t) => t.tipo)).toEqual(
      expect.arrayContaining(["CHAT_RESULTADOS_ELECCION", "CHAT_RESULTADOS_ENCUESTA"]),
    )
  })
})
