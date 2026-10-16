import { http, HttpResponse, delay } from "msw"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { extraerMenciones } from "@/features/comunicaciones/chat/lib/menciones"
import { perfilDeRoles, puedeMencionarMasivo } from "@/features/comunicaciones/chat/lib/politica-chat"
import type { ColorEtiqueta, Foro, OrdenForo } from "@/features/comunicaciones/foros/api/types"
import { USUARIO_ACTUAL, conversaciones, mensajes, politicaChat } from "@/mocks/db/comunicaciones"
import {
  aPublicacion,
  coincideBusqueda,
  crearEtiqueta,
  crearHilo,
  etiquetasPorForo,
  hiloDeMensaje,
  hiloDeRespuesta,
  hilos,
  raizDe,
  respuestasDe,
  responderHilo,
  type HiloMock,
} from "@/mocks/db/comunicaciones-foros"
import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { mensajeNeutro, participantes } from "@/mocks/realtime/chat"
import { publish } from "@/mocks/realtime/server"

/**
 * Foros de comunicaciones, mismo contrato que comms-service
 * (`foro/ForoController.java`): rutas, cuerpos UPPER_SNAKE, flags "S"|"N",
 * errores `{ message }` y eventos en `foro:<id>`.
 */
const RUTA = (path: string) => `*/api/eval-col/comunicaciones/foros/${path}`

const MAX_ETIQUETAS = 5
const enviadosPorCliente = new Map<string, number>()

const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
const fila = <T,>(x: T) => HttpResponse.json({ rows: [x] })

function perfilDe(request: Request) {
  return perfilDeRoles(usuarioDe(request)?.roles ?? [])
}

/** Mismo criterio del servidor: perfil moderador o administrador del canal (quien lo creó). */
function permisos(request: Request, foroId: number): Omit<Foro, "id" | "nombre" | "totalMiembros" | "etiquetas"> {
  const perfil = perfilDe(request)
  const foros = politicaChat.foros
  const admin = conversaciones.find((c) => c.id === foroId)?.esCreador === true && perfil !== "ESTUDIANTE" && perfil !== "ACUDIENTE"
  return {
    puedePublicar: foros?.publicar.includes(perfil) ?? false,
    puedeResponder: foros?.responder.includes(perfil) ?? false,
    puedeModerar: admin || (foros?.moderar.includes(perfil) ?? false),
  }
}

const foroDe = (id: unknown) => conversaciones.find((c) => c.id === Number(id) && c.tipo === "FORO")
const hiloVivo = (id: unknown) => hilos.find((h) => h.id === Number(id) && !h.eliminada)

function menciones(texto: string, foroId: number, request: Request) {
  const conv = foroDe(foroId)
  return extraerMenciones(texto, conv ? participantes(conv) : [], puedeMencionarMasivo(politicaChat, perfilDe(request)))
}

function publicarHilo(h: HiloMock, evento: "publicacion.creada" | "publicacion.actualizada") {
  publish(`foro:${h.foroId}`, evento, aPublicacion(h, null, true))
}

function textoValido(texto: string | undefined, adjunto: string | undefined) {
  const t = texto?.trim() ?? ""
  if (t.length > 4000) return { error: "El mensaje es demasiado largo." }
  if (!t && !adjunto) return { error: "Escribe un mensaje o adjunta un archivo." }
  return { texto: t }
}

function etiquetasValidas(foroId: number, ids: number[] | undefined, moderador: boolean) {
  const delForo = etiquetasPorForo.get(foroId) ?? []
  const out: number[] = []
  for (const id of ids ?? []) {
    const e = delForo.find((x) => x.id === id)
    if (!e) return { status: 400, error: "Una etiqueta no pertenece a este foro." }
    if (e.soloModeradores && !moderador) return { status: 403, error: "Esa etiqueta solo la pone la moderacion del foro." }
    if (!out.includes(id)) out.push(id)
  }
  if (out.length > MAX_ETIQUETAS) return { status: 400, error: `Usa como maximo ${MAX_ETIQUETAS} etiquetas.` }
  return { ids: out }
}

const ORDEN: Record<OrdenForo, (a: HiloMock, b: HiloMock) => number> = {
  ACTIVIDAD: (a, b) => b.ultimaActividad.localeCompare(a.ultimaActividad),
  NUEVAS: (a, b) => b.fecha.localeCompare(a.fecha),
  TOP: (a, b) => {
    const pa = aPublicacion(a, null, false)
    const pb = aPublicacion(b, null, false)
    return pb.respuestas + pb.reacciones - (pa.respuestas + pa.reacciones) || ORDEN.ACTIVIDAD(a, b)
  },
}

