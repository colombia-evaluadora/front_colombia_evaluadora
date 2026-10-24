import { http, HttpResponse, delay } from "msw"

import { usuarioDe } from "@/mocks/handlers/comunicaciones-elecciones"
import { filtrarGrupos } from "@/mocks/handlers/comunicaciones-grupos"

import type {
  AdjuntoMensaje,
  Mensaje,
  CategoriaCanal,
  AjustesChat,
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
  conVistaPrevia,
} from "@/mocks/db/comunicaciones"
import { formatoDeArchivo } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { registrarArchivoMaterial } from "@/mocks/db/planeador"
import { esAcudienteMock } from "@/mocks/db/comunicaciones-seleccion"
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
  topicUsuario,
} from "@/mocks/realtime/chat"
import { publish } from "@/mocks/realtime/server"
import { bogotaAInstante, MARGEN_MINIMO_MS, MAXIMO_MS } from "@/features/comunicaciones/chat/lib/programacion"

// Mock del chat de comunicaciones; el backend aún no existe.
// `*` delante: también matchea con `msw/node` en los tests (URL absoluta).
const URL = (path: string) => `*/api/eval-col/comunicaciones/${path}`

// ── mensajes programados (comms-service: estado PROGRAMADO de tborrador + job de envío) ──

/** `yyyy-MM-ddTHH:mm` (hora de Bogotá) o ISO → instante; NaN si no se entiende. */
function instanteProgramado(valor: unknown) {
  if (typeof valor !== "string") return Number.NaN
  const local = bogotaAInstante(valor)
  return Number.isNaN(local) ? Date.parse(valor) : local
}

function errorProgramado(t: number) {
  const ahora = Date.now()
  if (Number.isNaN(t)) return "La fecha de envío no es válida."
  if (t < ahora + MARGEN_MINIMO_MS) return "La hora de envío debe ser posterior a la actual."
  if (t > ahora + MAXIMO_MS) return "Solo se puede programar hasta un año hacia adelante."
  return null
}

/**
 * Envía los programados cuya hora llegó, cada uno una sola vez: el estado pasa a ENVIADO antes
 * de crear el mensaje (comms-service lo reclama con un UPDATE condicionado en la misma
 * transacción). Avisa en vivo con `borradores.actualizados`, como el backend.
 */
export function enviarProgramadosVencidos(ahora = Date.now()) {
  let enviados = 0
  for (const b of borradores) {
    if (b.estado !== "PROGRAMADO" || !b.programadoPara || Date.parse(b.programadoPara) > ahora) continue
    b.estado = "ENVIADO"
    const m = nuevoMensaje(b.conversacionId, b.texto)
    b.fecha = m.fecha
    publicarMensajeCreado(m)
    enviados++
    publish(topicUsuario(USUARIO_ACTUAL.id), "borradores.actualizados", { id: b.id, conversacionId: b.conversacionId })
  }
  return enviados
}

// "Job" del mock: revisa cada 2 s (el de comms-service, cada 15 s). En consola (y en los E2E),
// `__programadosMock.adelantar(ms)` corre el job como si hubiera pasado ese tiempo.
if (typeof window !== "undefined") {
  setInterval(() => enviarProgramadosVencidos(), 2_000)
  Object.assign(window, {
    __programadosMock: { adelantar: (ms: number) => enviarProgramadosVencidos(Date.now() + ms) },
  })
}

/** `CLIENT_MESSAGE_ID` → id del mensaje creado (reintentos idempotentes). */
const enviadosPorCliente = new Map<string, number>()

// `pk_tmensaje_adjunto` de los archivos enviados con el mock (los de la semilla usan 9000+).
let siguienteAdjuntoMock = 9100
const YA_DESCARGADO = "No puedes eliminar este archivo porque otra persona ya lo descargó."

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

/**
 * comms-service (`ChatService.puedeVerEliminados`): el original de un mensaje borrado solo llega a
 * quien administra el foro o grupo o a un directivo; en un DM a nadie. Los demás reciben el aviso.
 */
function verEliminados(conversacionId: number, request: Request) {
  const conv = buscar(String(conversacionId))
  if (!conv || conv.tipo === "DIRECTO") return false
  return perfilDe(request) === "DIRECTIVO" || !!filtrarGrupos([conv], request)[0]?.esAdmin
}

export function vistaMensaje(m: Mensaje, ver: boolean): Mensaje {
  if (!m.eliminado || ver) return m
  return { ...m, texto: "", adjunto: null, adjuntos: [], fijado: false, reacciones: [], menciones: [], meMenciona: false, respuestaA: null, votacion: undefined }
}

