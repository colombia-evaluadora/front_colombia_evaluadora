import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { setupServer } from "msw/node"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import type { Foro, Publicacion } from "@/features/comunicaciones/foros/api/types"
import { comunicacionesHandlers, comunicacionesMensajesHandlers } from "@/mocks/handlers/comunicaciones"
import { forosHandlers } from "@/mocks/handlers/comunicaciones-foros"

// Contrato del mock = contrato de comms-service (`ForoController`): rutas, sobre
// `{rows}`, flags "S"|"N" y códigos de error.
const server = setupServer(...forosHandlers, ...comunicacionesMensajesHandlers, ...comunicacionesHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const base = "http://localhost/api/eval-col/comunicaciones"

async function llamar<T>(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as { rows?: T[]; message?: string }
  return { status: res.status, rows: json.rows ?? [], message: json.message }
}

describe("foros (mock)", () => {
  it("lista, filtra por etiqueta, busca sin tildes y ordena con las fijadas primero", async () => {
    const foro = (await llamar<Foro>("GET", "/foros/900")).rows[0]
    expect(foro.puedeModerar).toBe(true)
    const duda = foro.etiquetas.find((e) => e.nombre === "Duda")
    const todas = (await llamar<Publicacion>("GET", "/foros/900/publicaciones?orden=NUEVAS")).rows
    expect(todas[0].fijada).toBe(true)
    expect(todas[0].totalCount).toBe(todas.length)
    const filtradas = (await llamar<Publicacion>("GET", `/foros/900/publicaciones?etiqueta=${duda?.id}`)).rows
    expect(filtradas.every((p) => p.etiquetas.some((e) => e.id === duda?.id))).toBe(true)
    const busqueda = (await llamar<Publicacion>("GET", "/foros/900/publicaciones?q=fotosintesis")).rows
    expect(busqueda.map((p) => p.titulo)).toEqual(["¿Qué entra y qué sale en la fotosíntesis?"])
    expect((await llamar("GET", "/foros/900/publicaciones?orden=x")).status).toBe(400)
  })

  it("publica, responde en hilo, resuelve, cierra y elimina", async () => {
    const p = (
      await llamar<Publicacion>("POST", "/foros/900/publicaciones", {
        TITULO: "Pregunta de prueba",
        TEXTO: "¿Cómo se hace?",
        ETIQUETAS: [],
        CLIENT_MESSAGE_ID: "c-1",
      })
    ).rows[0]
    expect(p).toMatchObject({ titulo: "Pregunta de prueba", siguiendo: true, esPropia: true })
    expect(p.mensaje?.texto).toBe("¿Cómo se hace?")
    // Reintento idempotente.
    const reintento = await llamar<Publicacion>("POST", "/foros/900/publicaciones", {
      TITULO: "Pregunta de prueba",
      TEXTO: "¿Cómo se hace?",
      CLIENT_MESSAGE_ID: "c-1",
    })
    expect(reintento.rows[0].id).toBe(p.id)

    const r1 = (await llamar<Mensaje>("POST", `/foros/publicaciones/${p.id}/respuestas`, { TEXTO: "Así" })).rows[0]
    const r2 = (
      await llamar<Mensaje>("POST", `/foros/publicaciones/${p.id}/respuestas`, {
        TEXTO: "¿Seguro?",
        FK_MENSAJE_RESPUESTA: r1.id,
      })
    ).rows[0]
    expect(r2.respuestaA?.id).toBe(r1.id)
    expect((await llamar<Mensaje>("GET", `/foros/publicaciones/${p.id}/respuestas`)).rows).toHaveLength(2)

    // Reacciones con el endpoint del chat sobre el cuerpo.
    const reaccion = await llamar<Mensaje>("POST", `/mensajes/${p.mensaje?.id}/reacciones`, { EMOJI: "👍" })
    expect(reaccion.rows[0].reacciones?.[0]).toMatchObject({ emoji: "👍", total: 1 })
    // El chat no acepta mensajes sueltos en un foro.
    expect((await llamar("POST", "/conversaciones/900/mensajes", { TEXTO: "x" })).status).toBe(400)

    const resuelta = (
      await llamar<Publicacion>("PATCH", `/foros/publicaciones/${p.id}/resolver`, {
        RESUELTA: "S",
        FK_MENSAJE_SOLUCION: r1.id,
      })
    ).rows[0]
    expect(resuelta).toMatchObject({ resuelta: true, solucionId: r1.id, respuestas: 2, reacciones: 1 })
    expect(
      (await llamar("PATCH", `/foros/publicaciones/${p.id}/resolver`, { RESUELTA: "S", FK_MENSAJE_SOLUCION: 1 })).status,
    ).toBe(400)

    const cerrada = (await llamar<Publicacion>("PATCH", `/foros/publicaciones/${p.id}/cerrar`, { CERRADA: "S" })).rows[0]
    expect(cerrada.cerrada).toBe(true)
    const noSigue = (await llamar<Publicacion>("PATCH", `/foros/publicaciones/${p.id}/seguir`, { SEGUIR: "N" })).rows[0]
    expect(noSigue.siguiendo).toBe(false)

    await llamar("PATCH", `/foros/respuestas/${r1.id}/eliminar`)
    const tras = (await llamar<Publicacion>("GET", `/foros/publicaciones/${p.id}`)).rows[0]
    expect(tras).toMatchObject({ respuestas: 1, solucionId: null })

    await llamar("PATCH", `/foros/publicaciones/${p.id}/eliminar`)
    expect((await llamar("GET", `/foros/publicaciones/${p.id}`)).status).toBe(404)
  })

  it("etiquetas: crea, rechaza duplicadas y valida las de otro foro", async () => {
    const e = (await llamar<{ id: number }>("POST", "/foros/900/etiquetas", { NOMBRE: "Examen", COLOR: "ORANGE" })).rows[0]
    expect((await llamar("POST", "/foros/900/etiquetas", { NOMBRE: "examen" })).status).toBe(409)
    const otro = await llamar("POST", "/foros/901/publicaciones", { TITULO: "x", TEXTO: "y", ETIQUETAS: [e.id] })
    expect(otro.status).toBe(400)
    await llamar("PATCH", `/foros/etiquetas/${e.id}/eliminar`)
    const foro = (await llamar<Foro>("GET", "/foros/900")).rows[0]
    expect(foro.etiquetas.some((x) => x.id === e.id)).toBe(false)
  })

  it("adjuntos reales: publica y responde por multipart (file-service) y el archivo se quita", async () => {
    const multipart = async <T,>(path: string, campos: Record<string, string>, archivo: File) => {
      const form = new FormData()
      for (const [k, v] of Object.entries(campos)) form.append(k, v)
      form.append("ADJUNTO", archivo)
      const res = await fetch(`http://localhost/api/files/eval-col/comunicaciones${path}`, { method: "POST", body: form })
      return ((await res.json()) as { rows: T[] }).rows[0]
    }
    const pdf = new File(["%PDF"], "guia.pdf", { type: "application/pdf" })
    const p = await multipart<Publicacion>("/foros/900/publicaciones", { TITULO: "Con guía", TEXTO: "" }, pdf)
    expect(p.mensaje?.adjunto).toMatchObject({ nombre: "guia.pdf", formato: "PDF", peso: 4 })
    expect(p.mensaje?.adjunto?.archivoId).toEqual(expect.any(Number))

    const foto = new File(["x"], "foto.png", { type: "image/png" })
    const r = await multipart<Mensaje>(`/foros/publicaciones/${p.id}/respuestas`, { TEXTO: "Mira" }, foto)
    expect(r.adjunto).toMatchObject({ nombre: "foto.png", formato: "IMAGEN" })

    const quitada = (await llamar<Mensaje>("PATCH", `/foros/mensajes/${r.id}/adjunto/eliminar`)).rows[0]
    expect(quitada.adjunto?.eliminadoEn).not.toBeNull()
    await llamar("PATCH", `/foros/publicaciones/${p.id}/eliminar`)
  })
})