export const forosHandlers = [
  http.get(RUTA(":canal/publicaciones"), async ({ params, request }) => {
    await delay(200)
    const foro = foroDe(params.canal)
    if (!foro) return error(404, "El foro no existe.")
    const url = new URL(request.url)
    const orden = (url.searchParams.get("orden") ?? "ACTIVIDAD").toUpperCase() as OrdenForo
    if (!ORDEN[orden]) return error(400, "Orden desconocido.")
    const etiqueta = Number(url.searchParams.get("etiqueta")) || null
    const q = url.searchParams.get("q")?.trim()
    const pagina = Math.max(0, Number(url.searchParams.get("pagina")) || 0)
    const limite = Math.min(100, Math.max(1, Number(url.searchParams.get("limite")) || 30))
    const lista = hilos
      .filter((h) => h.foroId === foro.id && !h.eliminada)
      .filter((h) => !etiqueta || h.etiquetas.includes(etiqueta))
      .filter((h) => !q || coincideBusqueda(h, q))
      .sort((a, b) => Number(b.fijada) - Number(a.fijada) || ORDEN[orden](a, b) || b.id - a.id)
    const rows = lista
      .slice(pagina * limite, pagina * limite + limite)
      .map((h) => aPublicacion(h, USUARIO_ACTUAL.id, false, lista.length))
    return HttpResponse.json({ rows })
  }),

  http.post(RUTA(":canal/publicaciones"), async ({ params, request }) => {
    await delay(250)
    const foro = foroDe(params.canal)
    if (!foro) return error(404, "El foro no existe.")
    const p = permisos(request, foro.id)
    if (!p.puedePublicar) return error(403, "Tu perfil no puede abrir publicaciones en los foros.")
    const body = (await request.json()) as {
      TITULO?: string
      TEXTO?: string
      ETIQUETAS?: number[]
      ADJUNTO_NOMBRE?: string
      ADJUNTO_FORMATO?: string
      CLIENT_MESSAGE_ID?: string
    }
    const previo = body.CLIENT_MESSAGE_ID ? enviadosPorCliente.get(body.CLIENT_MESSAGE_ID) : undefined
    const h0 = previo ? hiloVivo(previo) : undefined
    if (h0) return fila(aPublicacion(h0, USUARIO_ACTUAL.id, true))
    const titulo = body.TITULO?.trim() ?? ""
    if (!titulo) return error(400, "Escribe un titulo para la publicacion.")
    if (titulo.length > 150) return error(400, "El titulo es demasiado largo.")
    const t = textoValido(body.TEXTO, body.ADJUNTO_NOMBRE)
    if (t.error) return error(400, t.error)
    const tags = etiquetasValidas(foro.id, body.ETIQUETAS, p.puedeModerar)
    if (tags.error) return error(tags.status, tags.error)
    const texto = t.texto ?? ""
    const h = crearHilo(foro.id, titulo, texto, USUARIO_ACTUAL, tags.ids ?? [], {
      adjunto: body.ADJUNTO_NOMBRE
        ? { nombre: body.ADJUNTO_NOMBRE, formato: formatoValido(body.ADJUNTO_FORMATO), eliminadoEn: null }
        : null,
      menciones: menciones(texto, foro.id, request),
    })
    if (body.CLIENT_MESSAGE_ID) enviadosPorCliente.set(body.CLIENT_MESSAGE_ID, h.id)
    publicarHilo(h, "publicacion.creada")
    return fila(aPublicacion(h, USUARIO_ACTUAL.id, true))
  }),

  http.post(RUTA(":canal/etiquetas"), async ({ params, request }) => {
    await delay(150)
    const foro = foroDe(params.canal)
    if (!foro) return error(404, "El foro no existe.")
    if (!permisos(request, foro.id).puedeModerar) return error(403, "Solo la moderacion del foro puede hacerlo.")
    const body = (await request.json()) as { NOMBRE?: string; COLOR?: ColorEtiqueta; SOLO_MODERADORES?: "S" | "N" }
    const nombre = body.NOMBRE?.trim() ?? ""
    if (!nombre || nombre.length > 40) return error(400, "Escribe un nombre de etiqueta de hasta 40 caracteres.")
    if ((etiquetasPorForo.get(foro.id) ?? []).some((e) => e.nombre.toLowerCase() === nombre.toLowerCase())) {
      return error(409, `Ya existe la etiqueta ${nombre}.`)
    }
    const e = crearEtiqueta(foro.id, nombre, body.COLOR ?? "BLUE", body.SOLO_MODERADORES === "S")
    publish(`foro:${foro.id}`, "foro.actualizado", { id: foro.id })
    return fila(e)
  }),

  http.patch(RUTA("etiquetas/:id/eliminar"), async ({ params, request }) => {
    await delay(150)
    const id = Number(params.id)
    for (const [foroId, lista] of etiquetasPorForo) {
      const e = lista.find((x) => x.id === id)
      if (!e) continue
      if (!permisos(request, foroId).puedeModerar) return error(403, "Solo la moderacion del foro puede hacerlo.")
      etiquetasPorForo.set(foroId, lista.filter((x) => x.id !== id))
      for (const h of hilos) h.etiquetas = h.etiquetas.filter((x) => x !== id)
      publish(`foro:${foroId}`, "foro.actualizado", { id: foroId })
      return fila(e)
    }
    return error(404, "La etiqueta ya no existe.")
  }),

  http.get(RUTA("publicaciones/:id/respuestas"), async ({ params }) => {
    await delay(200)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    return HttpResponse.json({ rows: respuestasDe(h) })
  }),

  http.post(RUTA("publicaciones/:id/respuestas"), async ({ params, request }) => {
    await delay(200)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    const p = permisos(request, h.foroId)
    if (!p.puedeResponder) return error(403, "Tu perfil no puede responder en los foros.")
    if (h.cerrada && !p.puedeModerar) return error(409, "La publicacion esta cerrada.")
    const body = (await request.json()) as {
      TEXTO?: string
      ADJUNTO_NOMBRE?: string
      ADJUNTO_FORMATO?: string
      FK_MENSAJE_RESPUESTA?: number
      CLIENT_MESSAGE_ID?: string
    }
    const previo = body.CLIENT_MESSAGE_ID ? enviadosPorCliente.get(`r:${body.CLIENT_MESSAGE_ID}`) : undefined
    const m0 = previo ? mensajes.find((m) => m.id === previo) : undefined
    if (m0) return fila(m0)
    const t = textoValido(body.TEXTO, body.ADJUNTO_NOMBRE)
    if (t.error) return error(400, t.error)
    let original: Mensaje | null = null
    if (body.FK_MENSAJE_RESPUESTA) {
      original = mensajes.find((m) => m.id === body.FK_MENSAJE_RESPUESTA) ?? null
      if (!original || hiloDeMensaje(original.id)?.id !== h.id) return error(404, "El mensaje al que respondes ya no existe.")
    }
    const texto = t.texto ?? ""
    const m = responderHilo(h, texto, USUARIO_ACTUAL, original, {
      adjunto: body.ADJUNTO_NOMBRE
        ? { nombre: body.ADJUNTO_NOMBRE, formato: formatoValido(body.ADJUNTO_FORMATO), eliminadoEn: null }
        : null,
      menciones: menciones(texto, h.foroId, request),
    })
    if (body.CLIENT_MESSAGE_ID) enviadosPorCliente.set(`r:${body.CLIENT_MESSAGE_ID}`, m.id)
    publish(`foro:${h.foroId}`, "respuesta.creada", { publicacionId: h.id, mensaje: mensajeNeutro(m) })
    publicarHilo(h, "publicacion.actualizada")
    return fila(m)
  }),

  http.patch(RUTA("respuestas/:id/eliminar"), async ({ params, request }) => {
    await delay(150)
    const id = Number(params.id)
    const hiloId = hiloDeRespuesta.get(id)
    const h = hiloId ? hiloVivo(hiloId) : undefined
    const idx = mensajes.findIndex((m) => m.id === id)
    if (!h || idx === -1) return error(404, "El mensaje ya no existe.")
    const m = mensajes[idx]
    if (!m.esPropio && !permisos(request, h.foroId).puedeModerar) {
      return error(403, "Solo quien respondio o un moderador elimina la respuesta.")
    }
    mensajes.splice(idx, 1)
    hiloDeRespuesta.delete(id)
    if (h.solucionId === id) h.solucionId = null
    for (const x of respuestasDe(h)) {
      if (x.respuestaA?.id === id) {
        x.respuestaA = { ...x.respuestaA, texto: "", eliminado: true }
        publish(`foro:${h.foroId}`, "respuesta.actualizada", { publicacionId: h.id, mensaje: mensajeNeutro(x) })
      }
    }
    publish(`foro:${h.foroId}`, "respuesta.eliminada", { id, publicacionId: h.id })
    publicarHilo(h, "publicacion.actualizada")
    return fila(m)
  }),

  http.patch(RUTA("publicaciones/:id/etiquetas"), async ({ params, request }) => {
    await delay(150)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    const p = permisos(request, h.foroId)
    if (h.autor.id !== USUARIO_ACTUAL.id && !p.puedeModerar) {
      return error(403, "Solo quien publico o un moderador cambia las etiquetas.")
    }
    const body = (await request.json()) as { ETIQUETAS?: number[] }
    const tags = etiquetasValidas(h.foroId, body.ETIQUETAS, p.puedeModerar)
    if (tags.error) return error(tags.status, tags.error)
    h.etiquetas = tags.ids ?? []
    return actualizada(h)
  }),

  http.patch(RUTA("publicaciones/:id/fijar"), async ({ params, request }) => {
    await delay(120)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (!permisos(request, h.foroId).puedeModerar) return error(403, "Solo la moderacion del foro puede hacerlo.")
    h.fijada = ((await request.json()) as { FIJADA?: string }).FIJADA === "S"
    return actualizada(h)
  }),

  http.patch(RUTA("publicaciones/:id/cerrar"), async ({ params, request }) => {
    await delay(120)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (!permisos(request, h.foroId).puedeModerar) return error(403, "Solo la moderacion del foro puede hacerlo.")
    h.cerrada = ((await request.json()) as { CERRADA?: string }).CERRADA === "S"
    return actualizada(h)
  }),

  http.patch(RUTA("publicaciones/:id/resolver"), async ({ params, request }) => {
    await delay(120)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (h.autor.id !== USUARIO_ACTUAL.id && !permisos(request, h.foroId).puedeModerar) {
      return error(403, "Solo quien publico o un moderador marca la publicacion como resuelta.")
    }
    const body = (await request.json()) as { RESUELTA?: string; FK_MENSAJE_SOLUCION?: number }
    const resuelta = body.RESUELTA === "S"
    const solucion = resuelta ? (body.FK_MENSAJE_SOLUCION ?? null) : null
    if (solucion != null && hiloDeRespuesta.get(solucion) !== h.id) {
      return error(400, "La solucion debe ser una respuesta de esta publicacion.")
    }
    h.resuelta = resuelta
    h.solucionId = solucion
    return actualizada(h)
  }),

  http.patch(RUTA("publicaciones/:id/seguir"), async ({ params, request }) => {
    await delay(100)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (((await request.json()) as { SEGUIR?: string }).SEGUIR === "S") h.seguidores.add(USUARIO_ACTUAL.id)
    else h.seguidores.delete(USUARIO_ACTUAL.id)
    return fila(aPublicacion(h, USUARIO_ACTUAL.id, true))
  }),

  http.patch(RUTA("publicaciones/:id/eliminar"), async ({ params, request }) => {
    await delay(150)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (h.autor.id !== USUARIO_ACTUAL.id && !permisos(request, h.foroId).puedeModerar) {
      return error(403, "Solo quien publico o un moderador elimina la publicacion.")
    }
    const antes = aPublicacion(h, USUARIO_ACTUAL.id, true)
    h.eliminada = true
    publish(`foro:${h.foroId}`, "publicacion.eliminada", { id: h.id, foroId: h.foroId })
    return fila(antes)
  }),

  http.get(RUTA("publicaciones/:id"), async ({ params }) => {
    await delay(150)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    return fila(aPublicacion(h, USUARIO_ACTUAL.id, true))
  }),

  http.patch(RUTA("publicaciones/:id"), async ({ params, request }) => {
    await delay(150)
    const h = hiloVivo(params.id)
    if (!h) return error(404, "La publicacion ya no existe.")
    if (h.autor.id !== USUARIO_ACTUAL.id) return error(403, "Solo quien publico puede editar la publicacion.")
    if (h.cerrada && !permisos(request, h.foroId).puedeModerar) return error(409, "La publicacion esta cerrada.")
    const body = (await request.json()) as { TITULO?: string; TEXTO?: string }
    const titulo = body.TITULO?.trim() ?? ""
    if (!titulo) return error(400, "Escribe un titulo para la publicacion.")
    const raiz = raizDe(h)
    const t = textoValido(body.TEXTO, raiz?.adjunto?.nombre)
    if (t.error) return error(400, t.error)
    h.titulo = titulo
    if (raiz) {
      raiz.texto = t.texto ?? ""
      raiz.editado = true
      raiz.menciones = menciones(raiz.texto, h.foroId, request)
    }
    return actualizada(h)
  }),

  // Va después de las rutas estáticas: MSW usa el primer match.
  http.get(RUTA(":canal"), async ({ params, request }) => {
    await delay(150)
    const foro = foroDe(params.canal)
    if (!foro) return error(404, "El foro no existe.")
    const cabecera: Foro = {
      id: foro.id,
      nombre: foro.nombre,
      totalMiembros: foro.totalMiembros,
      etiquetas: etiquetasPorForo.get(foro.id) ?? [],
      ...permisos(request, foro.id),
    }
    return fila(cabecera)
  }),
]

function actualizada(h: HiloMock) {
  publicarHilo(h, "publicacion.actualizada")
  return fila(aPublicacion(h, USUARIO_ACTUAL.id, true))
}

function formatoValido(f: string | undefined): NonNullable<Mensaje["adjunto"]>["formato"] {
  return f === "WORD" || f === "PDF" || f === "IMAGEN" || f === "VIDEO" ? f : "OTRO"
}
