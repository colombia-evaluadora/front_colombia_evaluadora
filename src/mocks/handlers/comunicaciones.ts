import { http, HttpResponse, delay } from "msw"

import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"

import type {
  AdjuntoMensaje,
  CategoriaCanal,
  SilencioDuracion,
  TipoVotacionRapida,
} from "@/features/comunicaciones/chat/api/types"
import {
  archivos,
  borradores,
  conversaciones,
  mensajes,
  nuevoMensaje,
  personas,
  avisoUnion,
  miembrosDe,
  nuevaVotacionRapida,
  contenidoDocumentos,
  politicaChat,
  USUARIO_ACTUAL,
} from "@/mocks/db/comunicaciones"
import {
  extraerMenciones,
} from "@/features/comunicaciones/chat/lib/menciones"
import {
  perfilDeRoles,
  puedeMencionarMasivo,
  reglaDirecto,
} from "@/features/comunicaciones/chat/lib/politica-chat"
import {
  citaDe,
  participantes,
  publicarConversacion,
  publicarMensajeActualizado,
  publicarMensajeCreado,
  publicarMensajeEliminado,
  simularRespuesta,
} from "@/mocks/realtime/chat"

// Mock del chat de comunicaciones; el backend aún no existe.
// `*` delante: también matchea con `msw/node` en los tests (URL absoluta).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`

/** `CLIENT_MESSAGE_ID` → id del mensaje creado (reintentos idempotentes). */
const enviadosPorCliente = new Map<string, number>()

function buscar(id: string | readonly string[] | undefined) {
  return conversaciones.find((c) => c.id === Number(id))
}

function noEncontrada() {
  return HttpResponse.json({ message: "La conversación no existe." }, { status: 404 })
}

/** Perfil del usuario de la request; sin token se asume docente (prototipo). */
function perfilDe(request: Request) {
  return perfilDeRoles(usuarioDe(request)?.roles ?? [])
}

/** El servidor decide qué menciones valen: `@canal`/`@todos` solo con permiso. */
function mencionesDe(texto: string, conversacionId: number, request: Request) {
  const conv = buscar(String(conversacionId))
  const miembros = conv ? participantes(conv) : []
  return extraerMenciones(texto, miembros, puedeMencionarMasivo(politicaChat, perfilDe(request)))
}

function hastaSilencio(duracion: SilencioDuracion) {
  if (duracion === "SIEMPRE") return "9999-12-31T00:00:00.000Z"
  const d = new Date()
  if (duracion === "8H") d.setHours(d.getHours() + 8)
  else d.setDate(d.getDate() + 7)
  return d.toISOString()
}

