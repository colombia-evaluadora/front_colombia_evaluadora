import { http, HttpResponse, delay } from "msw"

import type { AdjuntoMensaje, CategoriaCanal, SilencioDuracion } from "@/features/comunicaciones/chat/api/types"
import {
  CHAT_INSTITUCION,
  archivos,
  borradores,
  conversaciones,
  mensajes,
  nuevoMensaje,
  personas,
  avisoUnion,
  contenidoDocumentos,
} from "@/mocks/db/comunicaciones"

// Mock del chat de comunicaciones; el backend aún no existe.
const URL = (path: string) => `/api/eval-col/comunicaciones/${path}`

function buscar(id: string | readonly string[] | undefined) {
  return conversaciones.find((c) => c.id === Number(id))
}

function noEncontrada() {
  return HttpResponse.json({ message: "La conversación no existe." }, { status: 404 })
}

function hastaSilencio(duracion: SilencioDuracion) {
  if (duracion === "SIEMPRE") return "9999-12-31T00:00:00.000Z"
  const d = new Date()
  if (duracion === "8H") d.setHours(d.getHours() + 8)
  else d.setDate(d.getDate() + 7)
  return d.toISOString()
}

export const comunicacionesHandlers = [
  http.get(URL("institucion"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: [CHAT_INSTITUCION] })
  }),

  http.get(URL("conversaciones"), async () => {
    await delay(250)
    return HttpResponse.json({ rows: conversaciones })
  }),

  http.get(URL("personas"), async () => {
    await delay(200)
    return HttpResponse.json({ rows: personas })
  }),

  http.post(URL("conversaciones"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as {
      NOMBRE?: string
      CATEGORIA?: CategoriaCanal
      MIEMBROS?: number[]
    }
    const nombre = body.NOMBRE?.trim()
    if (!nombre) {
      return HttpResponse.json({ message: "Escribe un nombre para el canal." }, { status: 400 })
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un canal llamado ${nombre}.` }, { status: 409 })
    }
    const canal = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre,
      tipo: "CANAL" as const,
      categoria: body.CATEGORIA ?? "GENERAL",
      noLeidos: 0,
      actividadAbierta: body.CATEGORIA !== undefined && body.CATEGORIA !== "GENERAL" && body.CATEGORIA !== "ANUNCIO",
      esBot: false,
      totalMiembros: 1,
      miembrosDestacados: ["Andrés Gómez"],
      silenciadoHasta: null,
      archivada: false,
      creadoPor: "Andrés Gómez",
      esCreador: true,
    }
    conversaciones.push(canal)
    const nuevos = personas.filter((p) => body.MIEMBROS?.includes(p.id))
    for (const p of nuevos) avisoUnion(canal.id, p, nombre)
    canal.totalMiembros += nuevos.length
    canal.miembrosDestacados.push(...nuevos.slice(0, 2).map((p) => p.nombre))
    return HttpResponse.json({ rows: [canal] })
  }),

  http.get(URL("conversaciones/:id/mensajes"), async ({ params }) => {
    await delay(300)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const rows = mensajes
      .filter((m) => m.conversacionId === conv.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    return HttpResponse.json({ rows })
  }),

  http.post(URL("conversaciones/:id/mensajes"), async ({ params, request }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as {
      TEXTO?: string
      ADJUNTO_NOMBRE?: string
      ADJUNTO_FORMATO?: AdjuntoMensaje["formato"]
    }
    const texto = body.TEXTO?.trim() ?? ""
    const adjunto = body.ADJUNTO_NOMBRE
      ? { nombre: body.ADJUNTO_NOMBRE, formato: body.ADJUNTO_FORMATO ?? "OTRO", eliminadoEn: null }
      : null
    if (!texto && !adjunto) {
      return HttpResponse.json({ message: "Escribe un mensaje o adjunta un archivo." }, { status: 400 })
    }
    return HttpResponse.json({ rows: [nuevoMensaje(conv.id, texto, adjunto)] })
  }),

  http.patch(URL("conversaciones/:id/silenciar"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { DURACION: SilencioDuracion }
    conv.silenciadoHasta = hastaSilencio(body.DURACION)
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id/no-leido"), async ({ params }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    conv.noLeidos = Math.max(conv.noLeidos, 1)
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id/leido"), async ({ params }) => {
    await delay(100)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    conv.noLeidos = 0
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id/archivar"), async ({ params }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    conv.archivada = true
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id/desarchivar"), async ({ params }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    conv.archivada = false
    return HttpResponse.json({ rows: [conv] })
  }),

  http.post(URL("conversaciones/:id/duplicar"), async ({ params }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const copia = {
      ...conv,
      id: Math.max(...conversaciones.map((c) => c.id)) + 1,
      nombre: `${conv.nombre} (copia)`,
      noLeidos: 0,
      archivada: false,
    }
    conversaciones.push(copia)
    return HttpResponse.json({ rows: [copia] })
  }),

  http.patch(URL("conversaciones/:id/eliminar"), async ({ params }) => {
    await delay(200)
    const idx = conversaciones.findIndex((c) => c.id === Number(params.id))
    if (idx === -1) return noEncontrada()
    const [conv] = conversaciones.splice(idx, 1)
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { NOMBRE?: string }
    const nombre = body.NOMBRE?.trim()
    if (!nombre) {
      return HttpResponse.json({ message: "Escribe un nombre para el canal." }, { status: 400 })
    }
    conv.nombre = nombre
    return HttpResponse.json({ rows: [conv] })
  }),

  http.patch(URL("conversaciones/:id/salir"), async ({ params }) => {
    await delay(200)
    const idx = conversaciones.findIndex((c) => c.id === Number(params.id))
    if (idx === -1) return noEncontrada()
    const [conv] = conversaciones.splice(idx, 1)
    return HttpResponse.json({ rows: [conv] })
  }),
]

export const comunicacionesArchivosHandlers = [
  http.get(URL("archivos/:id/contenido"), async ({ params }) => {
    await delay(200)
    const html = contenidoDocumentos.get(Number(params.id))
    if (html === undefined) {
      return HttpResponse.json({ message: "Este archivo no se puede editar." }, { status: 404 })
    }
    return HttpResponse.json({ rows: [{ contenidoHtml: html }] })
  }),

  http.put(URL("archivos/:id/contenido"), async ({ params, request }) => {
    await delay(300)
    const a = archivos.find((x) => x.id === Number(params.id))
    if (!a?.editable) return HttpResponse.json({ message: "Este archivo no se puede editar." }, { status: 404 })
    const body = (await request.json()) as { CONTENIDO_HTML?: string }
    contenidoDocumentos.set(a.id, body.CONTENIDO_HTML ?? "")
    a.fecha = new Date().toISOString()
    return HttpResponse.json({ rows: [a] })
  }),

  http.patch(URL("archivos/:id/eliminar"), async ({ params }) => {
    await delay(250)
    const idx = archivos.findIndex((x) => x.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: "El archivo ya no existe." }, { status: 404 })
    const [a] = archivos.splice(idx, 1)
    if (!a.esPropio) {
      archivos.splice(idx, 0, a)
      return HttpResponse.json({ message: "Solo puedes eliminar archivos que compartiste tú." }, { status: 403 })
    }
    // El mensaje donde se compartió conserva el aviso.
    for (const m of mensajes) {
      if (m.conversacionId === a.conversacionId && m.adjunto?.nombre === a.nombre) {
        m.adjunto.eliminadoEn = new Date().toISOString()
      }
    }
    return HttpResponse.json({ rows: [a] })
  }),

  http.get(URL("archivos"), async () => {
    await delay(250)
    return HttpResponse.json({ rows: archivos })
  }),

  http.get(URL("borradores"), async () => {
    await delay(250)
    return HttpResponse.json({ rows: borradores })
  }),

  http.patch(URL("borradores/:id/enviar"), async ({ params }) => {
    await delay(200)
    const b = borradores.find((x) => x.id === Number(params.id))
    if (!b) return HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })
    nuevoMensaje(b.conversacionId, b.texto)
    b.estado = "ENVIADO"
    b.fecha = new Date().toISOString()
    return HttpResponse.json({ rows: [b] })
  }),

  http.patch(URL("borradores/:id/eliminar"), async ({ params }) => {
    await delay(150)
    const idx = borradores.findIndex((x) => x.id === Number(params.id))
    if (idx === -1) return HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })
    const [b] = borradores.splice(idx, 1)
    return HttpResponse.json({ rows: [b] })
  }),
]

// Acciones sobre un mensaje propio. Rutas estáticas antes de la de edición.
export const comunicacionesMensajesHandlers = [
  http.patch(URL("mensajes/:id/fijar"), async ({ params, request }) => {
    await delay(120)
    const m = mensajes.find((x) => x.id === Number(params.id))
    if (!m) return mensajeNoEncontrado()
    const body = (await request.json()) as { FIJADO: "S" | "N" }
    m.fijado = body.FIJADO === "S"
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id/adjunto/eliminar"), async ({ params }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id))
    if (!m?.adjunto) return mensajeNoEncontrado()
    m.adjunto.eliminadoEn = new Date().toISOString()
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id/eliminar"), async ({ params }) => {
    await delay(150)
    const idx = mensajes.findIndex((x) => x.id === Number(params.id))
    if (idx === -1) return mensajeNoEncontrado()
    const [m] = mensajes.splice(idx, 1)
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id"), async ({ params, request }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id))
    if (!m) return mensajeNoEncontrado()
    const body = (await request.json()) as { TEXTO?: string }
    const texto = body.TEXTO?.trim()
    if (!texto && !m.adjunto) {
      return HttpResponse.json({ message: "El mensaje no puede quedar vacío." }, { status: 400 })
    }
    m.texto = texto ?? ""
    m.editado = true
    return HttpResponse.json({ rows: [m] })
  }),
]

function mensajeNoEncontrado() {
  return HttpResponse.json({ message: "El mensaje ya no existe." }, { status: 404 })
}