function hastaSilencio(duracion: SilencioDuracion) {
  if (duracion === "NINGUNA") return null
  if (duracion === "SIEMPRE") return "9999-12-31T00:00:00.000Z"
  const d = new Date()
  if (duracion === "1H") d.setHours(d.getHours() + 1)
  else if (duracion === "FIN_DIA") d.setHours(24, 0, 0, 0)
  else if (duracion === "8H") d.setHours(d.getHours() + 8)
  else d.setDate(d.getDate() + 7)
  return d.toISOString()
}

// Ajustes del chat del usuario (en memoria, uno para toda la sesión del mock).
const ajustesChatMock: AjustesChat = { confirmacionLecturaPermitir: true, confirmacionLecturaSolicitar: false, sonido: true }

interface CuerpoMensaje {
  TEXTO?: string
  FK_MENSAJE_RESPUESTA?: number | null
  CLIENT_MESSAGE_ID?: string
  SOLICITA_CONFIRMACION_LECTURA?: "S" | "N"
}

function enviarMensajeMock(
  id: string | readonly string[] | undefined,
  body: CuerpoMensaje,
  request: Request,
  adjuntos: AdjuntoMensaje[] = [],
) {
  const adjunto = adjuntos[0] ?? null
  const conv = buscar(id)
  if (!conv) return noEncontrada()
  // Reintento idempotente: el mismo `CLIENT_MESSAGE_ID` devuelve el mensaje ya creado.
  const repetido = body.CLIENT_MESSAGE_ID ? enviadosPorCliente.get(body.CLIENT_MESSAGE_ID) : undefined
  const previo = repetido != null ? mensajes.find((x) => x.id === repetido) : undefined
  if (previo) return HttpResponse.json({ rows: [previo] })
  const texto = body.TEXTO?.trim() ?? ""
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
  if (adjuntos.length > 0) m.adjuntos = adjuntos
  // Confirmación de lectura (HU 7): en el mock queda Enviado; comms-service la avanza por receptor.
  const confirmar = body.SOLICITA_CONFIRMACION_LECTURA ? body.SOLICITA_CONFIRMACION_LECTURA === "S" : ajustesChatMock.confirmacionLecturaSolicitar
  if (confirmar) m.confirmacion = { estado: "ENVIADO", total: Math.max(conv.totalMiembros - 1, 1), entregados: 0, leidos: 0, lectores: [] }
  if (body.CLIENT_MESSAGE_ID) enviadosPorCliente.set(body.CLIENT_MESSAGE_ID, m.id)
  // Como comms-service: el borrador del canal pasa a "Enviados".
  const borrador = borradores.find((b) => b.conversacionId === conv.id && b.estado === "BORRADOR")
  if (borrador) Object.assign(borrador, { estado: "ENVIADO", texto, fecha: m.fecha })
  publicarMensajeCreado(m, original?.autor.id)
  simularRespuesta(conv, m)
  return HttpResponse.json({ rows: [m] })
}