export const comunicacionesHandlers = [
  http.get(URL("conversaciones"), async ({ request }) => {
    await delay(250)
    // El estudiante solo ve el bot y los canales de elección, encuesta y evaluación a los que lo invitan.
    if (usuarioDe(request)?.roles.includes("CEVAL-ESTUDIANTE")) {
      const rows = conversaciones
        .filter((c) => c.esBot || c.categoria === "VOTACION" || c.categoria === "EXAMEN" || c.categoria === "ENCUESTA")
        .map((c) => ({ ...c, esCreador: false }))
      return HttpResponse.json({ rows })
    }
    return HttpResponse.json({ rows: conversaciones })
  }),

  // Política de DMs y menciones masivas de la institución (pendiente de aprobación).
  http.get(URL("politica"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: [politicaChat] })
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

  http.post(URL("conversaciones/:id/votaciones-rapidas"), async ({ params, request }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { PREGUNTA?: string; TIPO: TipoVotacionRapida; MINUTOS: number }
    const pregunta = body.PREGUNTA?.trim()
    if (!pregunta) return HttpResponse.json({ message: "Escribe la pregunta." }, { status: 400 })
    return HttpResponse.json({ rows: [nuevaVotacionRapida(conv.id, pregunta, body.TIPO, body.MINUTOS)] })
  }),

  http.get(URL("conversaciones/:id/miembros"), async ({ params }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    // En un DM los "miembros" son la otra persona (autocompletado de menciones).
    if (conv.tipo === "DIRECTO") {
      const rows = participantes(conv)
        .filter((p) => p.id !== USUARIO_ACTUAL.id)
        .map((p) => ({ ...p, rol: "Docente", bloqueado: false }))
      return HttpResponse.json({ rows })
    }
    return HttpResponse.json({ rows: miembrosDe(conv.id) })
  }),

  http.post(URL("conversaciones/:id/miembros"), async ({ params, request }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { MIEMBROS?: number[] }
    const lista = miembrosDe(conv.id)
    const nuevos = personas.filter((p) => body.MIEMBROS?.includes(p.id) && !lista.some((m) => m.id === p.id))
    for (const p of nuevos) {
      lista.push({ id: p.id, nombre: p.nombre, rol: "Docente", enLinea: false, bloqueado: false })
      avisoUnion(conv.id, p, conv.nombre)
    }
    conv.totalMiembros += nuevos.length
    return HttpResponse.json({ rows: lista })
  }),

  http.patch(URL("conversaciones/:id/miembros/:miembro/bloquear"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    const m = conv && miembrosDe(conv.id).find((x) => x.id === Number(params.miembro))
    if (!m) return HttpResponse.json({ message: "La persona ya no está en el canal." }, { status: 404 })
    const body = (await request.json()) as { BLOQUEADO: boolean }
    m.bloqueado = body.BLOQUEADO
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("conversaciones/:id/miembros/:miembro/eliminar"), async ({ params }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const lista = miembrosDe(conv.id)
    const i = lista.findIndex((x) => x.id === Number(params.miembro))
    if (i < 0) return HttpResponse.json({ message: "La persona ya no está en el canal." }, { status: 404 })
    const [m] = lista.splice(i, 1)
    conv.totalMiembros = Math.max(1, conv.totalMiembros - 1)
    return HttpResponse.json({ rows: [m] })
  }),

  http.post(URL("directos"), async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as { FK_PERSONA?: number }
    const p = personas.find((x) => x.id === body.FK_PERSONA)
    if (!p) return HttpResponse.json({ message: "La persona no existe." }, { status: 404 })
    // La UI ya oculta a quien no se puede escribir; el backend igual lo rechaza.
    if (reglaDirecto(politicaChat, perfilDe(request), p.perfil ?? "DOCENTE") === "PROHIBIDO") {
      return HttpResponse.json(
        { message: "La política de la institución no permite este mensaje directo." },
        { status: 403 },
      )
    }
    const existente = conversaciones.find((c) => c.tipo === "DIRECTO" && c.nombre === p.nombre)
    if (existente) return HttpResponse.json({ rows: [existente] })
    const directo = {
      id: Math.max(0, ...conversaciones.map((c) => c.id)) + 1,
      nombre: p.nombre,
      tipo: "DIRECTO" as const,
      categoria: "GENERAL" as const,
      noLeidos: 0,
      actividadAbierta: false,
      esBot: false,
      totalMiembros: 2,
      miembrosDestacados: [p.nombre],
      silenciadoHasta: null,
      archivada: false,
    }
    conversaciones.push(directo)
    return HttpResponse.json({ rows: [directo] })
  }),

  // Igual que comms-service: sin parámetros, los últimos 200 en orden
  // ascendente; `?antes=<id>&limite=<n>` (máx. 500) trae el tramo anterior.
  http.get(URL("conversaciones/:id/mensajes"), async ({ params, request }) => {
    await delay(300)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const url = new globalThis.URL(request.url)
    const antes = Number(url.searchParams.get("antes")) || null
    const limite = Math.min(Number(url.searchParams.get("limite")) || 200, 500)
    const rows = mensajes
      .filter((m) => m.conversacionId === conv.id && (antes == null || m.id < antes))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-limite)
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
      FK_MENSAJE_RESPUESTA?: number | null
      CLIENT_MESSAGE_ID?: string
    }
    // Reintento idempotente: el mismo `CLIENT_MESSAGE_ID` devuelve el mensaje ya creado.
    const repetido = body.CLIENT_MESSAGE_ID ? enviadosPorCliente.get(body.CLIENT_MESSAGE_ID) : undefined
    const previo = repetido != null ? mensajes.find((x) => x.id === repetido) : undefined
    if (previo) return HttpResponse.json({ rows: [previo] })
    const texto = body.TEXTO?.trim() ?? ""
    const adjunto = body.ADJUNTO_NOMBRE
      ? { nombre: body.ADJUNTO_NOMBRE, formato: body.ADJUNTO_FORMATO ?? "OTRO", eliminadoEn: null }
      : null
    if (!texto && !adjunto) {
      return HttpResponse.json({ message: "Escribe un mensaje o adjunta un archivo." }, { status: 400 })
    }
    const original = body.FK_MENSAJE_RESPUESTA
      ? mensajes.find((m) => m.id === body.FK_MENSAJE_RESPUESTA && m.conversacionId === conv.id)
      : undefined
    if (body.FK_MENSAJE_RESPUESTA && !original) {
      return HttpResponse.json({ message: "El mensaje al que respondes ya no existe." }, { status: 404 })
    }
    const m = nuevoMensaje(conv.id, texto, adjunto, {
      respuestaA: original ? citaDe(original) : null,
      menciones: mencionesDe(texto, conv.id, request),
    })
    if (body.CLIENT_MESSAGE_ID) enviadosPorCliente.set(body.CLIENT_MESSAGE_ID, m.id)
    publicarMensajeCreado(m, original?.autor.id)
    simularRespuesta(conv, m)
    return HttpResponse.json({ rows: [m] })
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
    conv.menciones = 0
    // Las demás sesiones del usuario también lo ven leído.
    publicarConversacion(conv)
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
  http.post(URL("mensajes/:id/votacion/votar"), async ({ params, request }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id))
    const v = m?.votacion
    if (!v) return mensajeNoEncontrado()
    if (new Date(v.cierraEn) <= new Date()) {
      return HttpResponse.json({ message: "La votación ya se cerró." }, { status: 409 })
    }
    if (v.miVoto != null) return HttpResponse.json({ message: "Ya votaste." }, { status: 409 })
    const body = (await request.json()) as { FK_OPCION: number }
    const opcion = v.opciones.find((o) => o.id === body.FK_OPCION)
    if (!opcion) return HttpResponse.json({ message: "Elige una opción." }, { status: 400 })
    opcion.votos += 1
    v.miVoto = opcion.id
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id/votacion"), async ({ params, request }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id))
    const v = m?.votacion
    if (!v) return mensajeNoEncontrado()
    if (new Date(v.cierraEn) <= new Date()) {
      return HttpResponse.json({ message: "La votación ya se cerró." }, { status: 409 })
    }
    const body = (await request.json()) as { PREGUNTA?: string; TIPO: TipoVotacionRapida; MINUTOS: number }
    const pregunta = body.PREGUNTA?.trim()
    if (!pregunta) return HttpResponse.json({ message: "Escribe la pregunta." }, { status: 400 })
    // Cambiar la pregunta o las opciones reinicia los votos y el tiempo.
    const nueva = nuevaVotacionRapida(m.conversacionId, pregunta, body.TIPO, body.MINUTOS)
    mensajes.pop()
    m.votacion = nueva.votacion
    m.editado = true
    return HttpResponse.json({ rows: [m] })
  }),

  http.post(URL("mensajes/:id/reacciones"), async ({ params, request }) => {
    await delay(100)
    const m = mensajes.find((x) => x.id === Number(params.id))
    if (!m) return mensajeNoEncontrado()
    const body = (await request.json()) as { EMOJI?: string }
    const emoji = body.EMOJI?.trim()
    if (!emoji) return HttpResponse.json({ message: "Elige un emoji." }, { status: 400 })
    // Alterna la reacción del usuario; el emoji desaparece al quedar en cero.
    const lista = m.reacciones ?? []
    const r = lista.find((x) => x.emoji === emoji)
    // `usuarios` (ids) como en comms-service: el cliente calcula `mia` con él.
    if (!r) lista.push({ emoji, total: 1, mia: true, personas: ["Tú"], usuarios: [USUARIO_ACTUAL.id] })
    else {
      r.total += r.mia ? -1 : 1
      r.personas = r.mia ? (r.personas ?? []).filter((p) => p !== "Tú") : [...(r.personas ?? []), "Tú"]
      const otros = (r.usuarios ?? []).filter((u) => u !== USUARIO_ACTUAL.id)
      r.usuarios = r.mia ? otros : [...otros, USUARIO_ACTUAL.id]
      r.mia = !r.mia
    }
    m.reacciones = lista.filter((x) => x.total > 0)
    publicarMensajeActualizado(m)
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id/fijar"), async ({ params, request }) => {
    await delay(120)
    const m = mensajes.find((x) => x.id === Number(params.id))
    if (!m) return mensajeNoEncontrado()
    const body = (await request.json()) as { FIJADO: "S" | "N" }
    m.fijado = body.FIJADO === "S"
    publicarMensajeActualizado(m)
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
    if (!mensajes[idx].esPropio) {
      return HttpResponse.json({ message: "Solo puedes eliminar tus mensajes." }, { status: 403 })
    }
    const [m] = mensajes.splice(idx, 1)
    // Las respuestas que lo citaban muestran "Mensaje eliminado".
    for (const x of mensajes) {
      if (x.respuestaA?.id === m.id) {
        x.respuestaA = { ...x.respuestaA, texto: "", eliminado: true }
        publicarMensajeActualizado(x)
      }
    }
    publicarMensajeEliminado(m)
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
    if (!m.esPropio) {
      return HttpResponse.json({ message: "Solo puedes editar tus mensajes." }, { status: 403 })
    }
    m.texto = texto ?? ""
    m.editado = true
    // Editar no vuelve a notificar (como Discord): solo se recalculan las menciones.
    m.menciones = mencionesDe(m.texto, m.conversacionId, request)
    publicarMensajeActualizado(m)
    return HttpResponse.json({ rows: [m] })
  }),
]

function mensajeNoEncontrado() {
  return HttpResponse.json({ message: "El mensaje ya no existe." }, { status: 404 })
}