export const comunicacionesHandlers = [
  http.get(URL("conversaciones"), async ({ request }) => {
    await delay(250)
    // El estudiante solo ve el bot y los canales de elección, encuesta y evaluación a los que lo invitan.
    if (usuarioDe(request)?.roles.includes("CEVAL-ESTUDIANTE")) {
      const rows = conversaciones
        .filter((c) => c.esBot || c.categoria === "VOTACION" || c.categoria === "EXAMEN" || c.categoria === "ENCUESTA")
        .map((c) => conVistaPrevia({ ...c, esCreador: false }))
      return HttpResponse.json({ rows })
    }
    // Los grupos solo para sus miembros, con `esAdmin` de quien pide.
    return HttpResponse.json({ rows: filtrarGrupos(conversaciones, request).map((c) => conVistaPrevia(c)) })
  }),

  // Colevabot (comms-service BotService): asegura su conversación y devuelve su fila. Las tarjetas
  // del mock ya están en `mensajes` (bienvenida y una solicitud de aprobación).
  http.post(URL("bot/sincronizar"), async () => {
    await delay(150)
    const bot = conversaciones.find((c) => c.esBot)
    if (!bot) return HttpResponse.json({ message: "Sin Colevabot" }, { status: 404 })
    return HttpResponse.json({ rows: [conVistaPrevia(bot)] })
  }),

  // Política de DMs y menciones masivas de la institución (pendiente de aprobación).
  http.get(URL("politica"), async () => {
    await delay(150)
    return HttpResponse.json({ rows: [politicaChat] })
  }),

  // El buscador de un grupo también ofrece acudientes: entran por invitación. Un e2e puede tratar
  // a una cuenta como acudiente (`esAcudienteMock`).
  http.get(URL("personas"), async () => {
    await delay(200)
    return HttpResponse.json({
      rows: personas.map((p) => (esAcudienteMock(p.id) ? { ...p, perfil: "ACUDIENTE" as const, cargo: "Acudiente" } : p)),
    })
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
      return HttpResponse.json({ message: "Escribe un nombre." }, { status: 400 })
    }
    if (conversaciones.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      return HttpResponse.json({ message: `Ya existe un foro llamado ${nombre}.` }, { status: 409 })
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
        .map((p) => ({ ...p, rol: "Miembro", perfil: personas.find((x) => x.id === p.id)?.perfil, cargo: personas.find((x) => x.id === p.id)?.cargo, bloqueado: false }))
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
    if (!m) return HttpResponse.json({ message: "La persona ya no está en la conversación." }, { status: 404 })
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
    if (i < 0) return HttpResponse.json({ message: "La persona ya no está en la conversación." }, { status: 404 })
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
      .map((m) => vistaMensaje(m, verEliminados(conv.id, request)))
    return HttpResponse.json({ rows })
  }),

  http.post(URL("conversaciones/:id/mensajes"), async ({ params, request }) => {
    await delay(200)
    return enviarMensajeMock(params.id, (await request.json()) as CuerpoMensaje, request)
  }),

  // Con adjunto el front manda el mismo POST como multipart por file-service,
  // que lo reenvía con `ADJUNTO` = pk_tarchivo. Acá el binario queda como object
  // URL (mismo registro que los materiales del planeador) para que la vista
  // previa y la descarga funcionen con el mock.
  http.post(`*/api/files/eval-col/comunicaciones/conversaciones/:id/mensajes`, async ({ params, request }) => {
    await delay(400)
    const form = await request.formData()
    // Varios archivos: el campo `ADJUNTO` se repite (file-service los reenvía como lista).
    const texto = form.get("TEXTO")
    const respuesta = form.get("FK_MENSAJE_RESPUESTA")
    const clientId = form.get("CLIENT_MESSAGE_ID")
    const confirmacion = form.get("SOLICITA_CONFIRMACION_LECTURA")
    const subidos = form.getAll("ADJUNTO").filter((x): x is File => x instanceof File)
    if (subidos.length > 10) {
      return HttpResponse.json({ message: "Puedes adjuntar hasta 10 archivos por mensaje." }, { status: 400 })
    }
    const adjuntos: AdjuntoMensaje[] = subidos.map((archivo) => ({
      nombre: archivo.name,
      formato: formatoDeArchivo(archivo),
      eliminadoEn: null,
      archivoId: registrarArchivoMaterial(archivo),
      peso: archivo.size,
      id: siguienteAdjuntoMock++,
      descargado: false,
    }))
    const res = enviarMensajeMock(
      params.id,
      {
        TEXTO: typeof texto === "string" ? texto : "",
        FK_MENSAJE_RESPUESTA: typeof respuesta === "string" ? Number(respuesta) : null,
        CLIENT_MESSAGE_ID: typeof clientId === "string" ? clientId : undefined,
        SOLICITA_CONFIRMACION_LECTURA: confirmacion === "S" || confirmacion === "N" ? confirmacion : undefined,
      },
      request,
      adjuntos,
    )
    const conv = buscar(params.id)
    const enviado = adjuntos.length > 0 ? mensajes.find((x) => x.adjuntos?.[0]?.id === adjuntos[0].id) : undefined
    if (res.status === 200 && conv) {
      for (const adjunto of [...adjuntos].reverse()) {
        archivos.unshift({
          id: adjunto.archivoId as number,
          archivoId: adjunto.archivoId,
          nombre: adjunto.nombre,
          formato: adjunto.formato,
          peso: adjunto.peso,
          compartidoPor: "Tú",
          esPropio: true,
          fecha: new Date().toISOString(),
          conversacionId: conv.id,
          conversacionNombre: conv.nombre,
          enMiCanal: true,
          mensajeId: enviado?.id,
          adjuntoId: adjunto.id,
          descargado: false,
        })
      }
    }
    return res
  }),

  http.put(URL("conversaciones/:id/borrador"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const texto = ((await request.json()) as { TEXTO?: string }).TEXTO?.trim() ?? ""
    const idx = borradores.findIndex((b) => b.conversacionId === conv.id && b.estado === "BORRADOR")
    if (!texto) {
      if (idx !== -1) borradores.splice(idx, 1)
      return HttpResponse.json({ rows: [] })
    }
    const fecha = new Date().toISOString()
    if (idx !== -1) {
      Object.assign(borradores[idx], { texto, fecha })
      return HttpResponse.json({ rows: [borradores[idx]] })
    }
    const b = {
      id: Math.max(0, ...borradores.map((x) => x.id)) + 1,
      conversacionId: conv.id,
      conversacionNombre: conv.nombre,
      texto,
      estado: "BORRADOR" as const,
      fecha,
    }
    borradores.push(b)
    return HttpResponse.json({ rows: [b] })
  }),

  http.patch(URL("conversaciones/:id/silenciar"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { DURACION: SilencioDuracion }
    conv.silenciadoHasta = hastaSilencio(body.DURACION)
    conv.silencioDuracion = body.DURACION === "NINGUNA" ? null : body.DURACION
    return HttpResponse.json({ rows: [conv] })
  }),

  // Medios de aviso de la conversación (HU 7).
  http.patch(URL("conversaciones/:id/alertas"), async ({ params, request }) => {
    await delay(150)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { CAMPANA: "S" | "N"; SONIDO: "S" | "N"; CORREO: "S" | "N" }
    conv.alertaCampana = body.CAMPANA === "S"
    conv.alertaSonido = body.SONIDO === "S"
    conv.alertaCorreo = body.CORREO === "S"
    return HttpResponse.json({ rows: [conv] })
  }),

  // Ajustes del chat del usuario (confirmación de lectura y sonido).
  http.get(URL("ajustes"), async () => {
    await delay(100)
    return HttpResponse.json({ rows: [ajustesChatMock] })
  }),

  http.put(URL("ajustes"), async ({ request }) => {
    await delay(150)
    const body = (await request.json()) as Record<string, "S" | "N" | undefined>
    if (body.CONFIRMACION_LECTURA_PERMITIR) ajustesChatMock.confirmacionLecturaPermitir = body.CONFIRMACION_LECTURA_PERMITIR === "S"
    if (body.CONFIRMACION_LECTURA_SOLICITAR) ajustesChatMock.confirmacionLecturaSolicitar = body.CONFIRMACION_LECTURA_SOLICITAR === "S"
    if (body.SONIDO) ajustesChatMock.sonido = body.SONIDO === "S"
    return HttpResponse.json({ rows: [ajustesChatMock] })
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
      return HttpResponse.json({ message: "Escribe un nombre." }, { status: 400 })
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
    if (a.descargado) {
      archivos.splice(idx, 0, a)
      return HttpResponse.json({ message: YA_DESCARGADO }, { status: 409 })
    }
    // El mensaje donde se compartió conserva el aviso.
    for (const m of mensajes) {
      const enLista = m.adjuntos?.find((x) => x.id != null && x.id === a.adjuntoId)
      if (enLista) {
        enLista.eliminadoEn = new Date().toISOString()
        m.adjunto = m.adjuntos?.find((x) => !x.eliminadoEn) ?? m.adjunto
        continue
      }
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

  // Mismo contrato que comms-service: mensajes propios + actividades creadas por el usuario.
  http.get(URL("enviados"), async ({ request }) => {
    await delay(200)
    const tipo = new globalThis.URL(request.url).searchParams.get("tipo")
    const ACTIVIDAD: Partial<Record<CategoriaCanal, "COMUNICADO" | "ENCUESTA" | "ELECCION" | "EVALUACION">> = {
      ANUNCIO: "COMUNICADO",
      ENCUESTA: "ENCUESTA",
      VOTACION: "ELECCION",
      EXAMEN: "EVALUACION",
    }
    const propios = mensajes
      .filter((m) => m.esPropio && !m.sistema && !m.votacion)
      .flatMap((m) => {
        const c = conversaciones.find((x) => x.id === m.conversacionId)
        if (!c) return []
        return [{
          clave: `M${m.id}`,
          tipo: c.tipo === "DIRECTO" ? "DIRECTO" : "CANAL",
          conversacionId: c.id,
          conversacionNombre: c.nombre,
          mensajeId: m.id,
          texto: m.texto || (m.adjunto ? `Adjunto: ${m.adjunto.nombre}` : ""),
          fecha: m.fecha,
        }]
      })
    const actividades = conversaciones
      .filter((c) => c.esCreador && ACTIVIDAD[c.categoria])
      .map((c) => ({
        clave: `A${c.id}`,
        tipo: ACTIVIDAD[c.categoria],
        conversacionId: c.id,
        conversacionNombre: c.nombre,
        mensajeId: null,
        texto: "",
        fecha: mensajes.find((m) => m.conversacionId === c.id)?.fecha ?? new Date().toISOString(),
      }))
    const rows = [...propios, ...actividades]
      .filter((e) => !tipo || e.tipo === tipo)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    return HttpResponse.json({ rows })
  }),

  http.get(URL("borradores"), async () => {
    await delay(250)
    enviarProgramadosVencidos()
    return HttpResponse.json({ rows: borradores })
  }),

  // Programar lo escrito en el editor: el borrador vivo del canal pasa a PROGRAMADO.
  http.post(URL("conversaciones/:id/programados"), async ({ params, request }) => {
    await delay(200)
    const conv = buscar(params.id)
    if (!conv) return noEncontrada()
    const body = (await request.json()) as { TEXTO?: string; PROGRAMADO_PARA?: string }
    const texto = body.TEXTO?.trim() ?? ""
    if (!texto) return HttpResponse.json({ message: "Escribe el mensaje." }, { status: 400 })
    const t = instanteProgramado(body.PROGRAMADO_PARA)
    const error = errorProgramado(t)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    const programadoPara = new Date(t).toISOString()
    const vivo = borradores.find((b) => b.conversacionId === conv.id && b.estado === "BORRADOR")
    if (vivo) {
      Object.assign(vivo, { texto, estado: "PROGRAMADO", fecha: programadoPara, programadoPara })
      return HttpResponse.json({ rows: [vivo] })
    }
    const b = {
      id: Math.max(0, ...borradores.map((x) => x.id)) + 1,
      conversacionId: conv.id,
      conversacionNombre: conv.nombre,
      texto,
      estado: "PROGRAMADO" as const,
      fecha: programadoPara,
      programadoPara,
    }
    borradores.push(b)
    return HttpResponse.json({ rows: [b] })
  }),

  http.patch(URL("borradores/:id/programar"), async ({ params, request }) => {
    await delay(200)
    const b = borradores.find((x) => x.id === Number(params.id))
    if (!b) return HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })
    if (b.estado === "ENVIADO") return HttpResponse.json({ message: "Ese mensaje ya se envió." }, { status: 409 })
    const body = (await request.json()) as { TEXTO?: string; PROGRAMADO_PARA?: string }
    const texto = body.TEXTO === undefined ? b.texto : body.TEXTO.trim()
    if (!texto) return HttpResponse.json({ message: "Escribe el mensaje." }, { status: 400 })
    const t = instanteProgramado(body.PROGRAMADO_PARA)
    const error = errorProgramado(t)
    if (error) return HttpResponse.json({ message: error }, { status: 400 })
    const programadoPara = new Date(t).toISOString()
    Object.assign(b, { texto, estado: "PROGRAMADO", fecha: programadoPara, programadoPara })
    return HttpResponse.json({ rows: [b] })
  }),

  // Cancelar el envío: vuelve a Borradores (uno vivo por canal, como el índice único de V575).
  http.patch(URL("borradores/:id/cancelar"), async ({ params }) => {
    await delay(150)
    const b = borradores.find((x) => x.id === Number(params.id))
    if (!b) return HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })
    if (b.estado !== "PROGRAMADO") {
      return HttpResponse.json({ message: "Ese mensaje ya no está programado." }, { status: 409 })
    }
    if (borradores.some((x) => x.conversacionId === b.conversacionId && x.estado === "BORRADOR")) {
      return HttpResponse.json(
        { message: `Ya tienes un borrador en #${b.conversacionNombre}: envíalo o elimínalo antes de cancelar.` },
        { status: 409 },
      )
    }
    Object.assign(b, { estado: "BORRADOR", fecha: new Date().toISOString(), programadoPara: null })
    return HttpResponse.json({ rows: [b] })
  }),

  http.patch(URL("borradores/:id/enviar"), async ({ params }) => {
    await delay(200)
    const b = borradores.find((x) => x.id === Number(params.id))
    if (!b) return HttpResponse.json({ message: "El borrador no existe." }, { status: 404 })
    if (b.estado === "ENVIADO") return HttpResponse.json({ message: "Ese mensaje ya se envió." }, { status: 409 })
    b.estado = "ENVIADO"
    const m = nuevoMensaje(b.conversacionId, b.texto)
    b.fecha = m.fecha
    publicarMensajeCreado(m)
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
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
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
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
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
    m.editadoEn = new Date().toISOString()
    return HttpResponse.json({ rows: [m] })
  }),

  http.post(URL("mensajes/:id/reacciones"), async ({ params, request }) => {
    await delay(100)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
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
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
    if (!m) return mensajeNoEncontrado()
    const body = (await request.json()) as { FIJADO: "S" | "N" }
    m.fijado = body.FIJADO === "S"
    publicarMensajeActualizado(m)
    return HttpResponse.json({ rows: [m] })
  }),

  http.patch(URL("mensajes/:id/adjunto/eliminar"), async ({ params }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
    if (!m?.adjunto) return mensajeNoEncontrado()
    if (m.adjuntos?.some((a) => !a.eliminadoEn && a.descargado)) {
      return HttpResponse.json({ message: YA_DESCARGADO }, { status: 409 })
    }
    const ahora = new Date().toISOString()
    m.adjunto.eliminadoEn = ahora
    for (const a of m.adjuntos ?? []) a.eliminadoEn ??= ahora
    return HttpResponse.json({ rows: [m] })
  }),

  // Como comms-service (V560): quitar un archivo puntual, salvo que otra persona ya lo descargó.
  http.patch(URL("mensajes/:id/adjuntos/:adjunto/eliminar"), async ({ params }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
    const a = m?.adjuntos?.find((x) => x.id === Number(params.adjunto) && !x.eliminadoEn)
    if (!m || !a) return HttpResponse.json({ message: "El archivo ya no existe." }, { status: 404 })
    if (!m.esPropio) {
      return HttpResponse.json({ message: "Solo puedes quitar archivos de tus mensajes." }, { status: 403 })
    }
    if (a.descargado) return HttpResponse.json({ message: YA_DESCARGADO }, { status: 409 })
    a.eliminadoEn = new Date().toISOString()
    m.adjunto = m.adjuntos?.find((x) => !x.eliminadoEn) ?? a
    const i = archivos.findIndex((x) => x.adjuntoId === a.id)
    if (i !== -1) archivos.splice(i, 1)
    publicarMensajeActualizado(m)
    return HttpResponse.json({ rows: [m] })
  }),

  // Registro de descarga: la del autor no cuenta.
  http.post(URL("mensajes/:id/adjuntos/:adjunto/descargas"), async ({ params }) => {
    await delay(100)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
    const a = m?.adjuntos?.find((x) => x.id === Number(params.adjunto) && !x.eliminadoEn)
    if (!m || !a) return HttpResponse.json({ message: "El archivo ya no existe." }, { status: 404 })
    if (!m.esPropio && !a.descargado) {
      a.descargado = true
      publicarMensajeActualizado(m)
    }
    return HttpResponse.json({ rows: [m] })
  }),

  // Borrado lógico, como comms-service: el mensaje queda como aviso "Este mensaje fue eliminado".
  http.patch(URL("mensajes/:id/eliminar"), async ({ params, request }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
    if (!m) return mensajeNoEncontrado()
    if (!m.esPropio) {
      return HttpResponse.json({ message: "Solo puedes eliminar tus mensajes." }, { status: 403 })
    }
    m.eliminado = true
    m.eliminadoEn = new Date().toISOString()
    // Las respuestas que lo citaban muestran "Mensaje eliminado".
    for (const x of mensajes) {
      if (x.respuestaA?.id === m.id) {
        x.respuestaA = { ...x.respuestaA, texto: "", eliminado: true }
        publicarMensajeActualizado(x)
      }
    }
    publicarMensajeEliminado(m)
    return HttpResponse.json({ rows: [vistaMensaje(m, verEliminados(m.conversacionId, request))] })
  }),

  http.patch(URL("mensajes/:id"), async ({ params, request }) => {
    await delay(150)
    const m = mensajes.find((x) => x.id === Number(params.id) && !x.eliminado)
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
    m.editadoEn = new Date().toISOString()
    // Editar no vuelve a notificar (como Discord): solo se recalculan las menciones.
    m.menciones = mencionesDe(m.texto, m.conversacionId, request)
    publicarMensajeActualizado(m)
    return HttpResponse.json({ rows: [m] })
  }),
]

function mensajeNoEncontrado() {
  return HttpResponse.json({ message: "El mensaje ya no existe." }, { status: 404 })
}
